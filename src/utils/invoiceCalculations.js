function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseQuantity(value) {
  if (typeof value === 'number') {
    return value;
  }

  const match = String(value || '').match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function parseUnit(value) {
  if (!value || typeof value === 'number') {
    return '';
  }

  return String(value).replace(/[\d.]/g, '').trim();
}

export function normalizeInvoiceItem(item = {}) {
  const quantity = parseQuantity(item.quantity);
  const unit = item.unit || parseUnit(item.quantity);
  const amount = toNumber(item.amount);
  const gstPercentage = toNumber(item.gstPercentage);

  return {
    productId: item.productId || '',
    productName: item.productName?.trim() || '',
    quantity,
    unit,
    amount,
    gstPercentage,
    inventoryAction:
      item.inventoryAction ||
      (quantity ? `Increase stock by ${quantity}` : 'Review inventory action'),
  };
}

export function calculateInvoiceSubtotal(items = []) {
  return items.reduce((sum, item) => sum + toNumber(item.amount), 0);
}

export function calculateInvoiceGstAmount(items = []) {
  return items.reduce(
    (sum, item) => sum + (toNumber(item.amount) * toNumber(item.gstPercentage)) / 100,
    0,
  );
}

export function calculateInvoiceTotalAmount(items = []) {
  return calculateInvoiceSubtotal(items) + calculateInvoiceGstAmount(items);
}

export function deriveInvoiceStatus(invoice = {}) {
  return invoice.status || 'Pending Review';
}

export function generateNextPurchaseInvoiceNumber(existingInvoices = []) {
  const maxInvoice = existingInvoices.reduce((max, invoice) => {
    const match = String(invoice.invoiceNumber || '').match(/PUR-(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);

  return `PUR-${maxInvoice + 1}`;
}
