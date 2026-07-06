export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatPercentage(value) {
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

export function getStockStatus(product) {
  const currentStock = Number(product.currentStock ?? product.stock ?? 0);
  const minimumStock = Number(product.minimumStock ?? product.minimum ?? 0);

  if (currentStock <= 0) {
    return 'Out of Stock';
  }

  if (currentStock < minimumStock * 0.5) {
    return 'Critical';
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

  if (normalizedStatus === 'failed ocr' || normalizedStatus === 'failed') {
    return 'danger';
  }

  return 'neutral';
}

export function getInvoiceStatusBadge(status) {
  const normalizedStatus = status.toLowerCase();

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

  if (normalizedStatus === 'growing' || normalizedStatus === 'healthy') {
    return 'success';
  }

  if (normalizedStatus === 'needs action' || normalizedStatus === 'attention') {
    return 'warning';
  }

  if (normalizedStatus === 'declining' || normalizedStatus === 'loss') {
    return 'danger';
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

  if (normalizedStatus === 'connected') {
    return 'success';
  }

  if (normalizedStatus === 'demo mode') {
    return 'info';
  }

  if (normalizedStatus === 'not connected') {
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
