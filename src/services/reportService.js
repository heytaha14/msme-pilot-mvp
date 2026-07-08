import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import {
  buildReportPayload,
  calculateInventoryValue,
  calculateLowStockCount,
  calculatePendingCustomerAmount,
  calculateProfit,
  calculateRevenue,
  calculateSupplierDueAmount,
  filterByDateRange,
} from '../utils/reportCalculations.js';

const collectionLimits = {
  products: 500,
  customers: 500,
  suppliers: 500,
  sales: 500,
  saleItems: 1000,
  purchaseInvoices: 500,
  invoiceItems: 1000,
  payments: 500,
  generatedReports: 100,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInputDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export async function listAllDocuments(collectionId, userId, options = {}) {
  const limit = options.limit || 100;
  const documents = [];
  let offset = 0;

  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [
        Query.equal('userId', userId),
        Query.limit(limit),
        Query.offset(offset),
        ...(options.orderDesc ? [Query.orderDesc(options.orderDesc)] : []),
      ],
    );

    documents.push(...response.documents);

    if (response.documents.length < limit) {
      break;
    }

    offset += limit;
  }

  return documents;
}

async function loadCollection(key, collectionId, userId, limit, warnings) {
  try {
    return await listAllDocuments(collectionId, userId, {
      limit,
      orderDesc: 'createdAt',
    });
  } catch (error) {
    warnings.push(`${key} data could not be loaded.`);
    return [];
  }
}

function normalizeProduct(document) {
  return {
    ...document,
    id: document.$id || document.id,
    productName: document.name || document.productName,
    currentStock: toNumber(document.stock ?? document.currentStock),
    minimumStock: toNumber(document.minStock ?? document.minimumStock),
    stock: toNumber(document.stock ?? document.currentStock),
    minStock: toNumber(document.minStock ?? document.minimumStock),
    purchasePrice: toNumber(document.purchasePrice),
    sellingPrice: toNumber(document.sellingPrice),
    gstPercentage: toNumber(document.gstPercentage),
  };
}

function normalizeCustomer(document) {
  return {
    ...document,
    id: document.$id || document.id,
    totalPurchases: toNumber(document.totalPurchases),
    pendingAmount: toNumber(document.pendingAmount),
    lastPurchaseDate: toInputDate(document.lastPurchaseDate),
  };
}

function normalizeSupplier(document) {
  return {
    ...document,
    id: document.$id || document.id,
    totalPurchase: toNumber(document.totalPurchase),
    paymentDue: toNumber(document.paymentDue),
    lastInvoiceDate: toInputDate(document.lastInvoiceDate),
    lastPaymentDate: toInputDate(document.lastPaymentDate),
  };
}

function normalizeSale(document) {
  return {
    ...document,
    id: document.$id || document.id,
    saleDate: toInputDate(document.saleDate),
    subtotal: toNumber(document.subtotal),
    gstAmount: toNumber(document.gstAmount),
    totalAmount: toNumber(document.totalAmount),
    profit: toNumber(document.profit),
    paidAmount: toNumber(document.paidAmount),
    dueAmount: toNumber(document.dueAmount),
  };
}

function normalizeSaleItem(document) {
  return {
    ...document,
    id: document.$id || document.id,
    quantity: toNumber(document.quantity),
    sellingPrice: toNumber(document.sellingPrice),
    purchasePrice: toNumber(document.purchasePrice),
    gstPercentage: toNumber(document.gstPercentage),
    lineSubtotal: toNumber(document.lineSubtotal),
    lineGst: toNumber(document.lineGst),
    lineTotal: toNumber(document.lineTotal),
    profit: toNumber(document.profit),
  };
}

function normalizePurchaseInvoice(document) {
  return {
    ...document,
    id: document.$id || document.id,
    invoiceDate: toInputDate(document.invoiceDate),
    subtotal: toNumber(document.subtotal),
    gstAmount: toNumber(document.gstAmount),
    totalAmount: toNumber(document.totalAmount),
    inventoryUpdated: Boolean(document.inventoryUpdated),
  };
}

function normalizeInvoiceItem(document) {
  return {
    ...document,
    id: document.$id || document.id,
    quantity: toNumber(document.quantity),
    amount: toNumber(document.amount),
    gstPercentage: toNumber(document.gstPercentage),
  };
}

function normalizePayment(document) {
  return {
    ...document,
    id: document.$id || document.id,
    amount: toNumber(document.amount),
    paymentDate: toInputDate(document.paymentDate),
  };
}

export function normalizeGeneratedReport(document) {
  return {
    ...document,
    id: document.$id || document.id,
    generatedDate: toInputDate(document.generatedAt || document.createdAt || document.$createdAt),
    summary: safeJsonParse(document.summaryJson, null),
  };
}

export async function loadReportData(userId) {
  const warnings = [];
  const [
    products,
    customers,
    suppliers,
    sales,
    saleItems,
    purchaseInvoices,
    invoiceItems,
    payments,
  ] = await Promise.all([
    loadCollection('Products', COLLECTION_IDS.PRODUCTS, userId, collectionLimits.products, warnings),
    loadCollection('Customers', COLLECTION_IDS.CUSTOMERS, userId, collectionLimits.customers, warnings),
    loadCollection('Suppliers', COLLECTION_IDS.SUPPLIERS, userId, collectionLimits.suppliers, warnings),
    loadCollection('Sales', COLLECTION_IDS.SALES, userId, collectionLimits.sales, warnings),
    loadCollection('Sale items', COLLECTION_IDS.SALE_ITEMS, userId, collectionLimits.saleItems, warnings),
    loadCollection('Purchase invoices', COLLECTION_IDS.PURCHASE_INVOICES, userId, collectionLimits.purchaseInvoices, warnings),
    loadCollection('Invoice items', COLLECTION_IDS.INVOICE_ITEMS, userId, collectionLimits.invoiceItems, warnings),
    loadCollection('Payments', COLLECTION_IDS.PAYMENTS, userId, collectionLimits.payments, warnings),
  ]);

  return {
    products: products.map(normalizeProduct),
    customers: customers.map(normalizeCustomer),
    suppliers: suppliers.map(normalizeSupplier),
    sales: sales.map(normalizeSale),
    saleItems: saleItems.map(normalizeSaleItem),
    purchaseInvoices: purchaseInvoices.map(normalizePurchaseInvoice),
    invoiceItems: invoiceItems.map(normalizeInvoiceItem),
    payments: payments.map(normalizePayment),
    warnings,
  };
}

function buildReport(reportType, data, options = {}) {
  const dateRange = options.dateRange || 'This Month';
  return buildReportPayload(reportType, data, dateRange);
}

export async function generateBusinessOverviewReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Business Overview', data, options);
}

export async function generateSalesReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Sales Report', data, options);
}

export async function generateProfitReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Profit Report', data, options);
}

export async function generateInventoryReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Inventory Report', data, options);
}

export async function generateCustomerReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Customer Report', data, options);
}

export async function generateSupplierReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Supplier Report', data, options);
}

export async function generatePaymentReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('Payment Report', data, options);
}

export async function generateGstSummaryReport(userId, options = {}) {
  const data = options.data || (await loadReportData(userId));
  return buildReport('GST Summary', data, options);
}

export async function saveGeneratedReport(userId, reportData) {
  const now = new Date().toISOString();
  const reportName = `${reportData.reportType} - ${reportData.dateRange}`;

  try {
    const created = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.GENERATED_REPORTS,
      ID.unique(),
      {
        userId,
        reportName,
        reportType: reportData.reportType,
        period: reportData.dateRange,
        status: 'Ready',
        summaryJson: JSON.stringify({
          selectedReportType: reportData.reportType,
          dateRange: reportData.dateRange,
          summaryMetrics: reportData.metrics,
          insightText: reportData.insights?.explanation || '',
          tableRows: reportData.tableRows,
          generatedAt: reportData.generatedAt,
          source: 'client_appwrite_data',
        }),
        fileId: '',
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    return normalizeGeneratedReport(created);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save generated report.');
  }
}

export async function listGeneratedReports(userId) {
  try {
    const documents = await listAllDocuments(
      COLLECTION_IDS.GENERATED_REPORTS,
      userId,
      {
        limit: collectionLimits.generatedReports,
        orderDesc: 'createdAt',
      },
    );

    return documents.map(normalizeGeneratedReport);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load generated reports.');
  }
}

export async function deleteGeneratedReport(userId, reportId) {
  try {
    const report = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.GENERATED_REPORTS,
      reportId,
    );

    assertOwnsDocument(report, userId, 'Report');

    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.GENERATED_REPORTS, reportId);
    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete generated report.');
  }
}

export function getReportStats(reportData = {}) {
  const monthlySales = filterByDateRange(reportData.sales || [], 'saleDate', 'This Month');

  return {
    monthlyRevenue: calculateRevenue(monthlySales),
    monthlyProfit: calculateProfit(monthlySales),
    inventoryValue: calculateInventoryValue(reportData.products || []),
    pendingPayments: calculatePendingCustomerAmount(reportData.customers || []),
    lowStockItems: calculateLowStockCount(reportData.products || []),
    supplierDue: calculateSupplierDueAmount(reportData.suppliers || []),
  };
}
