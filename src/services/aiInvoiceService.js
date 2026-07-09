import { ExecutionMethod, functions } from '../lib/appwrite.js';
import { getAiInvoiceErrorMessage } from '../utils/aiErrors.js';

export function getAiParseFunctionId() {
  return import.meta.env.VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID || '';
}

export function parseFunctionExecutionResponse(execution) {
  if (!execution) {
    throw new Error('AI function did not return an execution result.');
  }

  let payload = null;
  try {
    payload = execution.responseBody ? JSON.parse(execution.responseBody) : null;
  } catch {
    throw new Error('AI function returned an unreadable response.');
  }

  if (execution.status === 'failed' || execution.responseStatusCode >= 400 || payload?.success === false) {
    const error = payload?.error || {};
    const details = execution.errors || execution.logs || '';
    throw new Error(error.message || details || 'AI function execution failed before reaching OpenAI.');
  }

  const data = payload?.data || payload?.result || payload;
  const parsed = data?.parsed || data?.aiResult || data?.invoice || payload?.parsed;

  if (!parsed && !data?.itemsCreated && !data?.invoiceId) {
    throw new Error(
      'AI invoice function returned success but no parsed invoice data. Open the latest Appwrite execution response body/logs and redeploy the current function code.',
    );
  }

  return {
    ...payload,
    ...data,
    parsed,
    invoiceId: data?.invoiceId || payload?.invoiceId || '',
    itemsCreated: Number(data?.itemsCreated || payload?.itemsCreated || 0),
    needsManualReview: Boolean(data?.needsManualReview || payload?.needsManualReview),
    warnings: data?.warnings || payload?.warnings || [],
  };
}

export async function parseInvoiceWithAi(invoiceId, options = {}) {
  const functionId = getAiParseFunctionId();

  if (!functionId) {
    throw new Error('AI invoice function is not configured. Add VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID.');
  }

  try {
    const execution = await functions.createExecution({
      functionId,
      body: JSON.stringify({
        invoiceId,
        mode: 'parse_ocr_text',
        force: Boolean(options.force),
        forceReplaceItems: Boolean(options.forceReplaceItems),
      }),
      async: false,
      xpath: '/',
      method: ExecutionMethod.POST,
      headers: {
        'content-type': 'application/json',
      },
    });

    return parseFunctionExecutionResponse(execution);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('AI invoice function execution failed:', error);
    }
    throw new Error(getAiInvoiceErrorMessage(error));
  }
}
