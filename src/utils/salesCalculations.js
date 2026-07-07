function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeSaleItem(item = {}) {
  const quantity = toNumber(item.quantity);
  const sellingPrice = toNumber(item.sellingPrice);
  const purchasePrice = toNumber(item.purchasePrice);
  const gstPercentage = toNumber(item.gstPercentage);
  const lineSubtotal = calculateLineSubtotal({ quantity, sellingPrice });
  const lineGst = calculateLineGst({ lineSubtotal, gstPercentage });
  const lineTotal = calculateLineTotal({ lineSubtotal, lineGst });
  const profit = calculateLineProfit({ quantity, sellingPrice, purchasePrice });

  return {
    productId: item.productId || '',
    productName: item.productName?.trim() || '',
    quantity,
    unit: item.unit?.trim() || '',
    sellingPrice,
    purchasePrice,
    gstPercentage,
    lineSubtotal,
    lineGst,
    lineTotal,
    profit,
  };
}

export function calculateLineSubtotal(item = {}) {
  return toNumber(item.lineSubtotal, toNumber(item.quantity) * toNumber(item.sellingPrice));
}

export function calculateLineGst(item = {}) {
  const lineSubtotal = toNumber(item.lineSubtotal, calculateLineSubtotal(item));
  return toNumber(item.lineGst, (lineSubtotal * toNumber(item.gstPercentage)) / 100);
}

export function calculateLineTotal(item = {}) {
  return toNumber(item.lineTotal, toNumber(item.lineSubtotal) + toNumber(item.lineGst));
}

export function calculateLineProfit(item = {}) {
  return toNumber(
    item.profit,
    toNumber(item.quantity) * (toNumber(item.sellingPrice) - toNumber(item.purchasePrice)),
  );
}

export function calculateSaleSubtotal(items = []) {
  return items.reduce((sum, item) => sum + calculateLineSubtotal(item), 0);
}

export function calculateSaleGstAmount(items = []) {
  return items.reduce((sum, item) => sum + calculateLineGst(item), 0);
}

export function calculateSaleTotalAmount(items = []) {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

export function calculateSaleProfit(items = []) {
  return items.reduce((sum, item) => sum + calculateLineProfit(item), 0);
}

export function calculateDueAmount(totalAmount, paidAmount) {
  return Math.max(0, toNumber(totalAmount) - toNumber(paidAmount));
}

export function deriveSalePaymentStatus(totalAmount, paidAmount, manualStatus) {
  if (manualStatus === 'Cancelled') {
    return 'Cancelled';
  }

  const total = toNumber(totalAmount);
  const paid = toNumber(paidAmount);
  const due = calculateDueAmount(total, paid);

  if (paid >= total && due <= 0) {
    return 'Paid';
  }

  if (paid > 0 && paid < total) {
    return 'Partial';
  }

  return 'Pending';
}

export function generateNextInvoiceNumber(existingSales = []) {
  const maxInvoice = existingSales.reduce((max, sale) => {
    const match = String(sale.invoiceNumber || '').match(/INV-(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);

  return `INV-${maxInvoice + 1}`;
}
