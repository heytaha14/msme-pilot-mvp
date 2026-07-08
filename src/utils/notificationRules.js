import { formatCurrency } from './formatters.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isThisMonth(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const start = startOfMonth();
  return parsed >= start && parsed <= new Date();
}

function activeSales(sales = []) {
  return sales.filter((sale) => sale.paymentStatus !== 'Cancelled');
}

function baseNotification(notification) {
  const timestamp = nowIso();
  const next = {
    status: 'Unread',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...notification,
  };

  return {
    ...next,
    priority: getNotificationPriority(next),
    routeTarget: getNotificationRouteTarget(next),
    fingerprint: getNotificationFingerprint(next),
  };
}

export function getNotificationPriority(notification) {
  if (notification.priority) return notification.priority;

  if (notification.type === 'Low Stock' && notification.title?.toLowerCase().includes('out of stock')) {
    return 'Critical';
  }

  if (['Payment Due', 'Business Health'].includes(notification.type)) {
    return 'High';
  }

  if (['Invoice', 'Inventory', 'Supplier', 'Sales'].includes(notification.type)) {
    return 'Medium';
  }

  return 'Low';
}

export function getNotificationRouteTarget(notification) {
  if (notification.routeTarget) return notification.routeTarget;

  const routes = {
    'Low Stock': '/inventory',
    Inventory: '/inventory',
    Customer: '/customers',
    'Payment Due': '/customers',
    Supplier: '/suppliers',
    Invoice: '/invoices',
    Sales: '/sales',
    'Business Health': '/business-health',
    GST: '/reports',
    Report: '/reports',
  };

  return routes[notification.type] || '/dashboard';
}

export function getNotificationFingerprint(notification) {
  return [
    notification.type,
    notification.relatedEntityType || '',
    notification.relatedEntityId || '',
    notification.title,
  ]
    .join('|')
    .toLowerCase();
}

export function dedupeNotifications(notifications = []) {
  const seen = new Set();
  return notifications.filter((notification) => {
    const fingerprint = notification.fingerprint || getNotificationFingerprint(notification);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export function buildLowStockNotifications(products = []) {
  return products.flatMap((product) => {
    const stock = toNumber(product.stock ?? product.currentStock);
    const minStock = toNumber(product.minStock ?? product.minimumStock);
    const name = product.name || product.productName || 'Product';
    const productId = product.$id || product.id;
    const unit = product.unit || 'units';

    if (stock <= 0) {
      return baseNotification({
        title: `${name} is out of stock`,
        message: `${name} has 0 units left. Restock immediately.`,
        type: 'Low Stock',
        priority: 'Critical',
        actionLabel: 'View Inventory',
        routeTarget: '/inventory',
        relatedEntityType: 'product',
        relatedEntityId: productId,
      });
    }

    if (stock <= minStock) {
      return baseNotification({
        title: `${name} stock is low`,
        message: `${name} has ${stock} ${unit} left against minimum stock of ${minStock}.`,
        type: 'Low Stock',
        priority: 'High',
        actionLabel: 'Reorder',
        routeTarget: '/inventory',
        relatedEntityType: 'product',
        relatedEntityId: productId,
      });
    }

    return [];
  });
}

export function buildCustomerPaymentNotifications(customers = []) {
  return customers.flatMap((customer) => {
    const pendingAmount = toNumber(customer.pendingAmount);
    const customerId = customer.$id || customer.id;

    if (customer.paymentStatus === 'Overdue' && pendingAmount > 0) {
      return baseNotification({
        title: `${customer.name} payment overdue`,
        message: `${customer.name} has overdue payment of ${formatCurrency(pendingAmount)}.`,
        type: 'Payment Due',
        priority: 'Critical',
        actionLabel: 'Follow Up',
        routeTarget: '/customers',
        relatedEntityType: 'customer',
        relatedEntityId: customerId,
      });
    }

    if (pendingAmount > 10000) {
      return baseNotification({
        title: `${customer.name} payment pending`,
        message: `${customer.name} has ${formatCurrency(pendingAmount)} pending payment.`,
        type: 'Customer',
        priority: 'High',
        actionLabel: 'Send Reminder',
        routeTarget: '/customers',
        relatedEntityType: 'customer',
        relatedEntityId: customerId,
      });
    }

    return [];
  });
}

export function buildSupplierPaymentNotifications(suppliers = []) {
  return suppliers
    .filter((supplier) => toNumber(supplier.paymentDue) > 0)
    .map((supplier) => {
      const paymentDue = toNumber(supplier.paymentDue);
      const isOverdue = supplier.paymentStatus === 'Overdue';

      return baseNotification({
        title: isOverdue
          ? `${supplier.name} supplier payment overdue`
          : `${supplier.name} supplier payment due`,
        message: `${supplier.name} has ${formatCurrency(paymentDue)} supplier payment due.`,
        type: 'Supplier',
        priority: isOverdue ? 'Critical' : paymentDue >= 10000 ? 'High' : 'Medium',
        actionLabel: 'View Supplier',
        routeTarget: '/suppliers',
        relatedEntityType: 'supplier',
        relatedEntityId: supplier.$id || supplier.id,
      });
    });
}

export function buildInvoiceNotifications(invoices = []) {
  return invoices.flatMap((invoice) => {
    const invoiceId = invoice.$id || invoice.id;

    if (invoice.status === 'Pending Review') {
      return baseNotification({
        title: `Invoice ${invoice.invoiceNumber} needs review`,
        message: `${invoice.supplierName} invoice worth ${formatCurrency(invoice.totalAmount)} is pending review.`,
        type: 'Invoice',
        priority: 'Medium',
        actionLabel: 'Review Invoice',
        routeTarget: '/invoices',
        relatedEntityType: 'purchase_invoice',
        relatedEntityId: invoiceId,
      });
    }

    if (invoice.status === 'Failed OCR') {
      return baseNotification({
        title: `OCR failed for invoice ${invoice.invoiceNumber}`,
        message: `Invoice from ${invoice.supplierName} could not be read clearly.`,
        type: 'Invoice',
        priority: 'High',
        actionLabel: 'Review Manually',
        routeTarget: '/invoices',
        relatedEntityType: 'purchase_invoice',
        relatedEntityId: invoiceId,
      });
    }

    if (invoice.status === 'Approved' && invoice.inventoryUpdated === false) {
      return baseNotification({
        title: 'Approved invoice not synced to inventory',
        message: `${invoice.invoiceNumber} is approved but inventory update is not completed.`,
        type: 'Inventory',
        priority: 'Medium',
        actionLabel: 'View Invoice',
        routeTarget: '/invoices',
        relatedEntityType: 'purchase_invoice',
        relatedEntityId: invoiceId,
      });
    }

    return [];
  });
}

export function buildSalesNotifications(sales = []) {
  const currentMonthSales = sales.filter((sale) => isThisMonth(sale.saleDate));
  const totalDue = activeSales(sales)
    .filter((sale) => ['Pending', 'Partial'].includes(sale.paymentStatus))
    .reduce((sum, sale) => sum + toNumber(sale.dueAmount), 0);
  const cancelledCount = sales.filter((sale) => sale.paymentStatus === 'Cancelled').length;
  const notifications = [];

  if (totalDue > 0) {
    notifications.push(baseNotification({
      title: 'Sales payments pending',
      message: `${formatCurrency(totalDue)} is pending from sales invoices.`,
      type: 'Sales',
      priority: totalDue >= 50000 ? 'High' : 'Medium',
      actionLabel: 'View Sales',
      routeTarget: '/sales',
      relatedEntityType: 'sales',
      relatedEntityId: 'sales-due',
    }));
  }

  if (!currentMonthSales.length) {
    notifications.push(baseNotification({
      title: 'No sales recorded this month',
      message: 'Add sales records to track revenue, profit, and GST.',
      type: 'Sales',
      priority: 'Medium',
      actionLabel: 'Create Sale',
      routeTarget: '/sales',
      relatedEntityType: 'sales',
      relatedEntityId: 'no-current-month-sales',
    }));
  }

  if (cancelledCount > 0) {
    notifications.push(baseNotification({
      title: `${cancelledCount} cancelled sales found`,
      message: 'Review cancelled sales to keep reports accurate.',
      type: 'Sales',
      priority: 'Low',
      actionLabel: 'View Sales',
      routeTarget: '/sales',
      relatedEntityType: 'sales',
      relatedEntityId: 'cancelled-sales',
    }));
  }

  return notifications;
}

export function buildBusinessHealthNotifications(healthSnapshots = []) {
  const [latest, previous] = healthSnapshots;
  if (!latest) return [];

  const notifications = [];
  const score = toNumber(latest.score);
  const previousScore = previous ? toNumber(previous.score) : null;

  if (score < 40) {
    notifications.push(baseNotification({
      title: 'Business health is critical',
      message: `Your business health score is ${score}/100. Immediate action is needed.`,
      type: 'Business Health',
      priority: 'Critical',
      actionLabel: 'View Score',
      routeTarget: '/business-health',
      relatedEntityType: 'business_health_snapshot',
      relatedEntityId: latest.$id || latest.id,
    }));
  } else if (score < 60) {
    notifications.push(baseNotification({
      title: 'Business health needs attention',
      message: `Your score is ${score}/100. Review risks and recommended actions.`,
      type: 'Business Health',
      priority: 'High',
      actionLabel: 'View Score',
      routeTarget: '/business-health',
      relatedEntityType: 'business_health_snapshot',
      relatedEntityId: latest.$id || latest.id,
    }));
  }

  if (previousScore !== null && score > previousScore) {
    notifications.push(baseNotification({
      title: 'Business health improved',
      message: `Your score improved from ${previousScore} to ${score}.`,
      type: 'Business Health',
      priority: 'Low',
      actionLabel: 'View Score',
      routeTarget: '/business-health',
      relatedEntityType: 'business_health_snapshot',
      relatedEntityId: latest.$id || latest.id,
    }));
  }

  return notifications;
}

export function buildGstNotifications(sales = [], purchaseInvoices = []) {
  const monthlySales = sales.filter((sale) => isThisMonth(sale.saleDate) && sale.paymentStatus !== 'Cancelled');
  const monthlyInvoices = purchaseInvoices.filter((invoice) => isThisMonth(invoice.invoiceDate));

  if (!monthlySales.length && !monthlyInvoices.length) return [];

  const gstCollected = monthlySales.reduce((sum, sale) => sum + toNumber(sale.gstAmount), 0);
  const message = gstCollected >= 25000
    ? `GST estimate is ready. Estimated GST collected is ${formatCurrency(gstCollected)} from this month's sales.`
    : "GST estimate is available from this month's sales and purchase invoices.";

  return [baseNotification({
    title: 'GST summary ready',
    message,
    type: 'GST',
    priority: gstCollected >= 25000 ? 'Medium' : 'Low',
    actionLabel: 'View GST Summary',
    routeTarget: '/reports',
    relatedEntityType: 'gst_summary',
    relatedEntityId: new Date().toISOString().slice(0, 7),
  })];
}

export function buildReportNotifications(reports = [], data = {}) {
  const hasReportThisMonth = reports.some((report) =>
    isThisMonth(report.generatedAt || report.createdAt || report.$createdAt),
  );
  const hasBusinessData = Boolean(
    data.sales?.length ||
      data.products?.length ||
      data.customers?.length ||
      data.suppliers?.length ||
      data.purchaseInvoices?.length,
  );

  if (hasReportThisMonth) {
    const latest = reports[0];
    return [baseNotification({
      title: 'Monthly report generated',
      message: `${latest.reportName || 'A business report'} is available for review.`,
      type: 'Report',
      priority: 'Low',
      actionLabel: 'View Report',
      routeTarget: '/reports',
      relatedEntityType: 'generated_report',
      relatedEntityId: latest.$id || latest.id,
    })];
  }

  if (hasBusinessData) {
    return [baseNotification({
      title: 'Monthly report not generated yet',
      message: 'Generate your monthly business report to review performance.',
      type: 'Report',
      priority: 'Low',
      actionLabel: 'Generate Report',
      routeTarget: '/reports',
      relatedEntityType: 'generated_report',
      relatedEntityId: 'monthly-report-missing',
    })];
  }

  return [];
}

export function buildAllBusinessNotifications(data = {}) {
  return dedupeNotifications([
    ...buildLowStockNotifications(data.products || []),
    ...buildCustomerPaymentNotifications(data.customers || []),
    ...buildSupplierPaymentNotifications(data.suppliers || []),
    ...buildInvoiceNotifications(data.purchaseInvoices || []),
    ...buildSalesNotifications(data.sales || []),
    ...buildBusinessHealthNotifications(data.healthSnapshots || []),
    ...buildGstNotifications(data.sales || [], data.purchaseInvoices || []),
    ...buildReportNotifications(data.generatedReports || [], data),
  ]);
}
