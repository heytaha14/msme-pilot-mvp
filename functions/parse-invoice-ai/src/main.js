import OpenAI from 'openai';
import {
  COLLECTION_IDS,
  DATABASE_ID,
  createAdminClient,
  getOwnedInvoice,
  listUserProducts,
  listUserSuppliers,
  replaceInvoiceItems,
  verifyJwtUser,
} from './appwriteAdmin.js';
import { invoiceExtractionJsonSchema } from './invoiceSchema.js';
import { parseAiInvoiceText } from './parseOpenAIResponse.js';
import { safeJsonParse, safeStringify, getRequestJson } from './safeJson.js';
import {
  getAuthenticatedUserId,
  getAuthenticatedUserJwt,
  validateRequestBody,
} from './validateRequest.js';

const SYSTEM_PROMPT = [
  'You are an invoice extraction engine for Indian MSME purchase invoices.',
  'Extract structured data from OCR text.',
  'Return only JSON matching the required schema.',
  'Do not invent missing data. Use null for unknown fields.',
  'Amounts must be numbers.',
  'Dates must be ISO YYYY-MM-DD when possible.',
  'Items should be extracted only when reasonably clear.',
  'Include warnings for uncertain or missing fields.',
].join(' ');

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

function safeErrorResponse(res, error) {
  const status = error?.statusCode || 500;
  const code = error?.code || 'AI_PARSE_FAILED';
  const message = status >= 500
    ? 'AI could not parse this invoice. Try again or review manually.'
    : error.message;

  return json(res, {
    success: false,
    error: {
      code,
      message,
      details: status >= 500 ? 'Server-side AI parsing failed safely.' : undefined,
    },
  }, status);
}

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function deterministicChecks(aiResult) {
  const warnings = [];
  let needsManualReview = Boolean(aiResult.needsManualReview);
  const subtotal = aiResult.invoice.subtotal;
  const gstAmount = aiResult.invoice.gstAmount ?? aiResult.taxSummary.totalGst;
  const totalAmount = aiResult.invoice.totalAmount;

  if (!aiResult.invoice.invoiceNumber) {
    warnings.push('Invoice number is missing.');
    needsManualReview = true;
  }

  if (!aiResult.supplier.name) {
    warnings.push('Supplier name is missing.');
    needsManualReview = true;
  }

  if (!normalizeDate(aiResult.invoice.invoiceDate)) {
    warnings.push('Invoice date could not be parsed.');
    needsManualReview = true;
  }

  if (!isNumber(totalAmount)) {
    warnings.push('Total amount is missing.');
    needsManualReview = true;
  }

  if (isNumber(subtotal) && isNumber(gstAmount) && isNumber(totalAmount)) {
    const expectedTotal = roundMoney(subtotal + gstAmount);
    const difference = Math.abs(expectedTotal - totalAmount);
    if (difference > 2) {
      warnings.push('Subtotal + GST does not match total amount.');
      needsManualReview = true;
    }
  }

  const itemAmountSum = aiResult.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (aiResult.items.length && isNumber(subtotal)) {
    const itemDifference = Math.abs(roundMoney(itemAmountSum) - roundMoney(subtotal));
    if (itemDifference > Math.max(10, Number(subtotal || 0) * 0.08)) {
      warnings.push('Item totals do not match invoice subtotal.');
      needsManualReview = true;
    }
  }

  if (aiResult.items.some((item) => Number(item.confidence || 0) < 60)) {
    warnings.push('Some line items have low extraction confidence.');
    needsManualReview = true;
  }

  return {
    warnings: [...new Set([...aiResult.warnings, ...warnings])],
    needsManualReview,
    subtotalPlusGstMatchesTotal:
      isNumber(subtotal) && isNumber(gstAmount) && isNumber(totalAmount)
        ? Math.abs(roundMoney(subtotal + gstAmount) - totalAmount) <= 2
        : false,
    itemAmountSum: roundMoney(itemAmountSum),
  };
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function matchProducts(items, products) {
  return items.map((item) => {
    const itemName = normalizeName(item.productName);
    const match = products.find((product) => {
      const productName = normalizeName(product.name || product.productName);
      return productName && (itemName.includes(productName) || productName.includes(itemName));
    });

    if (!match) return item;

    return {
      ...item,
      matchedProductId: match.$id,
      matchedProductName: match.name || match.productName,
      matchConfidence: 80,
    };
  });
}

function matchSupplier(aiSupplier, suppliers) {
  const phoneDigits = String(aiSupplier.phone || '').replace(/\D/g, '');
  const supplierName = normalizeName(aiSupplier.name);

  return suppliers.find((supplier) => {
    const supplierPhone = String(supplier.phone || '').replace(/\D/g, '');
    const name = normalizeName(supplier.name);
    return (
      (phoneDigits && supplierPhone && supplierPhone.endsWith(phoneDigits.slice(-10))) ||
      (supplierName && name && (supplierName.includes(name) || name.includes(supplierName)))
    );
  }) || null;
}

function toInvoiceItem(aiItem) {
  const quantity = isNumber(aiItem.quantity) ? aiItem.quantity : 0;
  return {
    productId: aiItem.matchedProductId || '',
    productName: aiItem.productName,
    quantity,
    unit: aiItem.unit || '',
    amount: isNumber(aiItem.amount) ? aiItem.amount : 0,
    gstPercentage: isNumber(aiItem.gstPercentage) ? aiItem.gstPercentage : 0,
    inventoryAction: aiItem.inventoryAction || (quantity ? `Increase stock by ${quantity}` : 'Review manually'),
  };
}

function buildOpenRouterMessages(invoice) {
  return [
    {
      role: 'system',
      content: [
        SYSTEM_PROMPT,
        'Return only a JSON object. No markdown, no explanation, no code fences.',
        `Required JSON schema: ${JSON.stringify(invoiceExtractionJsonSchema)}`,
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `Invoice ID: ${invoice.$id}`,
        `File name: ${invoice.fileName || 'unknown'}`,
        `Current invoice number: ${invoice.invoiceNumber || 'unknown'}`,
        `Current supplier: ${invoice.supplierName || 'unknown'}`,
        `Current total amount: ${invoice.totalAmount || 0}`,
        '',
        'OCR text:',
        invoice.extractedText,
      ].join('\n'),
    },
  ];
}

function getOpenRouterKey() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('OpenRouter API key is missing in the Appwrite Function environment.'), {
      statusCode: 500,
      code: 'OPENROUTER_KEY_MISSING',
    });
  }

  return apiKey;
}

function createOpenRouterClient() {
  return new OpenAI({
    apiKey: getOpenRouterKey(),
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'MSME Pilot',
    },
  });
}

async function createAiResponse(openrouter, invoice, model, correctionText = '') {
  const messages = buildOpenRouterMessages(invoice);
  if (correctionText) {
    messages.push({
      role: 'user',
      content: `The previous JSON failed validation. Correct it and return only valid JSON. Validation issue: ${correctionText}`,
    });
  }

  return openrouter.chat.completions.create({
    model,
    messages,
    temperature: 0.1,
    max_tokens: 2200,
    response_format: { type: 'json_object' },
  });
}

function getCompletionText(response) {
  return response?.choices?.[0]?.message?.content || '';
}

async function parseWithOpenRouter(invoice) {
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const openrouter = createOpenRouterClient();

  try {
    const response = await createAiResponse(openrouter, invoice, model);
    return {
      parsed: parseAiInvoiceText(getCompletionText(response)),
      model: response?.model || model,
    };
  } catch (error) {
    if (error?.code === 'AI_VALIDATION_FAILED' || error?.code === 'AI_INVALID_JSON') {
      const retryResponse = await createAiResponse(openrouter, invoice, model, error.message);
      return {
        parsed: parseAiInvoiceText(getCompletionText(retryResponse)),
        model: retryResponse?.model || model,
      };
    }

    const message = String(error?.message || '').toLowerCase();
    if (message.includes('model') || message.includes('not found') || message.includes('does not exist')) {
      throw Object.assign(
        new Error('Configured OpenRouter model is unavailable. Set OPENROUTER_MODEL to an enabled model.'),
        { statusCode: 502, code: 'OPENROUTER_MODEL_UNAVAILABLE' },
      );
    }

    if (error?.status === 401 || message.includes('api key')) {
      throw Object.assign(
        new Error('OpenRouter authentication failed. Check the function API key.'),
        { statusCode: 502, code: 'OPENROUTER_AUTH_FAILED' },
      );
    }

    if (error?.status === 429 || message.includes('rate limit')) {
      throw Object.assign(
        new Error('OpenRouter free model rate limit reached. Try again later.'),
        { statusCode: 429, code: 'OPENROUTER_RATE_LIMITED' },
      );
    }

    throw Object.assign(new Error('AI response could not be validated. Please try again or review manually.'), {
      statusCode: 502,
      code: 'AI_PARSE_FAILED',
    });
  }
}

export default async ({ req, res, log, error }) => {
  const startedAt = Date.now();

  try {
    const body = validateRequestBody(getRequestJson(req));
    const userId = getAuthenticatedUserId(req);
    const userJwt = getAuthenticatedUserJwt(req);

    await verifyJwtUser(userId, userJwt);

    const { databases } = createAdminClient();
    const invoice = await getOwnedInvoice(databases, body.invoiceId, userId);

    if (invoice.status === 'Approved' || invoice.inventoryUpdated) {
      throw Object.assign(
        new Error('Approved invoices cannot be AI-parsed again. Create a revision or reset status first.'),
        { statusCode: 409, code: 'APPROVED_INVOICE_LOCKED' },
      );
    }

    if (!String(invoice.extractedText || '').trim()) {
      throw Object.assign(new Error('No OCR text found for this invoice. Run OCR first.'), {
        statusCode: 400,
        code: 'OCR_TEXT_MISSING',
      });
    }

    if (invoice.aiExtractedJson && !body.force) {
      const existing = safeJsonParse(invoice.aiExtractedJson, {});
      if (['openai_appwrite_function', 'openrouter_appwrite_function'].includes(existing?.source)) {
        throw Object.assign(new Error('AI extraction already exists. Use force to parse again before approval.'), {
          statusCode: 409,
          code: 'AI_PARSE_EXISTS',
        });
      }
    }

    const previousPayload = safeJsonParse(invoice.aiExtractedJson, {});
    const { parsed, model } = await parseWithOpenRouter(invoice);
    const checks = deterministicChecks(parsed);
    const products = await listUserProducts(databases, userId);
    const suppliers = await listUserSuppliers(databases, userId);
    const matchedItems = matchProducts(parsed.items, products);
    const supplierMatch = matchSupplier(parsed.supplier, suppliers);
    const now = new Date().toISOString();
    const invoiceDate = normalizeDate(parsed.invoice.invoiceDate) || invoice.invoiceDate || now;
    const subtotal = isNumber(parsed.invoice.subtotal) ? parsed.invoice.subtotal : Number(invoice.subtotal || 0);
    const gstAmount = isNumber(parsed.invoice.gstAmount)
      ? parsed.invoice.gstAmount
      : isNumber(parsed.taxSummary.totalGst)
        ? parsed.taxSummary.totalGst
        : Number(invoice.gstAmount || 0);
    const totalAmount = isNumber(parsed.invoice.totalAmount)
      ? parsed.invoice.totalAmount
      : Number(invoice.totalAmount || 0);
    const metadata = {
      source: 'openrouter_appwrite_function',
      model,
      parsedAt: now,
      parserVersion: 'v1',
      aiResult: {
        ...parsed,
        items: matchedItems,
        warnings: checks.warnings,
        needsManualReview: checks.needsManualReview,
      },
      deterministicChecks: checks,
      previousSource: previousPayload?.source || '',
      supplierMatch: supplierMatch
        ? {
            supplierId: supplierMatch.$id,
            supplierName: supplierMatch.name,
            matchConfidence: 85,
          }
        : null,
    };

    const updatedInvoice = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoice.$id,
      {
        supplierId: supplierMatch?.$id || invoice.supplierId || '',
        supplierName: parsed.supplier.name || invoice.supplierName || 'Unknown Supplier',
        supplierPhone: parsed.supplier.phone || invoice.supplierPhone || '',
        invoiceNumber: parsed.invoice.invoiceNumber || invoice.invoiceNumber,
        invoiceDate,
        subtotal,
        gstAmount,
        totalAmount,
        status: 'Pending Review',
        inventoryUpdated: false,
        aiExtractedJson: safeStringify(metadata),
        updatedAt: now,
      },
    );

    const itemResult = await replaceInvoiceItems(
      databases,
      userId,
      invoice.$id,
      matchedItems.map(toInvoiceItem),
      { forceReplaceItems: body.forceReplaceItems },
    );

    const warnings = [...checks.warnings];
    if (itemResult.skippedReplace) {
      warnings.push('AI could not confidently extract line items.');
    }

    log?.(
      `AI invoice parse complete invoice=${invoice.$id} user=${userId.slice(0, 6)}... items=${itemResult.itemsCreated} warnings=${warnings.length} durationMs=${Date.now() - startedAt}`,
    );

    return json(res, {
      success: true,
      invoiceId: updatedInvoice.$id,
      status: 'Pending Review',
      parsed: {
        ...parsed,
        items: matchedItems,
        warnings,
        needsManualReview: checks.needsManualReview || itemResult.skippedReplace,
      },
      checks,
      itemsCreated: itemResult.itemsCreated,
      needsManualReview: checks.needsManualReview || itemResult.skippedReplace,
      warnings,
    });
  } catch (caught) {
    error?.(`AI invoice parse failed code=${caught?.code || 'UNKNOWN'} status=${caught?.statusCode || 500}`);
    return safeErrorResponse(res, caught);
  }
};
