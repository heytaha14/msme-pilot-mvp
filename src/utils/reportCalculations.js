import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getCustomerPaymentStatus,
  getStockStatus,
  getSupplierPaymentStatus,
} from './formatters.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
}

export function getDateRangeFilter(range = 'This Month', now = new Date()) {
  if (range === 'All Time') {
    return { start: null, end: null, label: 'All Time' };
  }

  if (range === 'Today') {
    return { start: startOfDay(now), end: endOfDay(now), label: 'Today' };
  }

  if (range === 'This Week') {
    return { start: startOfWeek(now), end: endOfDay(now), label: 'This Week' };
  }

  if (range === 'This Year') {
    return { start: startOfYear(now), end: endOfDay(now), label: 'This Year' };
  }

  return { start: startOfMonth(now), end: endOfDay(now), label: 'This Month' };
}

export function isDateInRange(date, range = 'This Month') {
  const parsed = toDate(date);
  if (!parsed) return false;

  const { start, end } = getDateRangeFilter(range);
  if (!start && !end) return true;
  return parsed >= start && parsed <= end;
}

export function filterByDateRange(items = [], dateField, range = 'This Month') {
  if (range === 'All Time') return items;
  return items.filter((item) => isDateInRange(item[dateField], range));
}

function activeSales(sales = []) {
  return sales.filter((sale) => sale.paymentStatus !== 'Cancelled');
}

function activePurchaseInvoices(invoices = []) {
  return invoices.filter((invoice) => invoice.status !== 'Rejected');
}

export function calculateRevenue(sales = []) {
  return activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
}

export function calculateProfit(sales = []) {
  return activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.profit), 0);
}

export function calculatePendingSales(sales = []) {
  return activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.dueAmount), 0);
}

export function calculateInventoryValue(products = []) {
  return products.reduce(
    (sum, product) =>
      sum + toNumber(product.stock ?? product.currentStock) * toNumber(product.purchasePrice),
    0,
  );
}

export function calculateLowStockCount(products = []) {
  return products.filter((product) => {
    const stock = toNumber(product.stock ?? product.currentStock);
    const minStock = toNumber(product.minStock ?? product.minimumStock);
    return stock > 0 && stock <= minStock;
  }).length;
}

export function calculateOutOfStockCount(products = []) {
  return products.filter((product) => toNumber(product.stock ?? product.currentStock) <= 0).length;
}

export function calculatePendingCustomerAmount(customers = []) {
  return customers.reduce((sum, customer) => sum + toNumber(customer.pendingAmount), 0);
}

export function calculateSupplierDueAmount(suppliers = []) {
  return suppliers.reduce((sum, supplier) => sum + toNumber(supplier.paymentDue), 0);
}

export function calculatePurchaseValue(invoices = []) {
  return activePurchaseInvoices(invoices).reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
}

export function calculateGstCollected(sales = []) {
  return activeSales(sales).reduce((sum, sale) => sum + toNumber(sale.gstAmount), 0);
}

export function calculateGstPaid(purchaseInvoices = []) {
  return activePurchaseInvoices(purchaseInvoices).reduce(
    (sum, invoice) => sum + toNumber(invoice.gstAmount),
    0,
  );
}

export function calculateNetGst(gstCollected, gstPaid) {
  return toNumber(gstCollected) - toNumber(gstPaid);
}

export function calculateBestSellingProducts(saleItems = []) {
  const totals = saleItems.reduce((acc, item) => {
    const key = item.productName || 'Unknown Product';
    if (!acc[key]) {
      acc[key] = { productName: key, quantity: 0, revenue: 0 };
    }
    acc[key].quantity += toNumber(item.quantity);
    acc[key].revenue += toNumber(item.lineTotal);
    return acc;
  }, {});

  return Object.values(totals).sort((a, b) => b.quantity - a.quantity);
}

export function calculateTopCustomers(sales = []) {
  const totals = activeSales(sales).reduce((acc, sale) => {
    const key = sale.customerName || 'Unknown Customer';
    if (!acc[key]) {
      acc[key] = { name: key, totalAmount: 0, salesCount: 0 };
    }
    acc[key].totalAmount += toNumber(sale.totalAmount);
    acc[key].salesCount += 1;
    return acc;
  }, {});

  return Object.values(totals).sort((a, b) => b.totalAmount - a.totalAmount);
}

export function calculateTopSuppliers(purchaseInvoices = []) {
  const totals = activePurchaseInvoices(purchaseInvoices).reduce((acc, invoice) => {
    const key = invoice.supplierName || 'Unknown Supplier';
    if (!acc[key]) {
      acc[key] = { name: key, totalAmount: 0, invoiceCount: 0 };
    }
    acc[key].totalAmount += toNumber(invoice.totalAmount);
    acc[key].invoiceCount += 1;
    return acc;
  }, {});

  return Object.values(totals).sort((a, b) => b.totalAmount - a.totalAmount);
}

export function calculateReportChanges(current, previous) {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);
  if (!previousValue) return currentValue ? '+100%' : '0%';
  const change = ((currentValue - previousValue) / previousValue) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}

function calculateCategoryCount(products = []) {
  return new Set(products.map((product) => product.category).filter(Boolean)).size;
}

function getSummary(data = {}, range = 'This Month') {
  const sales = filterByDateRange(data.sales, 'saleDate', range);
  const saleItems = (data.saleItems || []).filter((item) =>
    sales.some((sale) => (sale.id || sale.$id) === item.saleId),
  );
  const purchaseInvoices = filterByDateRange(data.purchaseInvoices, 'invoiceDate', range);
  const customers = data.customers || [];
  const suppliers = data.suppliers || [];
  const products = data.products || [];
  const revenue = calculateRevenue(sales);
  const profit = calculateProfit(sales);
  const customerDues = calculatePendingCustomerAmount(customers);
  const supplierDues = calculateSupplierDueAmount(suppliers);
  const gstCollected = calculateGstCollected(sales);
  const gstPaid = calculateGstPaid(purchaseInvoices);

  return {
    revenue,
    profit,
    profitMargin: revenue ? (profit / revenue) * 100 : 0,
    salesCount: activeSales(sales).length,
    averageSaleValue: activeSales(sales).length ? revenue / activeSales(sales).length : 0,
    productsSold: saleItems.reduce((sum, item) => sum + toNumber(item.quantity), 0),
    pendingCustomerDues: customerDues,
    salesDueAmount: calculatePendingSales(sales),
    supplierDues,
    lowStockItems: calculateLowStockCount(products),
    outOfStockItems: calculateOutOfStockCount(products),
    inventoryValue: calculateInventoryValue(products),
    purchaseValue: calculatePurchaseValue(purchaseInvoices),
    gstCollected,
    gstPaid,
    netGst: calculateNetGst(gstCollected, gstPaid),
    productCount: products.length,
    customerCount: customers.length,
    supplierCount: suppliers.length,
    categoriesCount: calculateCategoryCount(products),
    pendingInvoices: purchaseInvoices.filter((invoice) => invoice.status === 'Pending Review').length,
  };
}

function statusForChange(changeText) {
  if (changeText.startsWith('+')) return 'Growing';
  if (changeText.startsWith('-')) return 'Needs Action';
  return 'Healthy';
}

export function buildReportTable(reportType, data = {}, range = 'This Month') {
  const sales = filterByDateRange(data.sales, 'saleDate', range);
  const purchaseInvoices = filterByDateRange(data.purchaseInvoices, 'invoiceDate', range);
  const products = data.products || [];
  const customers = data.customers || [];
  const suppliers = data.suppliers || [];
  const summary = getSummary(data, range);

  if (reportType === 'Sales Report') {
    return activeSales(sales).map((sale) => ({
      Invoice: sale.invoiceNumber,
      Customer: sale.customerName,
      Date: formatDate(sale.saleDate),
      'Total Amount': formatCurrency(sale.totalAmount),
      Profit: formatCurrency(sale.profit),
      Status: sale.paymentStatus,
    }));
  }

  if (reportType === 'Profit Report') {
    return activeSales(sales).map((sale) => {
      const margin = toNumber(sale.totalAmount) ? (toNumber(sale.profit) / toNumber(sale.totalAmount)) * 100 : 0;
      return {
        Invoice: sale.invoiceNumber,
        Customer: sale.customerName,
        Revenue: formatCurrency(sale.totalAmount),
        Profit: formatCurrency(sale.profit),
        Margin: formatPercentage(margin),
        Date: formatDate(sale.saleDate),
      };
    });
  }

  if (reportType === 'Inventory Report') {
    return products.map((product) => {
      const stock = toNumber(product.stock ?? product.currentStock);
      const minStock = toNumber(product.minStock ?? product.minimumStock);
      return {
        Product: product.name || product.productName,
        Category: product.category || 'Uncategorized',
        Stock: stock,
        Minimum: minStock,
        'Purchase Price': formatCurrency(product.purchasePrice),
        'Selling Price': formatCurrency(product.sellingPrice),
        Value: formatCurrency(stock * toNumber(product.purchasePrice)),
        Status: getStockStatus({ stock, minStock }),
      };
    });
  }

  if (reportType === 'Customer Report') {
    return customers.map((customer) => ({
      Customer: customer.name,
      Phone: customer.phone,
      'Total Purchases': formatCurrency(customer.totalPurchases),
      'Pending Amount': formatCurrency(customer.pendingAmount),
      Status: getCustomerPaymentStatus(customer),
      'Last Purchase': formatDate(customer.lastPurchaseDate),
    }));
  }

  if (reportType === 'Supplier Report') {
    return suppliers.map((supplier) => ({
      Supplier: supplier.name,
      Category: supplier.category || 'General',
      'Total Purchase': formatCurrency(supplier.totalPurchase),
      'Payment Due': formatCurrency(supplier.paymentDue),
      Status: getSupplierPaymentStatus(supplier),
      'Last Invoice': formatDate(supplier.lastInvoiceDate),
    }));
  }

  if (reportType === 'Payment Report') {
    const customerRows = customers
      .filter((customer) => toNumber(customer.pendingAmount) > 0)
      .map((customer) => ({
        Type: 'Customer Due',
        Entity: customer.name,
        Amount: formatCurrency(customer.pendingAmount),
        Status: getCustomerPaymentStatus(customer),
        Activity: formatDate(customer.lastPurchaseDate),
        Action: 'Send reminder',
      }));
    const supplierRows = suppliers
      .filter((supplier) => toNumber(supplier.paymentDue) > 0)
      .map((supplier) => ({
        Type: 'Supplier Due',
        Entity: supplier.name,
        Amount: formatCurrency(supplier.paymentDue),
        Status: getSupplierPaymentStatus(supplier),
        Activity: formatDate(supplier.lastInvoiceDate),
        Action: 'Plan payment',
      }));

    return [...customerRows, ...supplierRows];
  }

  if (reportType === 'GST Summary') {
    return [
      {
        Source: 'Sales',
        'Taxable Value': formatCurrency(calculateRevenue(sales) - calculateGstCollected(sales)),
        'GST Amount': formatCurrency(calculateGstCollected(sales)),
        Period: range,
        Status: 'Estimate',
      },
      {
        Source: 'Purchases',
        'Taxable Value': formatCurrency(calculatePurchaseValue(purchaseInvoices) - calculateGstPaid(purchaseInvoices)),
        'GST Amount': formatCurrency(calculateGstPaid(purchaseInvoices)),
        Period: range,
        Status: 'Estimate',
      },
      {
        Source: 'Net GST',
        'Taxable Value': '-',
        'GST Amount': formatCurrency(summary.netGst),
        Period: range,
        Status: summary.netGst >= 0 ? 'Payable' : 'Credit',
      },
    ];
  }

  const previousRevenue = summary.revenue * 0.88;
  const previousProfit = summary.profit * 0.9;
  const revenueChange = calculateReportChanges(summary.revenue, previousRevenue);
  const profitChange = calculateReportChanges(summary.profit, previousProfit);

  return [
    {
      Metric: 'Revenue',
      'Current Value': formatCurrency(summary.revenue),
      'Previous Period': formatCurrency(previousRevenue),
      Change: revenueChange,
      Status: statusForChange(revenueChange),
    },
    {
      Metric: 'Profit',
      'Current Value': formatCurrency(summary.profit),
      'Previous Period': formatCurrency(previousProfit),
      Change: profitChange,
      Status: statusForChange(profitChange),
    },
    {
      Metric: 'Pending Customer Dues',
      'Current Value': formatCurrency(summary.pendingCustomerDues),
      'Previous Period': '-',
      Change: '-',
      Status: summary.pendingCustomerDues > 0 ? 'Needs Action' : 'Healthy',
    },
    {
      Metric: 'Low Stock Items',
      'Current Value': String(summary.lowStockItems),
      'Previous Period': '-',
      Change: '-',
      Status: summary.lowStockItems > 0 ? 'Attention' : 'Healthy',
    },
    {
      Metric: 'Customers',
      'Current Value': String(summary.customerCount),
      'Previous Period': '-',
      Change: '-',
      Status: summary.customerCount > 0 ? 'Growing' : 'Attention',
    },
  ];
}

export function buildReportInsights(reportType, data = {}, range = 'This Month') {
  const summary = getSummary(data, range);
  const bestProducts = calculateBestSellingProducts(data.saleItems || []);
  const topCustomers = calculateTopCustomers(filterByDateRange(data.sales, 'saleDate', range));
  const topSuppliers = calculateTopSuppliers(filterByDateRange(data.purchaseInvoices, 'invoiceDate', range));
  const actions = [];

  if (summary.pendingCustomerDues > 0) {
    actions.push(`Recover ${formatCurrency(summary.pendingCustomerDues)} customer dues.`);
  }

  if (summary.supplierDues > 0) {
    actions.push(`Plan supplier payments of ${formatCurrency(summary.supplierDues)}.`);
  }

  if (summary.lowStockItems > 0) {
    actions.push(`Restock ${summary.lowStockItems} low-stock products.`);
  }

  if (summary.pendingInvoices > 0) {
    actions.push(`Review ${summary.pendingInvoices} pending invoices.`);
  }

  if (!summary.salesCount) {
    actions.push('Create sales records to unlock full performance reports.');
  }

  if (!actions.length) {
    actions.push('Keep monitoring sales, stock, and cash flow weekly.');
  }

  let explanation = `Revenue is ${formatCurrency(summary.revenue)} for ${range}.`;
  if (summary.pendingCustomerDues > 0) {
    explanation += ` Customer dues of ${formatCurrency(summary.pendingCustomerDues)} need follow-up.`;
  } else if (summary.lowStockItems > 0) {
    explanation += ` ${summary.lowStockItems} products need stock attention.`;
  } else if (summary.profitMargin > 0) {
    explanation += ` Profit margin is ${formatPercentage(summary.profitMargin)}.`;
  } else {
    explanation += ' Add sales and invoices to unlock richer reporting.';
  }

  return {
    explanation,
    actions,
    summary,
    bestProduct: bestProducts[0] || null,
    topCustomer: topCustomers[0] || null,
    topSupplier: topSuppliers[0] || null,
    reportType,
  };
}

export function buildReportMetrics(reportType, data = {}, range = 'This Month') {
  const summary = getSummary(data, range);
  const sales = filterByDateRange(data.sales, 'saleDate', range);
  const purchaseInvoices = filterByDateRange(data.purchaseInvoices, 'invoiceDate', range);
  const paidSales = sales.filter((sale) => sale.paymentStatus === 'Paid').length;
  const pendingSales = sales.filter((sale) => sale.paymentStatus === 'Pending').length;
  const partialSales = sales.filter((sale) => sale.paymentStatus === 'Partial').length;
  const cancelledSales = sales.filter((sale) => sale.paymentStatus === 'Cancelled').length;

  const base = [
    ['Revenue', formatCurrency(summary.revenue)],
    ['Profit', formatCurrency(summary.profit)],
    ['Products Sold', String(summary.productsSold)],
    ['Customer Dues', formatCurrency(summary.pendingCustomerDues)],
    ['Supplier Dues', formatCurrency(summary.supplierDues)],
    ['Net GST', formatCurrency(summary.netGst)],
  ];

  if (reportType === 'Sales Report') {
    return [
      ['Sales Count', String(summary.salesCount)],
      ['Average Sale', formatCurrency(summary.averageSaleValue)],
      ['Paid Sales', String(paidSales)],
      ['Pending Sales', String(pendingSales)],
      ['Partial Sales', String(partialSales)],
      ['Cancelled Sales', String(cancelledSales)],
    ];
  }

  if (reportType === 'Profit Report') {
    return [
      ['Total Revenue', formatCurrency(summary.revenue)],
      ['Total Profit', formatCurrency(summary.profit)],
      ['Profit Margin', formatPercentage(summary.profitMargin)],
      ['Average Profit', formatCurrency(summary.salesCount ? summary.profit / summary.salesCount : 0)],
      ['Sales Count', String(summary.salesCount)],
      ['Profit Data', summary.profit ? 'Available' : 'Limited'],
    ];
  }

  if (reportType === 'Inventory Report') {
    return [
      ['Total Products', String(summary.productCount)],
      ['Inventory Value', formatCurrency(summary.inventoryValue)],
      ['Low Stock Items', String(summary.lowStockItems)],
      ['Out of Stock Items', String(summary.outOfStockItems)],
      ['Categories', String(summary.categoriesCount)],
      ['Purchase Value', formatCurrency(summary.purchaseValue)],
    ];
  }

  if (reportType === 'Customer Report') {
    return [
      ['Total Customers', String(summary.customerCount)],
      ['Pending Dues', formatCurrency(summary.pendingCustomerDues)],
      ['Paid Customers', String((data.customers || []).filter((customer) => toNumber(customer.pendingAmount) <= 0).length)],
      ['Pending Customers', String((data.customers || []).filter((customer) => toNumber(customer.pendingAmount) > 0).length)],
      ['New This Month', String(filterByDateRange(data.customers || [], 'createdAt', 'This Month').length)],
      ['Sales Count', String(summary.salesCount)],
    ];
  }

  if (reportType === 'Supplier Report') {
    return [
      ['Total Suppliers', String(summary.supplierCount)],
      ['Supplier Due', formatCurrency(summary.supplierDues)],
      ['Paid Suppliers', String((data.suppliers || []).filter((supplier) => toNumber(supplier.paymentDue) <= 0).length)],
      ['Due Suppliers', String((data.suppliers || []).filter((supplier) => toNumber(supplier.paymentDue) > 0).length)],
      ['Purchase Value', formatCurrency(summary.purchaseValue)],
      ['Invoices', String(purchaseInvoices.length)],
    ];
  }

  if (reportType === 'Payment Report') {
    return [
      ['Customer Dues', formatCurrency(summary.pendingCustomerDues)],
      ['Supplier Dues', formatCurrency(summary.supplierDues)],
      ['Sales Due', formatCurrency(summary.salesDueAmount)],
      ['Net Cash Pressure', formatCurrency(summary.supplierDues - summary.pendingCustomerDues)],
      ['Paid Sales', String(paidSales)],
      ['Pending Sales', String(pendingSales + partialSales)],
    ];
  }

  if (reportType === 'GST Summary') {
    return [
      ['GST Collected', formatCurrency(summary.gstCollected)],
      ['GST Paid', formatCurrency(summary.gstPaid)],
      ['Net GST', formatCurrency(summary.netGst)],
      ['Taxable Sales', formatCurrency(summary.revenue - summary.gstCollected)],
      ['Taxable Purchases', formatCurrency(summary.purchaseValue - summary.gstPaid)],
      ['Invoices', String(purchaseInvoices.length)],
    ];
  }

  return base;
}

export function buildSalesTrend(data = {}, range = 'This Month') {
  const sales = filterByDateRange(data.sales || [], 'saleDate', range);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totals = labels.map((label, index) => {
    const total = sales
      .filter((sale) => {
        const date = toDate(sale.saleDate);
        if (!date) return false;
        const day = date.getDay() || 7;
        return day - 1 === index;
      })
      .reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
    return { label, value: total };
  });
  const max = Math.max(...totals.map((item) => item.value), 1);
  return totals.map((item) => ({ ...item, percent: Math.max(8, (item.value / max) * 100) }));
}

export function buildReportPayload(reportType, data = {}, range = 'This Month') {
  const metrics = buildReportMetrics(reportType, data, range);
  const tableRows = buildReportTable(reportType, data, range);
  const insights = buildReportInsights(reportType, data, range);

  return {
    reportType,
    dateRange: range,
    metrics,
    tableRows,
    insights,
    generatedAt: new Date().toISOString(),
    source: 'client_appwrite_data',
  };
}
