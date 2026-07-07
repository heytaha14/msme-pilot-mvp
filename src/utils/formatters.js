export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date) {
  if (!date) {
    return 'Not available';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
}

export function formatPercentage(value) {
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

export function getStockStatus(product) {
  const currentStock = Number(product.currentStock ?? product.stock ?? 0);
  const minimumStock = Number(product.minimumStock ?? product.minStock ?? product.minimum ?? 0);

  if (currentStock <= 0) {
    return 'Out of Stock';
  }

  if (currentStock <= minimumStock) {
    return 'Low Stock';
  }

  return 'In Stock';
}

export function calculateProductValue(product) {
  const currentStock = Number(product.currentStock ?? product.stock ?? 0);
  const purchasePrice = Number(product.purchasePrice ?? 0);

  return currentStock * purchasePrice;
}

export function calculateInventoryValue(product) {
  return calculateProductValue(product);
}

export function calculateProfitPerUnit(product) {
  return Number(product.sellingPrice ?? 0) - Number(product.purchasePrice ?? 0);
}

export function calculateMarginPercentage(product) {
  const sellingPrice = Number(product.sellingPrice ?? 0);

  if (!sellingPrice) {
    return 0;
  }

  return (calculateProfitPerUnit(product) / sellingPrice) * 100;
}

export function getStockBadgeVariant(status) {
  if (status === 'In Stock') {
    return 'success';
  }

  if (status === 'Low Stock') {
    return 'warning';
  }

  if (status === 'Critical' || status === 'Out of Stock') {
    return 'danger';
  }

  return 'neutral';
}

export function getPaymentStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'paid') {
    return 'success';
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'due') {
    return 'warning';
  }

  if (normalizedStatus === 'overdue') {
    return 'danger';
  }

  return 'neutral';
}

export function getCustomerPaymentStatus(customer) {
  if (customer.paymentStatus === 'Overdue') {
    return 'Overdue';
  }

  if (Number(customer.pendingAmount ?? 0) <= 0) {
    return 'Paid';
  }

  return 'Pending';
}

export function getSupplierPaymentStatus(supplier) {
  if (supplier.paymentStatus === 'Overdue') {
    return 'Overdue';
  }

  if (Number(supplier.paymentDue ?? 0) <= 0) {
    return 'Paid';
  }

  return 'Due';
}

export function calculateCustomerStats(customers) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    totalCustomers: customers.length,
    pendingAmountTotal: customers.reduce(
      (sum, customer) => sum + Number(customer.pendingAmount || 0),
      0,
    ),
    activeCustomers: customers.filter((customer) => Number(customer.totalPurchases || 0) > 0).length,
    newThisMonth: customers.filter((customer) => {
      const date = new Date(customer.createdAt || customer.$createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length,
    paidCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Paid').length,
    pendingCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Pending').length,
    overdueCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Overdue').length,
  };
}

export function calculateSupplierStats(suppliers) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    totalSuppliers: suppliers.length,
    totalPaymentDue: suppliers.reduce(
      (sum, supplier) => sum + Number(supplier.paymentDue || 0),
      0,
    ),
    activeSuppliers: suppliers.filter((supplier) => Number(supplier.totalPurchase || 0) > 0).length,
    invoicesThisMonth: suppliers.filter((supplier) => {
      const date = new Date(supplier.lastInvoiceDate);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length,
    paidSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Paid').length,
    dueSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Due').length,
    overdueSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Overdue').length,
  };
}

export function getSalePaymentStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'paid') {
    return 'success';
  }

  if (normalizedStatus === 'pending') {
    return 'warning';
  }

  if (normalizedStatus === 'partial') {
    return 'info';
  }

  if (normalizedStatus === 'cancelled') {
    return 'danger';
  }

  return 'neutral';
}

export function getSaleStatusLabel(status) {
  return status || 'Pending';
}

export function calculateSaleStats(sales = []) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const activeSales = sales.filter((sale) => sale.paymentStatus !== 'Cancelled');

  return {
    todaySales: activeSales
      .filter((sale) => String(sale.saleDate || '').slice(0, 10) === today)
      .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0),
    monthlyRevenue: activeSales
      .filter((sale) => String(sale.saleDate || '').slice(0, 7) === currentMonth)
      .reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0),
    pendingSales: activeSales
      .filter((sale) => ['Pending', 'Partial'].includes(sale.paymentStatus))
      .reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0),
    profitThisMonth: activeSales
      .filter((sale) => String(sale.saleDate || '').slice(0, 7) === currentMonth)
      .reduce((sum, sale) => sum + Number(sale.profit || 0), 0),
  };
}

export function formatFileSize(bytes = 0) {
  if (!bytes) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDuration(durationMs = 0) {
  const seconds = Math.max(0, Number(durationMs || 0) / 1000);

  if (seconds < 1) {
    return `${Math.round(Number(durationMs || 0))} ms`;
  }

  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} sec`;
}

export function getOcrConfidenceLevel(confidence) {
  if (confidence === null || confidence === undefined || Number.isNaN(Number(confidence))) {
    return 'Needs Review';
  }

  const value = Number(confidence);
  if (value >= 80) return 'High confidence';
  if (value >= 60) return 'Medium confidence';
  return 'Low confidence';
}

export function getOcrConfidenceBadge(confidence) {
  const level = getOcrConfidenceLevel(confidence);

  if (level === 'High confidence') return 'success';
  if (level === 'Medium confidence') return 'warning';
  if (level === 'Low confidence') return 'danger';
  return 'neutral';
}

export function getAiConfidenceLevel(confidence) {
  if (confidence === null || confidence === undefined || Number.isNaN(Number(confidence))) {
    return 'AI not run';
  }

  const value = Number(confidence);
  if (value >= 85) return 'High Confidence';
  if (value >= 65) return 'Medium Confidence';
  return 'Low Confidence';
}

export function getAiConfidenceBadge(confidence) {
  const value = Number(confidence);

  if (!Number.isFinite(value)) return 'neutral';
  if (value >= 85) return 'success';
  if (value >= 65) return 'warning';
  return 'danger';
}

export function getAiReviewStatusBadge(needsManualReview) {
  return needsManualReview ? 'warning' : 'success';
}

export function getInvoiceScanStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'approved' || normalizedStatus === 'extracted') {
    return 'success';
  }

  if (normalizedStatus === 'pending review') {
    return 'warning';
  }

  if (normalizedStatus === 'processing' || normalizedStatus === 'ready') {
    return 'info';
  }

  if (normalizedStatus === 'uploaded') {
    return 'neutral';
  }

  if (normalizedStatus === 'failed ocr' || normalizedStatus === 'failed') {
    return 'danger';
  }

  return 'neutral';
}

export function getInvoiceStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'uploaded') {
    return 'info';
  }

  if (normalizedStatus === 'approved') {
    return 'success';
  }

  if (normalizedStatus === 'pending review') {
    return 'warning';
  }

  if (normalizedStatus === 'processing') {
    return 'info';
  }

  if (normalizedStatus === 'failed ocr' || normalizedStatus === 'rejected') {
    return 'danger';
  }

  return 'neutral';
}

export function getInventoryUpdateLabel(isUpdated) {
  return isUpdated ? 'Updated' : 'Not Updated';
}

export function getFileTypeLabel(fileType = '') {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType.includes('pdf')) return 'PDF';
  if (normalizedType.includes('jpeg') || normalizedType.includes('jpg')) return 'JPG';
  if (normalizedType.includes('png')) return 'PNG';
  if (normalizedType.includes('webp')) return 'WEBP';

  return fileType || 'File';
}

export function getReportStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'ready') {
    return 'success';
  }

  if (normalizedStatus === 'draft') {
    return 'warning';
  }

  if (normalizedStatus === 'generating') {
    return 'info';
  }

  if (normalizedStatus === 'failed') {
    return 'danger';
  }

  return 'neutral';
}

export function getMetricStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === 'growing' ||
    normalizedStatus === 'healthy' ||
    normalizedStatus === 'paid' ||
    normalizedStatus === 'ready' ||
    normalizedStatus === 'credit'
  ) {
    return 'success';
  }

  if (
    normalizedStatus === 'needs action' ||
    normalizedStatus === 'attention' ||
    normalizedStatus === 'pending' ||
    normalizedStatus === 'due' ||
    normalizedStatus === 'estimate' ||
    normalizedStatus === 'payable'
  ) {
    return 'warning';
  }

  if (
    normalizedStatus === 'declining' ||
    normalizedStatus === 'loss' ||
    normalizedStatus === 'overdue' ||
    normalizedStatus === 'cancelled'
  ) {
    return 'danger';
  }

  if (normalizedStatus === 'partial' || normalizedStatus === 'good') {
    return 'info';
  }

  return 'neutral';
}

export function getHealthStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === 'excellent' ||
    normalizedStatus === 'healthy' ||
    normalizedStatus === 'strong' ||
    normalizedStatus === 'positive'
  ) {
    return 'success';
  }

  if (normalizedStatus === 'good') {
    return 'info';
  }

  if (
    normalizedStatus === 'needs action' ||
    normalizedStatus === 'attention' ||
    normalizedStatus === 'warning'
  ) {
    return 'warning';
  }

  if (normalizedStatus === 'critical' || normalizedStatus === 'risk') {
    return 'danger';
  }

  return 'neutral';
}

export function calculateProjectedHealthScore(baseScore, selectedActions) {
  const scoreIncrease = Object.entries(selectedActions).reduce(
    (sum, [, action]) => sum + (action.enabled ? action.value : 0),
    0,
  );

  return Math.min(100, baseScore + scoreIncrease);
}

export function truncateText(text, length = 120) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

export function getAiResponseForPrompt(prompt) {
  const message = prompt.toLowerCase();

  if (message.includes('reorder') || message.includes('stock')) {
    return 'Rice, Sugar, and Cooking Oil need attention. Sugar is critical with only 3 units against a minimum of 12. Reorder Sugar first, then Rice and Cooking Oil before Friday.';
  }

  if (
    message.includes('pending') ||
    message.includes('payment') ||
    message.includes('dues')
  ) {
    return 'Total pending payments are ₹58,000. Ahmed Traders has ₹12,000 pending, Sana Retail has ₹5,500 pending, and City Wholesale has the highest overdue amount. Follow up with Ahmed Traders first to improve cash flow.';
  }

  if (message.includes('sales')) {
    return 'Today’s sales are ₹12,400 and monthly revenue is ₹3,48,000. Sales are 14.2% higher this month. Sugar and Cooking Oil are moving faster before weekends.';
  }

  if (message.includes('profit')) {
    return 'Estimated monthly profit is ₹82,500. Profit margin is healthy, but you can improve it by reducing pending dues and planning bulk purchases for fast-moving grocery items.';
  }

  if (message.includes('business health') || message.includes('score')) {
    return 'Your business health score is 84/100. Inventory and sales are strong, but pending payments are pulling the score down. Recovering ₹12,000 and restocking low-stock items can push your score near 90.';
  }

  if (message.includes('report')) {
    return 'This month’s business overview: revenue is ₹3,48,000, profit is ₹82,500, pending payments are ₹58,000, and 7 products are low in stock. Generate a monthly report to review full performance.';
  }

  if (message.includes('gst')) {
    return 'GST tracking is currently in demo mode. Based on sample invoices, GST amounts are captured per item and shown in sales and purchase summaries. Real GST reports will be generated after backend integration.';
  }

  if (message.includes('summary') || message.includes('today')) {
    return 'Today’s business performance is strong. Sales are ₹12,400, monthly revenue is ₹3,48,000, and your business health score is 84/100. The main actions are to restock Sugar, Rice, and Cooking Oil, and recover ₹12,000 from Ahmed Traders.';
  }

  return 'Based on your current business data, focus on low-stock products, pending customer dues, and weekly sales trends. You can ask me about inventory, sales, customers, suppliers, payments, reports, GST, or business health.';
}

export function getNotificationPriorityBadge(priority) {
  const normalizedPriority = priority.toLowerCase();

  if (normalizedPriority === 'critical') {
    return 'danger';
  }

  if (normalizedPriority === 'high') {
    return 'warning';
  }

  if (normalizedPriority === 'medium') {
    return 'info';
  }

  return 'neutral';
}

export function getNotificationStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'unread') {
    return 'info';
  }

  if (normalizedStatus === 'read') {
    return 'success';
  }

  if (normalizedStatus === 'archived') {
    return 'neutral';
  }

  return 'neutral';
}

export function getNotificationTypeIcon(type) {
  const normalizedType = type.toLowerCase();

  if (normalizedType === 'low stock') return 'PackageX';
  if (normalizedType === 'payment due') return 'WalletCards';
  if (normalizedType === 'invoice') return 'ReceiptText';
  if (normalizedType === 'inventory') return 'Boxes';
  if (normalizedType === 'customer') return 'Users';
  if (normalizedType === 'supplier') return 'Truck';
  if (normalizedType === 'gst') return 'FileText';
  if (normalizedType === 'business health') return 'Activity';
  if (normalizedType === 'sales') return 'TrendingUp';

  return 'Bell';
}

export function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;

  if (normalized.length !== 10) {
    return value;
  }

  return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
}

export function getProfileCompletionStatus(completion) {
  if (completion >= 85) return 'success';
  if (completion >= 70) return 'warning';
  return 'danger';
}

export function getAccountStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'active' || normalizedStatus === 'verified') {
    return 'success';
  }

  if (normalizedStatus === 'incomplete' || normalizedStatus === 'pending') {
    return 'warning';
  }

  return 'danger';
}

export function getGstStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'registered' || normalizedStatus === 'yes') {
    return 'success';
  }

  if (normalizedStatus === 'not registered' || normalizedStatus === 'no') {
    return 'warning';
  }

  return 'neutral';
}

export function getSettingsStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus === 'active' ||
    normalizedStatus === 'enabled' ||
    normalizedStatus === 'saved' ||
    normalizedStatus === 'secure' ||
    normalizedStatus === 'standard'
  ) {
    return 'success';
  }

  if (normalizedStatus === 'demo mode') {
    return 'info';
  }

  if (
    normalizedStatus === 'attention' ||
    normalizedStatus === 'warning' ||
    normalizedStatus === 'not enabled'
  ) {
    return 'warning';
  }

  return 'neutral';
}

export function getIntegrationStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'connected' || normalizedStatus === 'configured') {
    return 'success';
  }

  if (normalizedStatus === 'demo mode') {
    return 'info';
  }

  if (normalizedStatus === 'not connected' || normalizedStatus === 'not configured') {
    return 'warning';
  }

  if (normalizedStatus === 'planned') {
    return 'neutral';
  }

  return 'neutral';
}

export function calculateSaleTotals(items) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.sellingPrice || 0),
    0,
  );
  const gstAmount = items.reduce((sum, item) => {
    const taxableAmount = Number(item.quantity || 0) * Number(item.sellingPrice || 0);
    return sum + (taxableAmount * Number(item.gstPercentage || 0)) / 100;
  }, 0);

  return {
    subtotal,
    gstAmount,
    totalAmount: subtotal + gstAmount,
  };
}

export function calculateSaleProfit(items) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const sellingPrice = Number(item.sellingPrice || 0);
    const purchasePrice = Number(item.purchasePrice || sellingPrice * 0.82);

    return sum + (sellingPrice - purchasePrice) * quantity;
  }, 0);
}
