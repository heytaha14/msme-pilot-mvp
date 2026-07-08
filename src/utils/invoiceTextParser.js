function linesFromText(text = '') {
  return String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCurrencyValue(value = '') {
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, ' ')
    .trim();
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function parseDateValue(value = '') {
  const text = String(value).trim();
  const isoLike = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoLike) {
    const [, year, month, day] = isoLike;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const indian = text.match(/\b(\d{1,2})[-/\s]([a-z]{3,9}|\d{1,2})[-/\s](\d{2,4})\b/i);
  if (!indian) return '';

  const monthNames = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };
  const [, day, rawMonth, rawYear] = indian;
  const month = monthNames[rawMonth.slice(0, 3).toLowerCase()] || rawMonth.padStart(2, '0');
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

  return `${year}-${month}-${day.padStart(2, '0')}`;
}

function findValueAfterLabel(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return '';
}

export function extractInvoiceNumber(text = '') {
  return findValueAfterLabel(text, [
    /(?:invoice\s*(?:no|number)|inv\s*no|bill\s*no|tax\s*invoice\s*no)\s*[:#-]?\s*([A-Z0-9/-]+)/i,
  ]);
}

export function extractInvoiceDate(text = '') {
  const value = findValueAfterLabel(text, [
    /(?:invoice\s*date|bill\s*date|date)\s*[:#-]?\s*([0-9]{1,2}[-/\s][A-Za-z0-9]{1,9}[-/\s][0-9]{2,4}|[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i,
  ]);
  return parseDateValue(value);
}

export function extractSupplierPhone(text = '') {
  const labelMatch = text.match(/(?:supplier\s*phone|phone|mobile|contact)\s*[:#-]?\s*(\+?91[\s-]?)?([6-9]\d[\d\s-]{8,})/i);
  const fallbackMatch = text.match(/(\+?91[\s-]?)?[6-9]\d[\d\s-]{8,}/);
  const match = labelMatch || fallbackMatch;
  if (!match) return '';

  const digits = match[0].replace(/\D/g, '');
  const mobile = digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits;
  return mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : match[0].trim();
}

export function extractSupplierName(text = '') {
  const lines = linesFromText(text);
  const badLinePattern = /(invoice|date|phone|mobile|contact|gstin|gst|total|subtotal|tax|amount|qty|quantity|bill|item)/i;

  return lines.find((line) => {
    if (badLinePattern.test(line)) return false;
    if (/\d{4,}/.test(line)) return false;
    return /[a-z]/i.test(line) && line.length >= 3;
  }) || '';
}

export function extractSubtotal(text = '') {
  return parseCurrencyValue(
    findValueAfterLabel(text, [
      /(?:subtotal|sub\s*total|taxable\s*value)\s*[:#-]?\s*(?:rs\.?|inr)?\s*([0-9,.]+)/i,
    ]),
  );
}

export function extractGstAmount(text = '') {
  const explicit = parseCurrencyValue(
    findValueAfterLabel(text, [
      /(?:gst\s*amount|total\s*gst)\s*[:#-]?\s*(?:rs\.?|inr)?\s*([0-9,.]+)/i,
    ]),
  );
  if (explicit) return explicit;

  const gstMatches = [...String(text).matchAll(/\b(?:cgst|sgst|igst)\b\s*[:#-]?\s*(?:rs\.?|inr)?\s*([0-9,.]+)/gi)];
  return gstMatches.reduce((sum, match) => sum + parseCurrencyValue(match[1]), 0);
}

export function extractTotalAmount(text = '') {
  const lines = linesFromText(text).reverse();
  const totalLine = lines.find((line) => {
    if (/sub\s*total|subtotal|taxable/i.test(line)) return false;
    return /\b(grand\s*total|invoice\s*total|amount\s*payable|total)\b/i.test(line);
  });

  return parseCurrencyValue(totalLine || '');
}

export function extractLineItems(text = '') {
  const labelPattern = /(total|subtotal|invoice|date|phone|mobile|contact|supplier|gstin|taxable)/i;
  const itemLines = linesFromText(text).filter((line) => {
    if (labelPattern.test(line)) return false;
    return /\d/.test(line) && /%|gst|kg|bag|bags|pcs|pack|bottle|bottles|qty|quantity/i.test(line);
  });

  return itemLines
    .map((line) => {
      const tableRowMatch = line.match(
        /^\s*\d+\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(bags?|kg|pcs?|packs?|bottles?|ltr|litre|liters?)\s+([0-9][0-9,.]*)\s+(\d+(?:\.\d+)?)\s*%?\s+([0-9][0-9,.]*)\s*$/i,
      );

      if (tableRowMatch) {
        const [, productName, quantity, unit, , gstPercentage, amount] = tableRowMatch;
        return {
          productName: productName.trim(),
          quantity: Number(quantity),
          unit,
          amount: parseCurrencyValue(amount),
          gstPercentage: Number(gstPercentage),
          inventoryAction: `Increase stock by ${Number(quantity)}`,
        };
      }

      const gstMatch = line.match(/(\d+(?:\.\d+)?)\s*%/);
      const explicitAmountMatches = [...line.matchAll(/(?:rs\.?|inr)\s*([0-9][0-9,.]*)/gi)].map((match) =>
        parseCurrencyValue(match[1]),
      );
      const amountMatches = explicitAmountMatches.length
        ? explicitAmountMatches
        : [...line.matchAll(/\b([0-9][0-9,.]{2,})\b/g)].map((match) => parseCurrencyValue(match[1]));
      const quantityMatch = line.match(/(\d+(?:\.\d+)?)\s*(bags?|kg|pcs?|packs?|bottles?|ltr|litre|liters?)\b/i);
      const productName = line
        .replace(/(?:rs\.?|inr)\s*[0-9][0-9,.]*/gi, '')
        .replace(/^\s*\d+\s+/, '')
        .replace(/\b\d+(?:\.\d+)?\s*%/g, '')
        .replace(/gst\s*\d+(?:\.\d+)?\s*%?/gi, '')
        .replace(/\d+(?:\.\d+)?\s*(bags?|kg|pcs?|packs?|bottles?|ltr|litre|liters?)\b/gi, '')
        .replace(/\b[0-9][0-9,.]{2,}\b/g, '')
        .replace(/gst|%/gi, '')
        .replace(/-/g, ' ')
        .replace(/:/g, ' ')
        .replace(/\|/g, ' ')
        .trim();

      if (!productName || !quantityMatch || !amountMatches.length) return null;

      const quantity = Number(quantityMatch[1]);
      const unit = quantityMatch[2] || '';
      const amount = amountMatches[amountMatches.length - 1];
      const gstPercentage = gstMatch ? Number(gstMatch[1]) : 0;

      return {
        productName,
        quantity,
        unit,
        amount,
        gstPercentage,
        inventoryAction: `Increase stock by ${quantity}`,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

export function cleanParsedInvoiceData(parsed) {
  const warnings = [...(parsed.warnings || [])];

  if (!parsed.invoiceNumber) warnings.push('Could not detect invoice number');
  if (!parsed.supplierName) warnings.push('Could not detect supplier name');
  if (!parsed.invoiceDate) warnings.push('Could not detect invoice date');
  if (!parsed.totalAmount) warnings.push('Could not detect total amount');
  if (!parsed.items?.length) warnings.push('Line items need manual review');

  return {
    ...parsed,
    supplierName: parsed.supplierName || 'Unknown Supplier',
    invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
    subtotal: Number(parsed.subtotal || 0),
    gstAmount: Number(parsed.gstAmount || 0),
    totalAmount: Number(parsed.totalAmount || 0),
    items: parsed.items || [],
    warnings: [...new Set(warnings)],
  };
}

export function parseInvoiceText(text = '') {
  const parsed = {
    supplierName: extractSupplierName(text),
    supplierPhone: extractSupplierPhone(text),
    invoiceNumber: extractInvoiceNumber(text),
    invoiceDate: extractInvoiceDate(text),
    subtotal: extractSubtotal(text),
    gstAmount: extractGstAmount(text),
    totalAmount: extractTotalAmount(text),
    items: extractLineItems(text),
    confidence: null,
    warnings: [],
  };

  if (!parsed.subtotal && parsed.items.length) {
    parsed.subtotal = parsed.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  if (!parsed.gstAmount && parsed.items.length) {
    parsed.gstAmount = parsed.items.reduce(
      (sum, item) => sum + (Number(item.amount || 0) * Number(item.gstPercentage || 0)) / 100,
      0,
    );
  }

  if (!parsed.totalAmount && parsed.subtotal) {
    parsed.totalAmount = parsed.subtotal + parsed.gstAmount;
  }

  return cleanParsedInvoiceData(parsed);
}
