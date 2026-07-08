import OpenAI from 'openai';
import { createAdminClient, verifyJwtUser } from './appwriteAdmin.js';
import { buildBusinessContext } from './businessContext.js';
import { createConversationId, saveConversationExchange } from './conversationHistory.js';
import { buildAssistantInput } from './promptBuilder.js';
import {
  assistantResponseJsonSchema,
  getResponseText,
  validateAssistantResponse,
} from './responseSchema.js';
import { getRequestJson } from './safeJson.js';
import {
  getAuthenticatedUserId,
  getAuthenticatedUserJwt,
  validateRequestBody,
} from './validateRequest.js';

const OPENROUTER_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.OPENROUTER_TIMEOUT_MS || 6000), 1000),
  10000,
);
const OPENROUTER_MAX_MODELS = Math.min(
  Math.max(Number(process.env.OPENROUTER_MAX_MODELS || 1), 1),
  3,
);

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

function safeErrorResponse(res, error) {
  const status = error?.statusCode || 500;
  const code = error?.code || 'AI_ASSISTANT_FAILED';
  const message = status >= 500
    ? 'AI assistant is temporarily unavailable. Please try again.'
    : error.message;

  return json(res, {
    success: false,
    error: {
      code,
      message,
    },
  }, status);
}

function requireOpenRouterKey() {
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
    apiKey: requireOpenRouterKey(),
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    timeout: OPENROUTER_TIMEOUT_MS,
    maxRetries: 0,
    defaultHeaders: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
      'X-OpenRouter-Title': process.env.OPENROUTER_APP_NAME || 'MSME Pilot',
    },
  });
}

async function createAiResponse(openrouter, input, model) {
  const request = {
    model,
    messages: input.map((message, index) =>
      index === 0
        ? {
            ...message,
            content: [
              message.content,
              'Return only JSON. No markdown, no explanation, no code fences.',
              `Required JSON schema: ${JSON.stringify(assistantResponseJsonSchema)}`,
            ].join('\n'),
          }
        : message,
    ),
    temperature: 0.2,
    max_tokens: 700,
  };

  if (process.env.OPENROUTER_USE_RESPONSE_FORMAT === 'true') {
    request.response_format = { type: 'json_object' };
  }

  return openrouter.chat.completions.create(request);
}

function getCompletionText(response) {
  return response?.choices?.[0]?.message?.content || '';
}

async function askOpenRouter(message, context) {
  const openrouter = createOpenRouterClient();
  const input = buildAssistantInput({ message, context });
  const modelCandidates = getOpenRouterModelCandidates();
  let lastError = null;

  for (const model of modelCandidates) {
    try {
      const response = await createAiResponse(openrouter, input, model);
      const text = getCompletionText(response) || getResponseText(response);
      return {
        payload: validateAssistantResponse(text),
        model: response?.model || model,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenRouterError(error)) {
        break;
      }
    }
  }

  throw mapOpenRouterError(lastError);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function metric(label, value) {
  return { label, value: String(value) };
}

function buildFallbackAssistantPayload(message, context, reason = '') {
  const prompt = String(message || '').toLowerCase();
  const businessName = context?.business?.businessName || 'your business';
  const inventory = context?.inventory || {};
  const customers = context?.customers || {};
  const suppliers = context?.suppliers || {};
  const sales = context?.sales || {};
  const invoices = context?.invoices || {};
  const health = context?.businessHealth || {};
  const lowStockItems = inventory.topLowStockItems || [];
  const highestPendingCustomer = customers.highestPendingCustomers?.[0];
  const highestDueSupplier = suppliers.highestDueSuppliers?.[0];

  const relatedMetrics = [
    metric('Business', businessName),
    metric('Low stock', `${inventory.lowStockProducts || 0} items`),
    metric('Customer dues', formatCurrency(customers.pendingCustomerDues || 0)),
    metric('Supplier dues', formatCurrency(suppliers.supplierDues || 0)),
    metric('Monthly revenue', formatCurrency(sales.monthlyRevenue || 0)),
    metric('Pending invoices', invoices.pendingReviewCount || 0),
  ];

  const suggestedActions = [];
  if (lowStockItems.length) {
    suggestedActions.push({
      title: `Restock ${lowStockItems[0].name}`,
      reason: `${lowStockItems[0].name} is at ${lowStockItems[0].stock}/${lowStockItems[0].minStock}.`,
      priority: 'High',
      routeTarget: '/inventory',
    });
  }
  if (highestPendingCustomer) {
    suggestedActions.push({
      title: `Follow up with ${highestPendingCustomer.name}`,
      reason: `${formatCurrency(highestPendingCustomer.pendingAmount)} is pending.`,
      priority: 'High',
      routeTarget: '/customers',
    });
  }
  if (highestDueSupplier) {
    suggestedActions.push({
      title: `Plan supplier payment for ${highestDueSupplier.name}`,
      reason: `${formatCurrency(highestDueSupplier.paymentDue)} is due.`,
      priority: 'Medium',
      routeTarget: '/suppliers',
    });
  }
  if (invoices.pendingReviewCount) {
    suggestedActions.push({
      title: 'Review pending invoices',
      reason: `${invoices.pendingReviewCount} invoice(s) are waiting for review.`,
      priority: 'Medium',
      routeTarget: '/invoices',
    });
  }

  let answer = [
    `I could not get a live OpenRouter response within the function time limit, so I used your Appwrite business data instead.`,
    `${businessName} currently has ${inventory.lowStockProducts || 0} low-stock item(s), ${formatCurrency(customers.pendingCustomerDues || 0)} customer dues, ${formatCurrency(suppliers.supplierDues || 0)} supplier dues, and ${formatCurrency(sales.monthlyRevenue || 0)} monthly revenue.`,
  ].join(' ');

  if (prompt.includes('stock') || prompt.includes('reorder') || prompt.includes('inventory')) {
    const names = lowStockItems.map((item) => `${item.name} (${item.stock}/${item.minStock})`).join(', ');
    answer = names
      ? `Reorder priority from current inventory: ${names}. Start with the lowest stock item first, then review supplier availability.`
      : 'No low-stock products are currently visible in Appwrite inventory data.';
  } else if (prompt.includes('payment') || prompt.includes('dues') || prompt.includes('pending')) {
    answer = highestPendingCustomer
      ? `Customer dues need attention. ${highestPendingCustomer.name} has the highest pending amount at ${formatCurrency(highestPendingCustomer.pendingAmount)}. Total customer dues are ${formatCurrency(customers.pendingCustomerDues || 0)}.`
      : `Customer dues are currently clear. Supplier dues are ${formatCurrency(suppliers.supplierDues || 0)}.`;
  } else if (prompt.includes('supplier')) {
    answer = highestDueSupplier
      ? `${highestDueSupplier.name} has the highest supplier due at ${formatCurrency(highestDueSupplier.paymentDue)}. Plan payment to keep restocking smooth.`
      : 'Supplier dues are currently clear based on Appwrite supplier records.';
  } else if (prompt.includes('sales') || prompt.includes('revenue')) {
    answer = `Sales snapshot from Appwrite: today ${formatCurrency(sales.todaySales || 0)}, monthly revenue ${formatCurrency(sales.monthlyRevenue || 0)}, monthly profit ${formatCurrency(sales.monthlyProfit || 0)}.`;
  } else if (prompt.includes('health') || prompt.includes('score')) {
    answer = health.latestScore == null
      ? 'Business health has not been calculated from enough real records yet. Add products, customers, suppliers, sales, and approved invoices, then recalculate.'
      : `Latest business health score is ${health.latestScore}/100 (${health.latestStatus || 'calculated'}). Focus on low stock, customer dues, and pending invoices to improve it.`;
  } else if (prompt.includes('invoice')) {
    answer = `Invoice snapshot: ${invoices.totalInvoices || 0} purchase invoice(s), ${invoices.pendingReviewCount || 0} pending review, ${invoices.approvedCount || 0} approved. Review pending invoices before approving stock updates.`;
  }

  return {
    answer,
    summary: 'Generated from Appwrite business records because OpenRouter did not return fast enough.',
    suggestedActions: suggestedActions.slice(0, 5),
    relatedMetrics,
    warnings: [
      'OpenRouter response was not used for this answer.',
      reason ? `Fallback reason: ${String(reason).slice(0, 160)}` : 'Fallback reason: request timeout or provider unavailable.',
    ],
  };
}

function getOpenRouterModelCandidates() {
  const configured = String(process.env.OPENROUTER_MODEL || '').trim();
  const fallbackModels = String(process.env.OPENROUTER_FALLBACK_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const currentFreeDefaults = [
    'tencent/hy3:free',
    'poolside/laguna-xs-2.1:free',
    'cohere/north-mini-code:free',
  ];

  return [...new Set([configured, ...fallbackModels, ...currentFreeDefaults].filter(Boolean))]
    .slice(0, OPENROUTER_MAX_MODELS);
}

function isRetryableOpenRouterError(error) {
  const message = String(error?.message || '').toLowerCase();
  const retryableStatuses = new Set([400, 402, 408, 409, 429, 500, 502, 503, 504, 524, 529]);

  return (
    retryableStatuses.has(error?.status) ||
    message.includes('model') ||
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('unavailable') ||
    message.includes('provider') ||
    message.includes('rate limit') ||
    message.includes('json')
  );
}

function mapOpenRouterError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (error?.status === 401 || message.includes('api key')) {
    return Object.assign(
      new Error('OpenRouter authentication failed. Check the function API key.'),
      { statusCode: 502, code: 'OPENROUTER_AUTH_FAILED' },
    );
  }

  if (error?.status === 429 || message.includes('rate limit')) {
    return Object.assign(
      new Error('OpenRouter free model rate limit reached. Try again later.'),
      { statusCode: 429, code: 'OPENROUTER_RATE_LIMITED' },
    );
  }

  if (message.includes('model') || message.includes('not found') || message.includes('does not exist')) {
    return Object.assign(
      new Error('No configured OpenRouter model is currently available. Set OPENROUTER_MODEL to an enabled model.'),
      { statusCode: 502, code: 'OPENROUTER_MODEL_UNAVAILABLE' },
    );
  }

  return Object.assign(
    new Error('AI assistant is temporarily unavailable. Please try again.'),
    { statusCode: 502, code: 'OPENROUTER_ASSISTANT_UNAVAILABLE' },
  );
}

export default async ({ req, res, log, error }) => {
  const startedAt = Date.now();

  try {
    const body = validateRequestBody(getRequestJson(req));
    const userId = getAuthenticatedUserId(req);
    const userJwt = getAuthenticatedUserJwt(req);
    const conversationId = body.conversationId || createConversationId();

    await verifyJwtUser(userId, userJwt);

    log?.(`AI assistant start user=${userId.slice(0, 6)}... conversation=${conversationId}`);

    const { databases } = createAdminClient();
    const context = body.includeContext
      ? await buildBusinessContext(databases, userId, conversationId)
      : { warnings: ['Business context was disabled for this request.'] };
    let payload;
    let model;
    let usedLocalFallback = false;

    try {
      ({ payload, model } = await askOpenRouter(body.message, context));
    } catch (aiError) {
      usedLocalFallback = true;
      model = 'local_appwrite_context_fallback';
      payload = buildFallbackAssistantPayload(body.message, context, aiError?.message || aiError?.code || '');
      error?.(`OpenRouter unavailable, local fallback used code=${aiError?.code || 'UNKNOWN'} status=${aiError?.statusCode || aiError?.status || 'UNKNOWN'}`);
    }

    const warnings = [...(payload.warnings || []), ...(context.warnings || [])];
    if (usedLocalFallback) {
      warnings.unshift('AI answered from Appwrite data because OpenRouter was slow or unavailable.');
    }
    let savedHistory = false;
    let history = {};

    if (body.saveHistory) {
      try {
        history = await saveConversationExchange(
          databases,
          userId,
          conversationId,
          body.message,
          {
            answer: payload.answer,
            summary: payload.summary,
            suggestedActions: payload.suggestedActions,
            relatedMetrics: payload.relatedMetrics,
            warnings,
            model,
          },
        );
        savedHistory = true;
      } catch {
        warnings.push('AI answered, but history could not be saved.');
      }
    }

    log?.(
      `AI assistant complete user=${userId.slice(0, 6)}... conversation=${conversationId} savedHistory=${savedHistory} durationMs=${Date.now() - startedAt}`,
    );

    return json(res, {
      success: true,
      conversationId,
      answer: payload.answer,
      summary: payload.summary || '',
      suggestedActions: payload.suggestedActions || [],
      relatedMetrics: payload.relatedMetrics || [],
      warnings,
      model,
      savedHistory,
      userMessageId: history.userMessageId || '',
      assistantMessageId: history.assistantMessageId || '',
    });
  } catch (caught) {
    error?.(`AI assistant failed code=${caught?.code || 'UNKNOWN'} status=${caught?.statusCode || 500}`);
    return safeErrorResponse(res, caught);
  }
};
