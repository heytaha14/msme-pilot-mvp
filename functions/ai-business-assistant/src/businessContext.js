import { COLLECTION_IDS, listOwnedDocuments } from './appwriteAdmin.js';
import { safeJsonParse } from './safeJson.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isAfter(value, start) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed >= start;
}

function activeSales(sales = []) {
  return sales.filter((sale) => sale.paymentStatus !== 'Cancelled');
}

function sortByAmount(items, field) {
  return [...items].sort((a, b) => toNumber(b[field]) - toNumber(a[field]));
}

function stripInternalFields(item = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(item)) {
    if (key.startsWith('$')) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

async function safeList(databases, collectionId, userId, options, warnings, label) {
  try {
    return await listOwnedDocuments(databases, collectionId, userId, options);
  } catch {
    warnings.push(`${label} context unavailable.`);
    return [];
  }
}

export async function loadBusinessProfile(databases, userId) {
  try {
    const documents = await listOwnedDocuments(
      databases,
      COLLECTION_IDS.BUSINESS_PROFILES,
      userId,
      { limit: 1 },
    );
    const profile = documents[0];
    if (!profile) return null;

    return {
      businessName: profile.businessName || 'MSME business',
      ownerName: profile.ownerName || '',
      businessType: profile.businessType || '',
      city: profile.city || '',
      state: profile.state || '',
      plan: profile.plan || '',
    };
  } catch {
    return null;
  }
}

export async function loadInventorySummary(databases, userId) {
  const warnings = [];
  const products = await safeList(databases, COLLECTION_IDS.PRODUCTS, userId, { limit: 200 }, warnings, 'Inventory');
  const normalized = products.map((product) => ({
    id: product.$id,
    name: product.name || product.productName,
    category: product.category || 'Uncategorized',
    stock: toNumber(product.stock ?? product.currentStock),
    minStock: toNumber(product.minStock ?? product.minimumStock),
    purchasePrice: toNumber(product.purchasePrice),
  }));
  const lowStock = normalized.filter((product) => product.stock > 0 && product.stock <= product.minStock);
  const outOfStock = normalized.filter((product) => product.stock <= 0);

  return {
    totalProducts: normalized.length,
    lowStockProducts: lowStock.length,
    outOfStockProducts: outOfStock.length,
    inventoryValue: normalized.reduce((sum, product) => sum + product.stock * product.purchasePrice, 0),
    topLowStockItems: [...outOfStock, ...lowStock].slice(0, 8).map((product) => ({
      name: product.name,
      stock: product.stock,
      minStock: product.minStock,
      category: product.category,
    })),
    categories: [...new Set(normalized.map((product) => product.category).filter(Boolean))].slice(0, 12),
    warnings,
  };
}

export async function loadCustomerSummary(databases, userId) {
  const warnings = [];
  const customers = await safeList(databases, COLLECTION_IDS.CUSTOMERS, userId, { limit: 200 }, warnings, 'Customer');
  const pending = customers.filter((customer) => toNumber(customer.pendingAmount) > 0);

  return {
    totalCustomers: customers.length,
    pendingCustomerDues: customers.reduce((sum, customer) => sum + toNumber(customer.pendingAmount), 0),
    highestPendingCustomers: sortByAmount(pending, 'pendingAmount').slice(0, 5).map((customer) => ({
      name: customer.name,
      pendingAmount: toNumber(customer.pendingAmount),
      phone: customer.phone,
    })),
    paidCustomers: customers.filter((customer) => toNumber(customer.pendingAmount) <= 0).length,
    overdueCustomers: customers.filter((customer) => customer.paymentStatus === 'Overdue').length,
    warnings,
  };
}

export async function loadSupplierSummary(databases, userId) {
  const warnings = [];
  const suppliers = await safeList(databases, COLLECTION_IDS.SUPPLIERS, userId, { limit: 200 }, warnings, 'Supplier');
  const due = suppliers.filter((supplier) => toNumber(supplier.paymentDue) > 0);

  return {
    totalSuppliers: suppliers.length,
    supplierDues: suppliers.reduce((sum, supplier) => sum + toNumber(supplier.paymentDue), 0),
    highestDueSuppliers: sortByAmount(due, 'paymentDue').slice(0, 5).map((supplier) => ({
      name: supplier.name,
      paymentDue: toNumber(supplier.paymentDue),
      category: supplier.category,
    })),
    overdueSuppliers: suppliers.filter((supplier) => supplier.paymentStatus === 'Overdue').length,
    warnings,
  };
}

export async function loadSalesSummary(databases, userId) {
  const warnings = [];
  const sales = await safeList(databases, COLLECTION_IDS.SALES, userId, { limit: 200, orderDesc: 'saleDate' }, warnings, 'Sales');
  const saleItems = await safeList(databases, COLLECTION_IDS.SALE_ITEMS, userId, { limit: 500 }, warnings, 'Sale item');
  const today = startOfToday();
  const month = startOfMonth();
  const currentSales = activeSales(sales).filter((sale) => isAfter(sale.saleDate, month));
  const todaySales = activeSales(sales)
    .filter((sale) => isAfter(sale.saleDate, today))
    .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const monthlyRevenue = currentSales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const monthlyProfit = currentSales.reduce((sum, sale) => sum + toNumber(sale.profit), 0);
  const itemTotals = saleItems.reduce((acc, item) => {
    const key = item.productName || 'Unknown item';
    acc[key] = (acc[key] || 0) + toNumber(item.quantity);
    return acc;
  }, {});

  return {
    todaySales,
    monthlyRevenue,
    monthlyProfit,
    pendingSalesAmount: activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.dueAmount), 0),
    salesCountThisMonth: currentSales.length,
    bestSellingItems: Object.entries(itemTotals)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
    recentSales: sales.slice(0, 5).map((sale) => ({
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      totalAmount: toNumber(sale.totalAmount),
      paymentStatus: sale.paymentStatus,
      saleDate: sale.saleDate,
    })),
    warnings,
  };
}

export async function loadInvoiceSummary(databases, userId) {
  const warnings = [];
  const invoices = await safeList(databases, COLLECTION_IDS.PURCHASE_INVOICES, userId, { limit: 200, orderDesc: 'invoiceDate' }, warnings, 'Invoice');
  const invoiceItems = await safeList(databases, COLLECTION_IDS.INVOICE_ITEMS, userId, { limit: 500 }, warnings, 'Invoice item');
  const month = startOfMonth();
  const monthlyInvoices = invoices.filter((invoice) => isAfter(invoice.invoiceDate, month));

  return {
    totalInvoices: invoices.length,
    pendingReviewCount: invoices.filter((invoice) => invoice.status === 'Pending Review').length,
    failedOcrCount: invoices.filter((invoice) => invoice.status === 'Failed OCR').length,
    approvedCount: invoices.filter((invoice) => invoice.status === 'Approved').length,
    purchaseValueThisMonth: monthlyInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0),
    recentInvoiceItems: invoiceItems.slice(0, 8).map((item) => ({
      productName: item.productName,
      quantity: toNumber(item.quantity),
      amount: toNumber(item.amount),
    })),
    warnings,
  };
}

export async function loadNotificationSummary(databases, userId) {
  const warnings = [];
  const notifications = await safeList(databases, COLLECTION_IDS.NOTIFICATIONS, userId, { limit: 100, orderDesc: 'createdAt' }, warnings, 'Notification');

  return {
    unreadCount: notifications.filter((item) => item.status === 'Unread').length,
    criticalCount: notifications.filter((item) => item.priority === 'Critical' && item.status !== 'Archived').length,
    highPriorityAlerts: notifications.filter((item) => item.priority === 'High' && item.status !== 'Archived').length,
    urgentAlerts: notifications
      .filter((item) => ['Critical', 'High'].includes(item.priority) && item.status !== 'Archived')
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        message: item.message,
        type: item.type,
        priority: item.priority,
      })),
    warnings,
  };
}

export async function loadBusinessHealthSummary(databases, userId) {
  const warnings = [];
  const snapshots = await safeList(
    databases,
    COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
    userId,
    { limit: 10, orderDesc: 'createdAt' },
    warnings,
    'Business health',
  );
  const latest = snapshots[0];
  const recommendations = safeJsonParse(latest?.recommendationsJson, {});

  return {
    latestScore: latest ? toNumber(latest.score) : null,
    latestStatus: latest?.status || '',
    componentScores: latest
      ? {
          inventoryHealth: toNumber(latest.inventoryHealth),
          salesPerformance: toNumber(latest.salesPerformance),
          pendingPaymentsScore: toNumber(latest.pendingPaymentsScore),
          customerGrowth: toNumber(latest.customerGrowth),
          profitMargin: toNumber(latest.profitMargin),
        }
      : null,
    latestRecommendations: recommendations?.recommendations || [],
    warnings,
  };
}

export async function loadReportSummary(databases, userId) {
  const warnings = [];
  const reports = await safeList(databases, COLLECTION_IDS.GENERATED_REPORTS, userId, { limit: 20, orderDesc: 'createdAt' }, warnings, 'Report');

  return {
    recentReports: reports.slice(0, 5).map((report) => ({
      reportName: report.reportName,
      reportType: report.reportType,
      period: report.period,
      status: report.status,
      generatedAt: report.generatedAt,
    })),
    lastGeneratedReport: reports[0]
      ? {
          reportName: reports[0].reportName,
          reportType: reports[0].reportType,
          period: reports[0].period,
          status: reports[0].status,
        }
      : null,
    warnings,
  };
}

export async function loadRecentAiHistory(databases, userId, conversationId) {
  if (!conversationId) return [];

  try {
    const messages = await listOwnedDocuments(
      databases,
      COLLECTION_IDS.AI_HISTORY,
      userId,
      { limit: 20, orderDesc: 'createdAt', conversationId },
    );

    return messages
      .reverse()
      .map((message) => ({
        role: message.role,
        message: String(message.message || '').slice(0, 1200),
        createdAt: message.createdAt,
      }));
  } catch {
    return [];
  }
}

export async function buildBusinessContext(databases, userId, conversationId) {
  const [
    business,
    inventory,
    customers,
    suppliers,
    sales,
    invoices,
    notifications,
    businessHealth,
    reports,
    conversation,
  ] = await Promise.all([
    loadBusinessProfile(databases, userId),
    loadInventorySummary(databases, userId),
    loadCustomerSummary(databases, userId),
    loadSupplierSummary(databases, userId),
    loadSalesSummary(databases, userId),
    loadInvoiceSummary(databases, userId),
    loadNotificationSummary(databases, userId),
    loadBusinessHealthSummary(databases, userId),
    loadReportSummary(databases, userId),
    loadRecentAiHistory(databases, userId, conversationId),
  ]);

  const warnings = [
    ...(inventory.warnings || []),
    ...(customers.warnings || []),
    ...(suppliers.warnings || []),
    ...(sales.warnings || []),
    ...(invoices.warnings || []),
    ...(notifications.warnings || []),
    ...(businessHealth.warnings || []),
    ...(reports.warnings || []),
  ];

  return stripInternalFields({
    business,
    inventory,
    customers,
    suppliers,
    sales,
    invoices,
    notifications,
    businessHealth,
    reports,
    conversation,
    warnings,
  });
}
