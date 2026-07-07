import { z } from 'zod';

const nullableNumber = z.number().finite().nullable();
const nullableString = z.string().nullable();
const confidenceValue = z.number().min(0).max(100);

export const invoiceExtractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'supplier',
    'invoice',
    'items',
    'taxSummary',
    'confidence',
    'warnings',
    'needsManualReview',
  ],
  properties: {
    supplier: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'phone', 'gstin', 'address'],
      properties: {
        name: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        gstin: { type: ['string', 'null'] },
        address: { type: ['string', 'null'] },
      },
    },
    invoice: {
      type: 'object',
      additionalProperties: false,
      required: [
        'invoiceNumber',
        'invoiceDate',
        'subtotal',
        'gstAmount',
        'cgstAmount',
        'sgstAmount',
        'igstAmount',
        'totalAmount',
        'currency',
        'paymentTerms',
      ],
      properties: {
        invoiceNumber: { type: ['string', 'null'] },
        invoiceDate: { type: ['string', 'null'] },
        subtotal: { type: ['number', 'null'] },
        gstAmount: { type: ['number', 'null'] },
        cgstAmount: { type: ['number', 'null'] },
        sgstAmount: { type: ['number', 'null'] },
        igstAmount: { type: ['number', 'null'] },
        totalAmount: { type: ['number', 'null'] },
        currency: { type: 'string', enum: ['INR'] },
        paymentTerms: { type: ['string', 'null'] },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'productName',
          'quantity',
          'unit',
          'unitPrice',
          'amount',
          'gstPercentage',
          'hsnCode',
          'inventoryAction',
          'confidence',
        ],
        properties: {
          productName: { type: 'string' },
          quantity: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'] },
          unitPrice: { type: ['number', 'null'] },
          amount: { type: ['number', 'null'] },
          gstPercentage: { type: ['number', 'null'] },
          hsnCode: { type: ['string', 'null'] },
          inventoryAction: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
    taxSummary: {
      type: 'object',
      additionalProperties: false,
      required: ['taxableValue', 'totalGst', 'taxBreakupAvailable'],
      properties: {
        taxableValue: { type: ['number', 'null'] },
        totalGst: { type: ['number', 'null'] },
        taxBreakupAvailable: { type: 'boolean' },
      },
    },
    confidence: {
      type: 'object',
      additionalProperties: false,
      required: ['overall', 'supplier', 'invoiceNumber', 'date', 'amounts', 'items'],
      properties: {
        overall: { type: 'number', minimum: 0, maximum: 100 },
        supplier: { type: 'number', minimum: 0, maximum: 100 },
        invoiceNumber: { type: 'number', minimum: 0, maximum: 100 },
        date: { type: 'number', minimum: 0, maximum: 100 },
        amounts: { type: 'number', minimum: 0, maximum: 100 },
        items: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    needsManualReview: { type: 'boolean' },
  },
};

const parsedInvoiceSchema = z.object({
  supplier: z.object({
    name: nullableString,
    phone: nullableString,
    gstin: nullableString,
    address: nullableString,
  }),
  invoice: z.object({
    invoiceNumber: nullableString,
    invoiceDate: nullableString,
    subtotal: nullableNumber,
    gstAmount: nullableNumber,
    cgstAmount: nullableNumber,
    sgstAmount: nullableNumber,
    igstAmount: nullableNumber,
    totalAmount: nullableNumber,
    currency: z.literal('INR'),
    paymentTerms: nullableString,
  }),
  items: z.array(z.object({
    productName: z.string().min(1),
    quantity: nullableNumber,
    unit: nullableString,
    unitPrice: nullableNumber,
    amount: nullableNumber,
    gstPercentage: nullableNumber,
    hsnCode: nullableString,
    inventoryAction: nullableString,
    confidence: confidenceValue,
  })),
  taxSummary: z.object({
    taxableValue: nullableNumber,
    totalGst: nullableNumber,
    taxBreakupAvailable: z.boolean(),
  }),
  confidence: z.object({
    overall: confidenceValue,
    supplier: confidenceValue,
    invoiceNumber: confidenceValue,
    date: confidenceValue,
    amounts: confidenceValue,
    items: confidenceValue,
  }),
  warnings: z.array(z.string()),
  needsManualReview: z.boolean(),
});

export function validateAiInvoiceOutput(value) {
  return parsedInvoiceSchema.parse(value);
}
