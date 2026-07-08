import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import {
  calculateCustomerGrowth,
  calculateInventoryHealth,
  calculateMonthlyRevenue,
  calculateOverallBusinessHealth,
  calculatePendingPaymentsScore,
  calculateProfitMarginScore,
  calculateSalesPerformance,
  calculateSupplierDues,
  clampScore,
  getHealthStatus,
  getScoreTrend,
} from '../utils/businessHealthCalculations.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters.js';
import { listAllDocuments } from './reportService.js';

const collectionLimits = {
  products: 500,
  customers: 500,
  suppliers: 500,
  sales: 500,
  saleItems: 1000,
  purchaseInvoices: 500,
  payments: 500,
  snapshots: 30,
};

const weights = {
  inventoryHealth: 25,
  salesPerformance: 25,
  pendingPaymentsScore: 20,
  customerGrowth: 15,
  profitMargin: 15,
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

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function loadCollection(label, collectionId, userId, limit, warnings) {
  try {
    return await listAllDocuments(collectionId, userId, {
      limit,
      orderDesc: 'createdAt',
    });
  } catch {
    warnings.push(`${label} data could not be loaded.`);
    return [];
  }
}

function normalizeProduct(document) {
  return {
    ...document,
    id: document.$id || document.id,
    name: document.name || document.productName,
    productName: document.productName || document.name,
    stock: toNumber(document.stock ?? document.currentStock),
    currentStock: toNumber(document.stock ?? document.currentStock),
    minStock: toNumber(document.minStock ?? document.minimumStock),
    minimumStock: toNumber(document.minStock ?? document.minimumStock),
    purchasePrice: toNumber(document.purchasePrice),
    sellingPrice: toNumber(document.sellingPrice),
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
    dueAmount: toNumber(document.dueAmount),
  };
}

function normalizeSaleItem(document) {
  return {
    ...document,
    id: document.$id || document.id,
    quantity: toNumber(document.quantity),
    lineTotal: toNumber(document.lineTotal),
    profit: toNumber(document.profit),
  };
}

function normalizePurchaseInvoice(document) {
  return {
    ...document,
    id: document.$id || document.id,
    invoiceDate: toInputDate(document.invoiceDate),
    totalAmount: toNumber(document.totalAmount),
    gstAmount: toNumber(document.gstAmount),
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

export function normalizeHealthSnapshot(document) {
  const recommendationsPayload = parseJson(document.recommendationsJson, {});

  return {
    ...document,
    id: document.$id || document.id,
    score: toNumber(document.score),
    inventoryHealth: toNumber(document.inventoryHealth),
    salesPerformance: toNumber(document.salesPerformance),
    pendingPaymentsScore: toNumber(document.pendingPaymentsScore),
    customerGrowth: toNumber(document.customerGrowth),
    profitMargin: toNumber(document.profitMargin),
    recommendations: recommendationsPayload.recommendations || [],
    actionChecklist: recommendationsPayload.actionChecklist || [],
    metrics: recommendationsPayload.metrics || {},
    risks: parseJson(document.risksJson, []),
    opportunities: parseJson(document.opportunitiesJson, []),
    createdAt: document.createdAt || document.$createdAt,
    updatedAt: document.updatedAt || document.$updatedAt,
  };
}

export async function loadBusinessHealthData(userId) {
  const warnings = [];
  const [
    products,
    customers,
    suppliers,
    sales,
    saleItems,
    purchaseInvoices,
    payments,
  ] = await Promise.all([
    loadCollection('Products', COLLECTION_IDS.PRODUCTS, userId, collectionLimits.products, warnings),
    loadCollection('Customers', COLLECTION_IDS.CUSTOMERS, userId, collectionLimits.customers, warnings),
    loadCollection('Suppliers', COLLECTION_IDS.SUPPLIERS, userId, collectionLimits.suppliers, warnings),
    loadCollection('Sales', COLLECTION_IDS.SALES, userId, collectionLimits.sales, warnings),
    loadCollection('Sale items', COLLECTION_IDS.SALE_ITEMS, userId, collectionLimits.saleItems, warnings),
    loadCollection('Purchase invoices', COLLECTION_IDS.PURCHASE_INVOICES, userId, collectionLimits.purchaseInvoices, warnings),
    loadCollection('Payments', COLLECTION_IDS.PAYMENTS, userId, collectionLimits.payments, warnings),
  ]);

  return {
    products: products.map(normalizeProduct),
    customers: customers.map(normalizeCustomer),
    suppliers: suppliers.map(normalizeSupplier),
    sales: sales.map(normalizeSale),
    saleItems: saleItems.map(normalizeSaleItem),
    purchaseInvoices: purchaseInvoices.map(normalizePurchaseInvoice),
    payments: payments.map(normalizePayment),
    warnings,
  };
}

function getHighestPendingCustomer(customers = []) {
  return [...customers].sort((a, b) => toNumber(b.pendingAmount) - toNumber(a.pendingAmount))[0] || null;
}

function getHighestDueSupplier(suppliers = []) {
  return [...suppliers].sort((a, b) => toNumber(b.paymentDue) - toNumber(a.paymentDue))[0] || null;
}

export function buildHealthRecommendations(healthData, scores) {
  const recommendations = [];
  const highestPendingCustomer = getHighestPendingCustomer(healthData.customers);
  const highestDueSupplier = getHighestDueSupplier(healthData.suppliers);

  if (scores.metrics.outOfStockCount > 0) {
    recommendations.push(`Resolve ${scores.metrics.outOfStockCount} out-of-stock products immediately.`);
  }

  if (scores.metrics.lowStockCount > 0) {
    recommendations.push(`Restock ${scores.metrics.lowStockCount} low-stock products before demand increases.`);
  }

  if (scores.metrics.customerPendingAmount > 0) {
    recommendations.push(`Recover ${formatCurrency(scores.metrics.customerPendingAmount)} customer dues to improve cash flow.`);
  }

  if (highestPendingCustomer?.pendingAmount > 0) {
    recommendations.push(`Follow up with ${highestPendingCustomer.name} for ${formatCurrency(highestPendingCustomer.pendingAmount)}.`);
  }

  if (scores.metrics.supplierDues > 0) {
    recommendations.push(`Plan supplier payments of ${formatCurrency(scores.metrics.supplierDues)} to maintain restocking relationships.`);
  }

  if (highestDueSupplier?.paymentDue > 0) {
    recommendations.push(`Prioritize ${highestDueSupplier.name} supplier due of ${formatCurrency(highestDueSupplier.paymentDue)}.`);
  }

  if (scores.metrics.pendingInvoicesCount > 0) {
    recommendations.push(`Review ${scores.metrics.pendingInvoicesCount} pending invoices to keep purchase records accurate.`);
  }

  if (scores.metrics.profitMarginPercentage < 15) {
    recommendations.push('Review purchase prices and selling margins.');
  }

  if (!scores.metrics.monthlyRevenue) {
    recommendations.push('Create sales records to unlock performance insights.');
  }

  return recommendations.length
    ? recommendations.slice(0, 6)
    : ['Keep monitoring sales, stock, customer dues, and supplier payments weekly.'];
}

export function buildHealthRisks(healthData, scores) {
  const risks = [];

  if (scores.metrics.outOfStockCount > 0) {
    risks.push({
      title: `${scores.metrics.outOfStockCount} products are out of stock.`,
      severity: 'Critical',
    });
  }

  if (scores.metrics.lowStockCount > 0) {
    risks.push({
      title: `${scores.metrics.lowStockCount} products need reorder attention.`,
      severity: 'High',
    });
  }

  if (scores.metrics.customerPendingAmount > 0) {
    risks.push({
      title: `${formatCurrency(scores.metrics.customerPendingAmount)} is pending from customers.`,
      severity: scores.pendingPaymentsScore < 55 ? 'High' : 'Medium',
    });
  }

  if (scores.metrics.supplierDues > 0) {
    risks.push({
      title: `${formatCurrency(scores.metrics.supplierDues)} supplier payment is due.`,
      severity: 'Medium',
    });
  }

  if (scores.metrics.salesGrowthPercentage < 0) {
    risks.push({
      title: `Sales are down ${Math.abs(scores.metrics.salesGrowthPercentage).toFixed(1)}% versus last month.`,
      severity: 'High',
    });
  }

  if (scores.metrics.profitMarginPercentage < 10) {
    risks.push({
      title: 'Profit margin is below 10%.',
      severity: 'High',
    });
  }

  if (scores.metrics.pendingInvoicesCount > 0) {
    risks.push({
      title: `${scores.metrics.pendingInvoicesCount} purchase invoices are pending review.`,
      severity: 'Medium',
    });
  }

  return risks.length ? risks : [{ title: 'No urgent business risks detected from current data.', severity: 'Low' }];
}

export function buildHealthOpportunities(healthData, scores) {
  const paidCustomers = healthData.customers.filter((customer) => toNumber(customer.pendingAmount) <= 0).length;
  const healthyProducts = Math.max(
    0,
    scores.metrics.totalProducts - scores.metrics.lowStockCount - scores.metrics.outOfStockCount,
  );
  const opportunities = [];

  if (scores.metrics.salesGrowthPercentage > 0) {
    opportunities.push(`Sales are growing by ${scores.metrics.salesGrowthPercentage.toFixed(1)}%. Keep supporting fast-moving items.`);
  }

  if (scores.metrics.profitMarginPercentage >= 20) {
    opportunities.push(`Profit margin is healthy at ${formatPercentage(scores.metrics.profitMarginPercentage)}.`);
  }

  if (paidCustomers > 0) {
    opportunities.push(`${paidCustomers} customers currently have no pending dues.`);
  }

  if (healthyProducts > 0) {
    opportunities.push(`${healthyProducts} products have healthy stock availability.`);
  }

  if (!scores.metrics.supplierDues) {
    opportunities.push('Supplier dues are clear, which supports smooth restocking.');
  }

  if (scores.score < 90) {
    opportunities.push('Payment recovery and restocking can move business health closer to 90+.');
  }

  return opportunities.length ? opportunities : ['Add more sales, customer, and inventory activity to reveal opportunities.'];
}

export function buildHealthActionChecklist(healthData, scores) {
  const actions = [];
  const highestPendingCustomer = getHighestPendingCustomer(healthData.customers);
  const highestDueSupplier = getHighestDueSupplier(healthData.suppliers);
  const lowStockProduct = scores.metrics.lowStockProducts?.[0];

  if (highestPendingCustomer?.pendingAmount > 0) {
    actions.push({
      id: 'recover-customer-dues',
      title: `Recover ${formatCurrency(highestPendingCustomer.pendingAmount)} from ${highestPendingCustomer.name}`,
      description: 'Follow up with the highest pending customer first.',
      priority: 'High',
      category: 'Payments',
      completed: false,
      impactPoints: 6,
    });
  }

  if (lowStockProduct) {
    actions.push({
      id: 'restock-low-product',
      title: `Restock ${lowStockProduct.name || lowStockProduct.productName}`,
      description: 'Prevent lost weekend demand from low stock.',
      priority: 'High',
      category: 'Inventory',
      completed: false,
      impactPoints: 4,
    });
  }

  if (scores.metrics.pendingInvoicesCount > 0) {
    actions.push({
      id: 'review-pending-invoices',
      title: `Review ${scores.metrics.pendingInvoicesCount} pending invoices`,
      description: 'Keep purchase records and inventory updates accurate.',
      priority: 'Medium',
      category: 'Invoices',
      completed: false,
      impactPoints: 2,
    });
  }

  if (highestDueSupplier?.paymentDue > 0) {
    actions.push({
      id: 'plan-supplier-payment',
      title: `Plan payment to ${highestDueSupplier.name}`,
      description: `Clear ${formatCurrency(highestDueSupplier.paymentDue)} to maintain supplier trust.`,
      priority: 'Medium',
      category: 'Suppliers',
      completed: false,
      impactPoints: 3,
    });
  }

  if (!scores.metrics.monthlyRevenue) {
    actions.push({
      id: 'add-sales-records',
      title: 'Add this month sales records',
      description: 'Sales entries unlock better revenue and profit scoring.',
      priority: 'Medium',
      category: 'Sales',
      completed: false,
      impactPoints: 5,
    });
  }

  actions.push({
    id: 'generate-monthly-report',
    title: 'Generate monthly business report',
    description: 'Review sales, inventory, dues, and GST in one report.',
    priority: 'Low',
    category: 'Reports',
    completed: false,
    impactPoints: 1,
  });

  return actions.slice(0, 6);
}

export function getHealthEvents(userId, currentHealth, previousSnapshot) {
  const events = [
    {
      title: `Score calculated at ${currentHealth.score}`,
      date: 'Today',
      status: currentHealth.score >= 75 ? 'Positive' : 'Warning',
    },
  ];

  if (previousSnapshot) {
    const trend = getScoreTrend(currentHealth.score, previousSnapshot.score);
    events.push({
      title: trend.value >= 0
        ? `Score improved from ${previousSnapshot.score} to ${currentHealth.score}`
        : `Score declined from ${previousSnapshot.score} to ${currentHealth.score}`,
      date: formatDate(currentHealth.calculatedAt),
      status: trend.value >= 0 ? 'Positive' : 'Warning',
    });
  }

  if (currentHealth.metrics.salesGrowthPercentage > 0) {
    events.push({
      title: `Revenue increased by ${currentHealth.metrics.salesGrowthPercentage.toFixed(1)}%`,
      date: 'This month',
      status: 'Positive',
    });
  }

  if (currentHealth.metrics.lowStockCount > 0) {
    events.push({
      title: `${currentHealth.metrics.lowStockCount} products need restocking`,
      date: 'Today',
      status: 'Warning',
    });
  }

  if (currentHealth.metrics.customerPendingAmount >= 50000) {
    events.push({
      title: `Pending payments crossed ${formatCurrency(50000)}`,
      date: 'Today',
      status: 'Warning',
    });
  }

  if (currentHealth.metrics.newCustomersThisMonth > 0) {
    events.push({
      title: `${currentHealth.metrics.newCustomersThisMonth} new customers added this month`,
      date: 'This month',
      status: 'Positive',
    });
  }

  if (currentHealth.metrics.pendingInvoicesCount > 0) {
    events.push({
      title: `${currentHealth.metrics.pendingInvoicesCount} invoices pending review`,
      date: 'Today',
      status: 'Warning',
    });
  }

  return events.slice(0, 6);
}

export function calculateProjectedScore(baseScore, actions) {
  const increase = Object.values(actions).reduce(
    (sum, action) => sum + (action.enabled ? toNumber(action.value) : 0),
    0,
  );

  return clampScore(toNumber(baseScore) + increase);
}

function buildBreakdown(parts) {
  return [
    {
      key: 'inventoryHealth',
      title: 'Inventory Health',
      score: parts.inventory.score,
      weight: weights.inventoryHealth,
      status: parts.inventory.status,
      insight: parts.inventory.insight,
      iconName: 'Boxes',
    },
    {
      key: 'salesPerformance',
      title: 'Sales Performance',
      score: parts.sales.score,
      weight: weights.salesPerformance,
      status: parts.sales.status,
      insight: parts.sales.insight.replace(String(parts.sales.currentMonthRevenue), formatCurrency(parts.sales.currentMonthRevenue)),
      iconName: 'TrendingUp',
    },
    {
      key: 'pendingPaymentsScore',
      title: 'Pending Payments',
      score: parts.pending.score,
      weight: weights.pendingPaymentsScore,
      status: parts.pending.status,
      insight: parts.pending.insight.replace(String(parts.pending.pendingAmount), formatCurrency(parts.pending.pendingAmount)),
      iconName: 'WalletCards',
    },
    {
      key: 'customerGrowth',
      title: 'Customer Growth',
      score: parts.customers.score,
      weight: weights.customerGrowth,
      status: parts.customers.status,
      insight: parts.customers.insight,
      iconName: 'Users',
    },
    {
      key: 'profitMargin',
      title: 'Profit Margin',
      score: parts.profit.score,
      weight: weights.profitMargin,
      status: parts.profit.status,
      insight: parts.profit.insight,
      iconName: 'IndianRupee',
    },
  ];
}

function buildHealthMetricsTable(healthResult) {
  return [
    ['Business Health Score', `${healthResult.score}/100`, '90/100', healthResult.status, 'High'],
    ['Inventory Health', `${healthResult.inventoryHealth}%`, '95%', healthResult.breakdown[0].status, 'Medium'],
    ['Sales Growth', `${healthResult.metrics.salesGrowthPercentage.toFixed(1)}%`, '+10%', healthResult.breakdown[1].status, 'High'],
    ['Pending Payments', formatCurrency(healthResult.metrics.customerPendingAmount), 'Below 25000', healthResult.breakdown[2].status, 'High'],
    ['Low Stock Items', String(healthResult.metrics.lowStockCount), 'Below 3', healthResult.metrics.lowStockCount ? 'Attention' : 'Healthy', 'Medium'],
    ['Out of Stock Items', String(healthResult.metrics.outOfStockCount), '0', healthResult.metrics.outOfStockCount ? 'Critical' : 'Healthy', 'High'],
    ['Customer Growth', `+${healthResult.metrics.newCustomersThisMonth}`, '+20', healthResult.breakdown[3].status, 'Medium'],
    ['Profit Margin', formatPercentage(healthResult.metrics.profitMarginPercentage), '25%', healthResult.breakdown[4].status, 'Medium'],
    ['Supplier Dues', formatCurrency(healthResult.metrics.supplierDues), 'Below 25000', healthResult.metrics.supplierDues ? 'Needs Action' : 'Healthy', 'Medium'],
    ['Pending Invoices', String(healthResult.metrics.pendingInvoicesCount), '0', healthResult.metrics.pendingInvoicesCount ? 'Attention' : 'Healthy', 'Medium'],
  ];
}

function buildSimulationActions(scores) {
  return {
    recoverPayments: {
      label: 'Recover pending payments',
      value: scores.pendingPaymentsScore < 55 ? 10 : scores.pendingPaymentsScore < 75 ? 6 : 4,
      enabled: false,
    },
    restockProducts: {
      label: 'Restock low stock products',
      value: scores.inventoryHealth < 60 ? 8 : scores.inventoryHealth < 80 ? 5 : 2,
      enabled: false,
    },
    approveInvoices: {
      label: 'Approve pending invoices',
      value: scores.metrics.pendingInvoicesCount > 5 ? 3 : scores.metrics.pendingInvoicesCount > 0 ? 2 : 1,
      enabled: false,
    },
    improveProfit: {
      label: 'Improve profit margin',
      value: scores.profitMargin < 60 ? 5 : 2,
      enabled: false,
    },
    addSales: {
      label: 'Add this month sales',
      value: scores.salesPerformance < 45 ? 6 : 2,
      enabled: false,
    },
  };
}

export async function calculateBusinessHealth(userId, options = {}) {
  try {
    const healthData = options.data || (await loadBusinessHealthData(userId));
    let previousSnapshot = options.previousSnapshot;

    if (previousSnapshot === undefined) {
      try {
        previousSnapshot = await getLatestBusinessHealthSnapshot(userId);
      } catch {
        healthData.warnings = [
          ...(healthData.warnings || []),
          'Business health snapshot history could not be loaded.',
        ];
        previousSnapshot = null;
      }
    }

    const inventory = calculateInventoryHealth(healthData.products);
    const sales = calculateSalesPerformance(healthData.sales);
    const pending = calculatePendingPaymentsScore(healthData.customers, healthData.sales);
    const customers = calculateCustomerGrowth(healthData.customers);
    const profit = calculateProfitMarginScore(healthData.sales);
    const pendingInvoicesCount = healthData.purchaseInvoices.filter((invoice) =>
      ['Pending Review', 'Processing'].includes(invoice.status),
    ).length;
    const componentScores = {
      inventoryHealth: inventory.score,
      salesPerformance: sales.score,
      pendingPaymentsScore: pending.score,
      customerGrowth: customers.score,
      profitMargin: profit.score,
    };
    const score = calculateOverallBusinessHealth(componentScores);
    const metrics = {
      totalProducts: inventory.totalProducts,
      lowStockCount: inventory.lowStockCount,
      outOfStockCount: inventory.outOfStockCount,
      healthyStockCount: inventory.healthyStockCount,
      inventoryValue: inventory.inventoryValue,
      lowStockProducts: inventory.lowStockProducts,
      outOfStockProducts: inventory.outOfStockProducts,
      monthlyRevenue: sales.currentMonthRevenue,
      previousMonthlyRevenue: sales.previousMonthRevenue,
      salesGrowthPercentage: sales.salesGrowthPercentage,
      todaySales: sales.todaySales,
      customerPendingAmount: pending.customerPendingAmount || pending.salesDueAmount,
      salesDueAmount: pending.salesDueAmount,
      supplierDues: calculateSupplierDues(healthData.suppliers),
      totalCustomers: customers.totalCustomers,
      newCustomersThisMonth: customers.newCustomersThisMonth,
      totalProfit: profit.totalProfit,
      profitMarginPercentage: profit.profitMarginPercentage,
      pendingInvoicesCount,
    };
    const partialResult = {
      score,
      ...componentScores,
      metrics,
    };
    const breakdown = buildBreakdown({
      inventory,
      sales,
      pending,
      customers,
      profit,
    });
    const recommendations = buildHealthRecommendations(healthData, partialResult);
    const risks = buildHealthRisks(healthData, partialResult);
    const opportunities = buildHealthOpportunities(healthData, partialResult);
    const actionChecklist = buildHealthActionChecklist(healthData, partialResult);
    const calculatedAt = new Date().toISOString();
    const trend = getScoreTrend(score, previousSnapshot?.score);
    const result = {
      score,
      status: getHealthStatus(score),
      trend,
      previousScore: previousSnapshot?.score ?? null,
      inventoryHealth: inventory.score,
      salesPerformance: sales.score,
      pendingPaymentsScore: pending.score,
      customerGrowth: customers.score,
      profitMargin: profit.score,
      metrics,
      metricsTable: [],
      breakdown,
      recommendations,
      risks,
      opportunities,
      actionChecklist,
      events: [],
      warnings: healthData.warnings || [],
      calculatedAt,
      simulationActions: buildSimulationActions(partialResult),
    };

    result.metricsTable = buildHealthMetricsTable(result);
    result.events = getHealthEvents(userId, result, previousSnapshot);

    return result;
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not calculate business health.');
  }
}

export async function saveBusinessHealthSnapshot(userId, healthResult) {
  const now = new Date().toISOString();

  try {
    const created = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
      ID.unique(),
      {
        userId,
        score: healthResult.score,
        status: healthResult.status,
        inventoryHealth: healthResult.inventoryHealth,
        salesPerformance: healthResult.salesPerformance,
        pendingPaymentsScore: healthResult.pendingPaymentsScore,
        customerGrowth: healthResult.customerGrowth,
        profitMargin: healthResult.profitMargin,
        recommendationsJson: JSON.stringify({
          recommendations: healthResult.recommendations,
          actionChecklist: healthResult.actionChecklist,
          metrics: {
            ...healthResult.metrics,
            lowStockProducts: undefined,
            outOfStockProducts: undefined,
          },
          calculatedAt: healthResult.calculatedAt,
        }),
        risksJson: JSON.stringify(healthResult.risks),
        opportunitiesJson: JSON.stringify(healthResult.opportunities),
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    return normalizeHealthSnapshot(created);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save health snapshot.');
  }
}

export async function listBusinessHealthSnapshots(userId, options = {}) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || collectionLimits.snapshots),
      ],
    );

    return response.documents.map(normalizeHealthSnapshot);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load business health snapshots.');
  }
}

export async function getLatestBusinessHealthSnapshot(userId) {
  const snapshots = await listBusinessHealthSnapshots(userId, { limit: 1 });
  return snapshots[0] || null;
}

export async function deleteBusinessHealthSnapshot(userId, snapshotId) {
  try {
    const snapshot = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
      snapshotId,
    );

    assertOwnsDocument(snapshot, userId, 'Snapshot');

    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
      snapshotId,
    );

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete health snapshot.');
  }
}
