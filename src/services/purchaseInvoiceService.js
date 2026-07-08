import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import {
  calculateInvoiceGstAmount,
  calculateInvoiceSubtotal,
  calculateInvoiceTotalAmount,
  generateNextPurchaseInvoiceNumber,
  normalizeInvoiceItem,
} from '../utils/invoiceCalculations.js';
import { deleteInvoiceFile } from './invoiceStorageService.js';

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

function assertInvoiceOwner(invoice, userId) {
  return assertOwnsDocument(invoice, userId, 'Invoice');
}

function assertInvoiceItemOwner(item, userId) {
  return assertOwnsDocument(item, userId, 'Invoice item');
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

export async function approvePurchaseInvoice(userId, invoiceId) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    assertInvoiceOwner(invoice, userId);

    const updatedInvoice = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
      {
        status: 'Approved',
        inventoryUpdated: false,
        updatedAt: new Date().toISOString(),
      },
    );

    return getPurchaseInvoiceWithItems(userId, updatedInvoice.$id);
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
