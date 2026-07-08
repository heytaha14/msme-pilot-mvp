import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { getStockStatus } from '../utils/formatters.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import {
  calculateDueAmount,
  calculateSaleGstAmount,
  calculateSaleProfit,
  calculateSaleSubtotal,
  calculateSaleTotalAmount,
  deriveSalePaymentStatus,
  generateNextInvoiceNumber,
  normalizeSaleItem,
} from '../utils/salesCalculations.js';
import {
  adjustCustomerPendingAmount,
  applySaleToCustomer,
  reverseSaleFromCustomer,
} from './customerService.js';
import {
  createInventoryMovement,
  createSaleInventoryMovement,
} from './inventoryMovementService.js';
import {
  createSaleItem,
  deleteSaleItemsForSale,
  listSaleItems as listSaleItemDocuments,
} from './saleItemService.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateTime(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (String(value).includes('T')) {
    return value;
  }

  return `${value}T00:00:00.000Z`;
}

function toInputDate(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function assertSaleOwner(sale, userId) {
  return assertOwnsDocument(sale, userId, 'Sale');
}

function toSaleRecord(document, items = []) {
  return {
    ...document,
    id: document.$id || document.id,
    items,
    saleDate: toInputDate(document.saleDate),
    subtotal: Number(document.subtotal || 0),
    gstAmount: Number(document.gstAmount || 0),
    totalAmount: Number(document.totalAmount || 0),
    profit: Number(document.profit || 0),
    paidAmount: Number(document.paidAmount || 0),
    dueAmount: Number(document.dueAmount || 0),
  };
}

function validateSaleInput(saleData) {
  if (!saleData.customerName?.trim()) {
    throw new Error('Customer name is required.');
  }

  if (!saleData.items?.length) {
    throw new Error('At least one sale item is required.');
  }

  saleData.items.forEach((item) => {
    if (!item.productName?.trim()) {
      throw new Error('Product name is required.');
    }

    if (toNumber(item.quantity) <= 0) {
      throw new Error('Quantity must be greater than 0.');
    }

    if (toNumber(item.sellingPrice) <= 0) {
      throw new Error('Selling price must be greater than 0.');
    }
  });
}

async function listSaleDocuments(userId, options = {}) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.SALES,
    [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(options.limit || 100),
    ],
  );

  return response.documents;
}

async function getProductForSale(userId, productId) {
  const product = await databases.getDocument(
    DATABASE_ID,
    COLLECTION_IDS.PRODUCTS,
    productId,
  );

  assertOwnsDocument(product, userId, 'Product');

  return product;
}

async function prepareSaleItems(userId, items) {
  const preparedItems = [];

  for (const item of items) {
    let normalized = normalizeSaleItem(item);

    if (normalized.productId) {
      const product = await getProductForSale(userId, normalized.productId);
      const availableStock = toNumber(product.stock);

      if (availableStock < normalized.quantity) {
        throw new Error(
          `Not enough stock for ${product.name}. Available: ${availableStock}, requested: ${normalized.quantity}.`,
        );
      }

      normalized = normalizeSaleItem({
        ...normalized,
        productName: product.name,
        unit: normalized.unit || product.unit || '',
        sellingPrice: normalized.sellingPrice || product.sellingPrice,
        purchasePrice: normalized.purchasePrice || product.purchasePrice,
        gstPercentage: normalized.gstPercentage || product.gstPercentage,
      });
    }

    preparedItems.push(normalized);
  }

  return preparedItems;
}

function calculateSaleDocument(userId, saleData, items, invoiceNumber) {
  const subtotal = calculateSaleSubtotal(items);
  const gstAmount = calculateSaleGstAmount(items);
  const totalAmount = calculateSaleTotalAmount(items);
  const profit = calculateSaleProfit(items);
  const paidAmount = Math.min(toNumber(saleData.paidAmount), totalAmount);
  const dueAmount = calculateDueAmount(totalAmount, paidAmount);
  const paymentStatus = deriveSalePaymentStatus(
    totalAmount,
    paidAmount,
    saleData.paymentStatus,
  );
  const now = new Date().toISOString();

  return {
    userId,
    invoiceNumber,
    customerId: saleData.customerId || '',
    customerName: saleData.customerName.trim(),
    customerPhone: saleData.customerPhone?.trim() || '',
    subtotal,
    gstAmount,
    totalAmount,
    profit,
    paidAmount,
    dueAmount,
    paymentStatus,
    saleDate: toDateTime(saleData.saleDate),
    notes: saleData.notes?.trim() || '',
    createdAt: saleData.createdAt || now,
    updatedAt: now,
  };
}

async function deductInventoryForSale(userId, saleId, items) {
  for (const item of items) {
    if (!item.productId) {
      continue;
    }

    const product = await getProductForSale(userId, item.productId);
    const previousStock = toNumber(product.stock);
    const newStock = Math.max(0, previousStock - item.quantity);

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      item.productId,
      {
        stock: newStock,
        status: getStockStatus({ stock: newStock, minStock: product.minStock }),
        updatedAt: new Date().toISOString(),
      },
    );

    await createSaleInventoryMovement(
      userId,
      product,
      saleId,
      item.quantity,
      previousStock,
      newStock,
    );
  }
}

async function restoreInventoryForSale(userId, saleId, items) {
  for (const item of items) {
    if (!item.productId) {
      continue;
    }

    const product = await getProductForSale(userId, item.productId);
    const previousStock = toNumber(product.stock);
    const newStock = previousStock + item.quantity;

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      item.productId,
      {
        stock: newStock,
        status: getStockStatus({ stock: newStock, minStock: product.minStock }),
        updatedAt: new Date().toISOString(),
      },
    );

    await createInventoryMovement(userId, {
      productId: item.productId,
      productName: item.productName,
      movementType: 'return',
      quantity: item.quantity,
      previousStock,
      newStock,
      referenceType: 'sale_delete',
      referenceId: saleId,
      note: 'Stock restored after sale deletion',
    });
  }
}

export async function listSaleItems(userId, saleId) {
  return listSaleItemDocuments(userId, saleId);
}

export async function listSales(userId, options = {}) {
  try {
    const documents = await listSaleDocuments(userId, options);
    const sales = await Promise.all(
      documents.map(async (sale) => {
        const items = await listSaleItemDocuments(userId, sale.$id);
        return toSaleRecord(sale, items);
      }),
    );

    return sales;
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load sales.');
  }
}

export async function getSaleWithItems(userId, saleId) {
  try {
    const sale = await databases.getDocument(DATABASE_ID, COLLECTION_IDS.SALES, saleId);
    assertSaleOwner(sale, userId);
    const items = await listSaleItemDocuments(userId, saleId);

    return toSaleRecord(sale, items);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load sale details.');
  }
}

export async function generateInvoiceNumber(userId) {
  try {
    const sales = await listSaleDocuments(userId, { limit: 100 });
    return generateNextInvoiceNumber(sales);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not generate invoice number.');
  }
}

export async function createSale(userId, saleData) {
  validateSaleInput(saleData);

  try {
    const preparedItems = await prepareSaleItems(userId, saleData.items);
    const invoiceNumber = saleData.invoiceNumber || (await generateInvoiceNumber(userId));
    const saleDocument = calculateSaleDocument(userId, saleData, preparedItems, invoiceNumber);

    const createdSale = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      ID.unique(),
      saleDocument,
      userDocumentPermissions(userId),
    );

    try {
      await Promise.all(
        preparedItems.map((item) => createSaleItem(userId, createdSale.$id, item)),
      );
      await deductInventoryForSale(userId, createdSale.$id, preparedItems);

      if (saleDocument.customerId) {
        await applySaleToCustomer(userId, saleDocument.customerId, {
          totalAmount: saleDocument.totalAmount,
          dueAmount: saleDocument.dueAmount,
          saleDate: saleDocument.saleDate,
        });
      }
    } catch (error) {
      throw error;
    }

    return getSaleWithItems(userId, createdSale.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not create sale.');
  }
}

export async function updateSale(userId, saleId, saleData) {
  try {
    const existingSale = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
    );

    assertSaleOwner(existingSale, userId);

    const paidAmount = Math.min(
      toNumber(saleData.paidAmount, existingSale.paidAmount),
      toNumber(existingSale.totalAmount),
    );
    const dueAmount = calculateDueAmount(existingSale.totalAmount, paidAmount);
    const paymentStatus = deriveSalePaymentStatus(
      existingSale.totalAmount,
      paidAmount,
      saleData.paymentStatus,
    );
    const previousDue = toNumber(existingSale.dueAmount);
    const dueDelta = dueAmount - previousDue;

    const updatedSale = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
      {
        customerName: saleData.customerName?.trim() || existingSale.customerName,
        customerPhone: saleData.customerPhone?.trim() || existingSale.customerPhone || '',
        saleDate: toDateTime(saleData.saleDate || existingSale.saleDate),
        paidAmount,
        dueAmount,
        paymentStatus,
        notes: saleData.notes?.trim() || '',
        updatedAt: new Date().toISOString(),
      },
    );

    if (existingSale.customerId && dueDelta !== 0) {
      await adjustCustomerPendingAmount(userId, existingSale.customerId, dueDelta);
    }

    return getSaleWithItems(userId, updatedSale.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update sale.');
  }
}

export async function markSalePaid(userId, saleId) {
  try {
    const existingSale = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
    );

    assertSaleOwner(existingSale, userId);
    const previousDue = toNumber(existingSale.dueAmount);

    const updatedSale = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
      {
        paidAmount: Number(existingSale.totalAmount || 0),
        dueAmount: 0,
        paymentStatus: 'Paid',
        updatedAt: new Date().toISOString(),
      },
    );

    if (existingSale.customerId && previousDue > 0) {
      await adjustCustomerPendingAmount(userId, existingSale.customerId, -previousDue);
    }

    return getSaleWithItems(userId, updatedSale.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not mark sale as paid.');
  }
}

export async function cancelSale(userId, saleId) {
  try {
    const existingSale = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
    );

    assertSaleOwner(existingSale, userId);

    const updatedSale = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALES,
      saleId,
      {
        paymentStatus: 'Cancelled',
        updatedAt: new Date().toISOString(),
      },
    );

    return getSaleWithItems(userId, updatedSale.$id);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not cancel sale.');
  }
}

export async function deleteSale(userId, saleId, options = {}) {
  try {
    const sale = await getSaleWithItems(userId, saleId);

    if (options.restoreStock !== false) {
      await restoreInventoryForSale(userId, saleId, sale.items);
    }

    await deleteSaleItemsForSale(userId, saleId);
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.SALES, saleId);

    if (sale.customerId) {
      await reverseSaleFromCustomer(userId, sale.customerId, {
        totalAmount: sale.totalAmount,
        dueAmount: sale.dueAmount,
      });
    }

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete sale.');
  }
}

export function getSalesStats(sales = []) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const activeSales = sales.filter((sale) => sale.paymentStatus !== 'Cancelled');

  return {
    todaySales: activeSales
      .filter((sale) => sale.saleDate === today)
      .reduce((sum, sale) => sum + sale.totalAmount, 0),
    monthlyRevenue: activeSales
      .filter((sale) => sale.saleDate.slice(0, 7) === currentMonth)
      .reduce((sum, sale) => sum + sale.totalAmount, 0),
    pendingSales: activeSales
      .filter((sale) => ['Pending', 'Partial'].includes(sale.paymentStatus))
      .reduce((sum, sale) => sum + sale.dueAmount, 0),
    profitThisMonth: activeSales
      .filter((sale) => sale.saleDate.slice(0, 7) === currentMonth)
      .reduce((sum, sale) => sum + sale.profit, 0),
  };
}

export async function searchSales(userId, filters = {}) {
  const sales = await listSales(userId, { limit: filters.limit || 100 });
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  return sales.filter((sale) => {
    const itemNames = sale.items.map((item) => item.productName).join(' ').toLowerCase();
    const matchesSearch =
      !searchTerm ||
      sale.invoiceNumber.toLowerCase().includes(searchTerm) ||
      sale.customerName.toLowerCase().includes(searchTerm) ||
      String(sale.customerPhone || '').toLowerCase().includes(searchTerm) ||
      itemNames.includes(searchTerm);

    const matchesStatus =
      !filters.paymentStatus ||
      filters.paymentStatus === 'All Sales' ||
      sale.paymentStatus === filters.paymentStatus;

    return matchesSearch && matchesStatus;
  });
}
