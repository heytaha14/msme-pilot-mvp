import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import { getStockStatus } from '../utils/formatters.js';
import {
  calculateInvoiceGstAmount,
  calculateInvoiceSubtotal,
  calculateInvoiceTotalAmount,
  generateNextPurchaseInvoiceNumber,
  normalizeInvoiceItem,
} from '../utils/invoiceCalculations.js';
import { parseInvoiceText } from '../utils/invoiceTextParser.js';
import { createInventoryMovement } from './inventoryMovementService.js';
import { deleteInvoiceFile } from './invoiceStorageService.js';
import {
  createSupplier,
  listSuppliers,
  updateSupplier,
} from './supplierService.js';

const invoiceStatuses = [
  'Uploaded',
  'Pending Review',
  'Processing',
  'Approved',
  'Failed OCR',
  'Rejected',
];

const allowedInvoiceFields = [
  'invoiceNumber',
  'supplierId',
  'supplierName',
  'supplierPhone',
  'invoiceDate',
  'subtotal',
  'gstAmount',
  'totalAmount',
  'status',
  'inventoryUpdated',
  'extractedText',
  'aiExtractedJson',
  'fileId',
  'fileName',
  'fileType',
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateTime(value) {
  if (!value) return new Date().toISOString();
  if (String(value).includes('T')) return value;
  return `${value}T00:00:00.000Z`;
}

function toInputDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function safeJsonParse(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRecoveredInvoiceItem(item = {}) {
  const productName =
    item.productName ||
    item.name ||
    item.itemName ||
    item.description ||
    item.itemDescription ||
    '';
  const quantity = item.quantity ?? item.qty ?? item.stockQuantity ?? '';
  const unit = item.unit || item.uom || '';
  const amount = item.amount ?? item.lineTotal ?? item.total ?? item.value ?? 0;
  const gstPercentage = item.gstPercentage ?? item.gst ?? item.taxRate ?? 0;

  return normalizeInvoiceItem({
    productId: item.productId || '',
    productName,
    quantity,
    unit,
    amount,
    gstPercentage,
    inventoryAction: item.inventoryAction || '',
  });
}

function extractItemsFromInvoiceMetadata(invoice = {}) {
  const metadata = safeJsonParse(invoice.aiExtractedJson, {});
  const candidates = [
    metadata?.parsedData?.items,
    metadata?.parsed?.items,
    metadata?.aiResult?.items,
    metadata?.invoice?.items,
    metadata?.items,
  ].find((items) => Array.isArray(items) && items.length);

  if (!candidates) return [];

  return candidates
    .map(normalizeRecoveredInvoiceItem)
    .filter((item) => item.productName && Number(item.quantity || 0) > 0);
}

function extractItemsFromOcrText(invoice = {}) {
  if (!invoice.extractedText) return [];

  const parsed = parseInvoiceText(invoice.extractedText);
  return (parsed.items || [])
    .map(normalizeRecoveredInvoiceItem)
    .filter((item) => item.productName && Number(item.quantity || 0) > 0);
}

function assertInvoiceOwner(invoice, userId) {
  return assertOwnsDocument(invoice, userId, 'Invoice');
}

function assertInvoiceItemOwner(item, userId) {
  return assertOwnsDocument(item, userId, 'Invoice item');
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function mergeProductsSupplied(existing = [], additions = []) {
  const values = Array.isArray(existing)
    ? existing
    : String(existing || '').split(',');

  return [...new Set([...values, ...additions].map((item) => item.trim()).filter(Boolean))];
}

function getUnitCost(item) {
  const quantity = Number(item.quantity || 0);
  const amount = Number(item.amount || 0);
  if (quantity <= 0 || amount <= 0) return 0;
  return Math.round((amount / quantity) * 100) / 100;
}

async function listProductsForInvoice(userId) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.PRODUCTS,
    [Query.equal('userId', userId), Query.limit(500)],
  );

  return response.documents;
}

function findMatchingProduct(products, item) {
  if (item.productId) {
    const byId = products.find((product) => product.$id === item.productId || product.id === item.productId);
    if (byId) return byId;
  }

  const itemName = normalizeName(item.productName);
  return products.find((product) => {
    const productName = normalizeName(product.name || product.productName);
    return productName && itemName && (productName === itemName || productName.includes(itemName) || itemName.includes(productName));
  });
}

function scoreProductMatch(product, item) {
  const productName = normalizeName(product.name || product.productName);
  const itemName = normalizeName(item.productName);
  if (!productName || !itemName) return 0;
  if (productName === itemName) return 100;
  if (productName.includes(itemName) || itemName.includes(productName)) return 82;

  const productTokens = new Set(productName.split(' ').filter((token) => token.length > 2));
  const itemTokens = itemName.split(' ').filter((token) => token.length > 2);
  if (!productTokens.size || !itemTokens.length) return 0;

  const matches = itemTokens.filter((token) => productTokens.has(token)).length;
  return Math.round((matches / Math.max(itemTokens.length, productTokens.size)) * 70);
}

function findCandidateProducts(products, item) {
  const itemProductId = item.productId || item.matchedProductId || '';
  return products
    .map((product) => ({
      product,
      score: itemProductId && (product.$id === itemProductId || product.id === itemProductId)
        ? 100
        : scoreProductMatch(product, item),
    }))
    .filter(({ score }) => score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ product, score }) => ({
      id: product.$id || product.id,
      name: product.name || product.productName,
      category: product.category || 'Uncategorized',
      supplierName: product.supplierName || product.supplier || '',
      stock: Number(product.stock ?? product.currentStock ?? 0),
      minStock: Number(product.minStock ?? product.minimumStock ?? 0),
      purchasePrice: Number(product.purchasePrice || 0),
      sellingPrice: Number(product.sellingPrice || 0),
      gstPercentage: Number(product.gstPercentage || 0),
      unit: product.unit || '',
      score,
    }));
}

function buildInvoiceItemKey(item, index) {
  return String(item.id || item.$id || `${normalizeName(item.productName)}-${index}`);
}

function buildProductDraft(invoice, item) {
  const unitCost = getUnitCost(item);
  const quantity = Number(item.quantity || 0);

  return {
    name: item.productName || '',
    category: 'Invoice Import',
    barcode: '',
    supplierId: invoice.supplierId || '',
    supplierName: invoice.supplierName || '',
    purchasePrice: unitCost,
    sellingPrice: unitCost > 0 ? Math.round(unitCost * 1.15 * 100) / 100 : 0,
    gstPercentage: Number(item.gstPercentage || 0),
    stock: quantity,
    minStock: 0,
    unit: item.unit || '',
    imageFileId: '',
    notes: `Created from purchase invoice ${invoice.invoiceNumber || invoice.$id}.`,
  };
}

async function createProductFromInvoiceItem(userId, invoice, item, productOverride = {}) {
  const quantity = Number(item.quantity || 0);
  const unitCost = getUnitCost(item);
  const now = new Date().toISOString();
  const draft = {
    ...buildProductDraft(invoice, item),
    ...productOverride,
  };
  const name = String(draft.name || item.productName || '').trim();
  const stock = toNumber(draft.stock ?? draft.currentStock ?? quantity);
  const minStock = toNumber(draft.minStock ?? draft.minimumStock ?? 0);
  const purchasePrice = toNumber(draft.purchasePrice || unitCost);
  const sellingPrice = toNumber(draft.sellingPrice || purchasePrice);

  if (!name || stock < 0) return null;
  if (purchasePrice < 0 || sellingPrice < 0 || minStock < 0) {
    throw new Error(`Complete buying price, selling price, current stock, and minimum stock for ${name}.`);
  }

  const createdProduct = await databases.createDocument(
    DATABASE_ID,
    COLLECTION_IDS.PRODUCTS,
    ID.unique(),
    {
      userId,
      name,
      category: draft.category || 'Invoice Import',
      barcode: draft.barcode || '',
      supplierId: draft.supplierId || invoice.supplierId || '',
      supplierName: draft.supplierName || invoice.supplierName || '',
      purchasePrice,
      sellingPrice,
      gstPercentage: Number(item.gstPercentage || 0),
      stock,
      minStock,
      unit: draft.unit || item.unit || '',
      imageFileId: draft.imageFileId || '',
      status: getStockStatus({ stock, minStock }),
      notes: draft.notes || `Created from purchase invoice ${invoice.invoiceNumber || invoice.$id}.`,
      createdAt: now,
      updatedAt: now,
    },
    userDocumentPermissions(userId),
  );

  await createInventoryMovement(userId, {
    productId: createdProduct.$id,
    productName: createdProduct.name,
    movementType: 'invoice_scan',
    quantity: stock,
    previousStock: 0,
    newStock: stock,
    referenceType: 'purchase_invoice',
    referenceId: invoice.$id || invoice.id,
    note: `Stock created from invoice ${invoice.invoiceNumber || invoice.$id}.`,
  });

  return createdProduct;
}

async function increaseProductStockFromInvoice(userId, invoice, product, item) {
  const quantity = Number(item.quantity || 0);
  if (!product || quantity <= 0) return null;

  const previousStock = Number(product.stock ?? product.currentStock ?? 0);
  const newStock = previousStock + quantity;
  const unitCost = getUnitCost(item);
  const updateDocument = {
    stock: newStock,
    status: getStockStatus({ stock: newStock, minStock: product.minStock ?? product.minimumStock ?? 0 }),
    supplierId: invoice.supplierId || product.supplierId || '',
    supplierName: invoice.supplierName || product.supplierName || '',
    gstPercentage: Number(item.gstPercentage ?? product.gstPercentage ?? 0),
    updatedAt: new Date().toISOString(),
  };

  if (unitCost > 0) {
    updateDocument.purchasePrice = unitCost;
    if (!Number(product.sellingPrice || 0)) {
      updateDocument.sellingPrice = unitCost;
    }
  }

  const updatedProduct = await databases.updateDocument(
    DATABASE_ID,
    COLLECTION_IDS.PRODUCTS,
    product.$id,
    updateDocument,
  );

  await createInventoryMovement(userId, {
    productId: product.$id,
    productName: product.name || item.productName,
    movementType: 'invoice_scan',
    quantity,
    previousStock,
    newStock,
    referenceType: 'purchase_invoice',
    referenceId: invoice.$id || invoice.id,
    note: `Stock increased from invoice ${invoice.invoiceNumber || invoice.$id}.`,
  });

  return updatedProduct;
}

async function applyInvoiceToInventory(userId, invoice, items, decisions = {}) {
  if (!items.length) {
    throw new Error('Add at least one invoice item before approving inventory update.');
  }

  const products = await listProductsForInvoice(userId);
  let createdCount = 0;
  let updatedCount = 0;

  for (const [index, item] of items.entries()) {
    const quantity = Number(item.quantity || 0);
    if (!item.productName || quantity <= 0) continue;

    const itemKey = buildInvoiceItemKey(item, index);
    const decision = decisions[itemKey] || decisions[item.id] || decisions[item.productName] || null;
    const match = decision?.action === 'match' && decision.productId
      ? products.find((product) => product.$id === decision.productId || product.id === decision.productId)
      : findMatchingProduct(products, item);

    if (match) {
      const updatedProduct = await increaseProductStockFromInvoice(userId, invoice, match, item);
      const index = products.findIndex((product) => product.$id === match.$id);
      if (index >= 0 && updatedProduct) products[index] = updatedProduct;
      updatedCount += 1;
    } else {
      const createdProduct = await createProductFromInvoiceItem(
        userId,
        invoice,
        item,
        decision?.action === 'create' ? decision.productData : {},
      );
      if (createdProduct) {
        products.push(createdProduct);
        createdCount += 1;
      }
    }
  }

  if (!createdCount && !updatedCount) {
    throw new Error('No valid invoice items were found for inventory update.');
  }

  return { createdCount, updatedCount };
}

export async function getPurchaseInvoiceInventoryReview(userId, invoiceId) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);

    const existingItems = await listInvoiceItems(userId, invoiceId);
    const items = await recoverInvoiceItemsForApproval(userId, invoice, existingItems);
    const products = await listProductsForInvoice(userId);
    const normalizedInvoice = toPurchaseInvoiceRecord(invoice, items);

    return {
      invoice: normalizedInvoice,
      items: items.map((item, index) => {
        const matches = findCandidateProducts(products, item);
        return {
          ...item,
          itemKey: buildInvoiceItemKey(item, index),
          matches,
          recommendedAction: matches.length ? 'match' : 'create',
          productDraft: buildProductDraft(invoice, item),
        };
      }),
    };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not prepare inventory review.');
  }
}

async function applyInvoiceToSupplier(userId, invoice, items) {
  const supplierName = String(invoice.supplierName || '').trim();
  if (!supplierName || supplierName === 'Unknown Supplier') {
    return null;
  }

  const suppliers = await listSuppliers(userId, { limit: 500 });
  const supplierPhoneDigits = String(invoice.supplierPhone || '').replace(/\D/g, '');
  const supplierNameKey = normalizeName(supplierName);
  const existingSupplier = suppliers.find((supplier) => {
    const existingPhoneDigits = String(supplier.phone || '').replace(/\D/g, '');
    const existingNameKey = normalizeName(supplier.name);
    return (
      (supplierPhoneDigits && existingPhoneDigits.endsWith(supplierPhoneDigits.slice(-10))) ||
      existingNameKey === supplierNameKey ||
      existingNameKey.includes(supplierNameKey) ||
      supplierNameKey.includes(existingNameKey)
    );
  });
  const itemNames = items.map((item) => item.productName).filter(Boolean);
  const invoiceTotal = Number(invoice.totalAmount || 0);

  if (existingSupplier) {
    return updateSupplier(userId, existingSupplier.id, {
      ...existingSupplier,
      productsSupplied: mergeProductsSupplied(existingSupplier.productsSupplied, itemNames),
      totalPurchase: Number(existingSupplier.totalPurchase || 0) + invoiceTotal,
      paymentDue: Number(existingSupplier.paymentDue || 0) + invoiceTotal,
      paymentStatus: invoiceTotal > 0 ? 'Due' : existingSupplier.paymentStatus,
      lastInvoiceDate: invoice.invoiceDate || new Date().toISOString(),
    });
  }

  return createSupplier(userId, {
    name: supplierName,
    phone: invoice.supplierPhone || 'Not captured',
    address: '',
    productsSupplied: itemNames,
    category: 'Invoice Import',
    totalPurchase: invoiceTotal,
    paymentDue: invoiceTotal,
    paymentStatus: invoiceTotal > 0 ? 'Due' : 'Paid',
    notes: `Created from purchase invoice ${invoice.invoiceNumber || invoice.$id}.`,
    lastInvoiceDate: invoice.invoiceDate || new Date().toISOString(),
  });
}

async function recoverInvoiceItemsForApproval(userId, invoice, existingItems = []) {
  if (existingItems.length) return existingItems;

  const recoveredItems = [
    ...extractItemsFromInvoiceMetadata(invoice),
    ...extractItemsFromOcrText(invoice),
  ];
  const uniqueItems = [];
  const seen = new Set();

  for (const item of recoveredItems) {
    const key = `${normalizeName(item.productName)}-${item.quantity}-${item.amount}-${item.gstPercentage}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  }

  if (!uniqueItems.length) return [];

  await Promise.all(
    uniqueItems.map((item) => createInvoiceItem(userId, invoice.$id || invoice.id, item)),
  );

  return listInvoiceItems(userId, invoice.$id || invoice.id);
}

function normalizeInvoiceDocument(invoiceData, items = []) {
  const normalizedItems = items.map(normalizeInvoiceItem);
  const subtotal = invoiceData.subtotal !== undefined
    ? toNumber(invoiceData.subtotal)
    : calculateInvoiceSubtotal(normalizedItems);
  const gstAmount = invoiceData.gstAmount !== undefined
    ? toNumber(invoiceData.gstAmount)
    : calculateInvoiceGstAmount(normalizedItems);
  const totalAmount = invoiceData.totalAmount !== undefined
    ? toNumber(invoiceData.totalAmount)
    : calculateInvoiceTotalAmount(normalizedItems);

  return {
    invoiceNumber: invoiceData.invoiceNumber?.trim() || '',
    supplierId: invoiceData.supplierId || '',
    supplierName: invoiceData.supplierName?.trim() || '',
    supplierPhone: invoiceData.supplierPhone?.trim() || '',
    invoiceDate: toDateTime(invoiceData.invoiceDate),
    subtotal,
    gstAmount,
    totalAmount,
    status: invoiceStatuses.includes(invoiceData.status)
      ? invoiceData.status
      : 'Pending Review',
    inventoryUpdated: Boolean(invoiceData.inventoryUpdated),
    extractedText: invoiceData.extractedText || '',
    aiExtractedJson:
      typeof invoiceData.aiExtractedJson === 'string'
        ? invoiceData.aiExtractedJson
        : JSON.stringify(invoiceData.aiExtractedJson || {}),
    fileId: invoiceData.fileId || '',
    fileName: invoiceData.fileName || '',
    fileType: invoiceData.fileType || '',
  };
}

function pickAllowedFields(invoiceData) {
  return allowedInvoiceFields.reduce((picked, field) => {
    if (invoiceData[field] !== undefined) {
      picked[field] = invoiceData[field];
    }
    return picked;
  }, {});
}

export function toInvoiceItemRecord(document) {
  return {
    ...document,
    id: document.$id || document.id,
    quantity: Number(document.quantity || 0),
    amount: Number(document.amount || 0),
    gstPercentage: Number(document.gstPercentage || 0),
  };
}

export function toPurchaseInvoiceRecord(document, items = []) {
  return {
    ...document,
    id: document.$id || document.id,
    items,
    itemCount: items.length,
    invoiceDate: toInputDate(document.invoiceDate),
    subtotal: Number(document.subtotal || 0),
    gstAmount: Number(document.gstAmount || 0),
    totalAmount: Number(document.totalAmount || 0),
    inventoryUpdated: Boolean(document.inventoryUpdated),
    aiExtractedData: document.aiExtractedJson || '',
  };
}

async function listInvoiceDocuments(userId, options = {}) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.PURCHASE_INVOICES,
    [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(options.limit || 100),
    ],
  );

  return response.documents;
}

export async function listInvoiceItems(userId, invoiceId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.INVOICE_ITEMS,
      [
        Query.equal('userId', userId),
        Query.equal('invoiceId', invoiceId),
        Query.orderAsc('createdAt'),
        Query.limit(100),
      ],
    );

    return response.documents.map(toInvoiceItemRecord);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load invoice items.');
  }
}

export async function createInvoiceItem(userId, invoiceId, itemData) {
  const now = new Date().toISOString();
  const normalized = normalizeInvoiceItem(itemData);

  if (!normalized.productName) {
    throw new Error('Product name is required.');
  }

  try {
    const createdItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.INVOICE_ITEMS,
      ID.unique(),
      {
        ...normalized,
        userId,
        invoiceId,
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    return toInvoiceItemRecord(createdItem);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save invoice item.');
  }
}

export async function updateInvoiceItem(userId, itemId, itemData) {
  try {
    const existingItem = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.INVOICE_ITEMS,
      itemId,
    );

    assertInvoiceItemOwner(existingItem, userId);
    const normalized = normalizeInvoiceItem({ ...existingItem, ...itemData });

    const updatedItem = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.INVOICE_ITEMS,
      itemId,
      {
        ...normalized,
        updatedAt: new Date().toISOString(),
      },
    );

    return toInvoiceItemRecord(updatedItem);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update invoice item.');
  }
}

export async function deleteInvoiceItemsForInvoice(userId, invoiceId) {
  const items = await listInvoiceItems(userId, invoiceId);

  await Promise.all(
    items.map(async (item) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.INVOICE_ITEMS, item.id);
    }),
  );

  return { success: true, deletedCount: items.length };
}

export async function listPurchaseInvoices(userId, options = {}) {
  try {
    const documents = await listInvoiceDocuments(userId, options);
    const invoices = await Promise.all(
      documents.map(async (invoice) => {
        const items = await listInvoiceItems(userId, invoice.$id);
        return toPurchaseInvoiceRecord(invoice, items);
      }),
    );

    return invoices;
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load invoices.');
  }
}

export async function getPurchaseInvoice(userId, invoiceId) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);
    return toPurchaseInvoiceRecord(invoice);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load invoice.');
  }
}

export async function getPurchaseInvoiceWithItems(userId, invoiceId) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);
    const items = await listInvoiceItems(userId, invoiceId);
    return toPurchaseInvoiceRecord(invoice, items);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load invoice details.');
  }
}

export async function generatePurchaseInvoiceNumber(userId) {
  try {
    const documents = await listInvoiceDocuments(userId, { limit: 100 });
    return generateNextPurchaseInvoiceNumber(documents);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not generate purchase invoice number.');
  }
}

export async function createPurchaseInvoice(userId, invoiceData, items = []) {
  const now = new Date().toISOString();
  const invoiceNumber =
    invoiceData.invoiceNumber?.trim() || (await generatePurchaseInvoiceNumber(userId));
  const normalized = normalizeInvoiceDocument(
    { ...invoiceData, invoiceNumber },
    items,
  );

  if (!normalized.supplierName) {
    throw new Error('Supplier name is required.');
  }

  if (!normalized.invoiceDate) {
    throw new Error('Invoice date is required.');
  }

  if (normalized.totalAmount < 0) {
    throw new Error('Total amount must be 0 or more.');
  }

  try {
    const createdInvoice = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      ID.unique(),
      {
        ...normalized,
        userId,
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    await Promise.all(
      items.map((item) => createInvoiceItem(userId, createdInvoice.$id, item)),
    );

    return getPurchaseInvoiceWithItems(userId, createdInvoice.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save invoice record.');
  }
}

export async function updatePurchaseInvoice(userId, invoiceId, invoiceData) {
  try {
    const existingInvoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(existingInvoice, userId);
    const normalized = normalizeInvoiceDocument({ ...existingInvoice, ...invoiceData });

    const updatedInvoice = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
      {
        ...pickAllowedFields(normalized),
        updatedAt: new Date().toISOString(),
      },
    );

    return getPurchaseInvoiceWithItems(userId, updatedInvoice.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update invoice.');
  }
}

export async function approvePurchaseInvoice(userId, invoiceId, inventoryDecisions = {}) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);

    if (invoice.status === 'Approved' && invoice.inventoryUpdated) {
      return getPurchaseInvoiceWithItems(userId, invoiceId);
    }

    const existingItems = await listInvoiceItems(userId, invoiceId);
    const items = await recoverInvoiceItemsForApproval(userId, invoice, existingItems);
    const inventoryResult = await applyInvoiceToInventory(userId, invoice, items, inventoryDecisions);
    let supplier = null;
    let supplierUpdateWarning = '';

    try {
      supplier = await applyInvoiceToSupplier(userId, invoice, items);
    } catch (supplierError) {
      supplierUpdateWarning =
        supplierError?.message ||
        'Inventory was updated, but supplier ledger update could not be completed.';
    }

    const updatedInvoice = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
      {
        supplierId: supplier?.id || supplier?.$id || invoice.supplierId || '',
        status: 'Approved',
        inventoryUpdated: true,
        updatedAt: new Date().toISOString(),
      },
    );

    const refreshed = await getPurchaseInvoiceWithItems(userId, updatedInvoice.$id);
    return {
      ...refreshed,
      inventoryUpdateResult: inventoryResult,
      supplierUpdateWarning,
    };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not approve invoice.');
  }
}

export async function rejectPurchaseInvoice(userId, invoiceId, reason = '') {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);
    const aiPayload = invoice.aiExtractedJson
      ? JSON.parse(invoice.aiExtractedJson)
      : {};

    const updatedInvoice = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
      {
        status: 'Rejected',
        aiExtractedJson: JSON.stringify({ ...aiPayload, rejectionReason: reason }),
        updatedAt: new Date().toISOString(),
      },
    );

    return getPurchaseInvoiceWithItems(userId, updatedInvoice.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not reject invoice.');
  }
}

export async function deletePurchaseInvoice(userId, invoiceId, options = {}) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);
    await deleteInvoiceItemsForInvoice(userId, invoiceId);
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.PURCHASE_INVOICES, invoiceId);

    if (options.deleteFile && invoice.fileId) {
      await deleteInvoiceFile(invoice.fileId);
    }

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete invoice.');
  }
}

export function getInvoiceStats(invoices = []) {
  return {
    totalInvoices: invoices.length,
    approved: invoices.filter((invoice) => invoice.status === 'Approved').length,
    pendingReview: invoices.filter((invoice) => invoice.status === 'Pending Review').length,
    totalPurchaseValue: invoices
      .filter((invoice) => invoice.status !== 'Rejected')
      .reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0),
  };
}
