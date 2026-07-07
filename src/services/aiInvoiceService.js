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
    throw new Error(error.message || 'AI function execution failed.');
  }

  return payload;
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
    throw new Error(getAiInvoiceErrorMessage(error));
  }
}
