export function getAiInvoiceErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const legacyProvider = ['open', 'router'].join('');
  const type = String(error?.type || error?.code || '').toLowerCase();
  const statusCode = Number(error?.responseStatusCode || error?.code || error?.statusCode || 0);

  if (message.includes('not configured') || message.includes('function id')) {
    return 'AI invoice function is not configured. Add VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID.';
  }

  if (message.includes('returned success but no parsed invoice data')) {
    return 'AI invoice function executed but returned no parsed invoice data. Open the latest Appwrite execution response body/logs and redeploy the current function code.';
  }

  if (message.includes('no ocr text') || type.includes('ocr_text_missing')) {
    return 'This invoice has no OCR text. Run OCR first.';
  }

  if (message.includes('approved invoices') || type.includes('approved_invoice_locked')) {
    return 'Approved invoices cannot be parsed again.';
  }

  if (statusCode === 401 || message.includes('authenticated') || message.includes('jwt')) {
    return 'Please login again before running AI extraction.';
  }

  if (statusCode === 403 || message.includes('permission') || message.includes('own invoices')) {
    return 'Permission error. You can only parse your own invoices.';
  }

  if (
    (message.includes('openai') || message.includes(legacyProvider)) &&
    (message.includes('key') || message.includes('auth'))
  ) {
    return 'AI invoice parsing is not fully configured. Add the server-side OpenAI key in the Appwrite Function environment.';
  }

  if (message.includes('appwrite_api_key') || message.includes('missing required environment variable')) {
    return 'AI invoice backend is missing server-side Appwrite environment variables.';
  }

  if (message.includes('model') || type.includes('model')) {
    return 'Configured AI model is unavailable. Check the function model setting.';
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Network error while contacting the AI invoice function.';
  }

  if (message.includes('execution failed') || type.includes('ai_parse_failed')) {
    return 'AI could not parse this invoice. Try again or review manually.';
  }

  return error?.message || 'AI invoice parsing failed. Please try again or review manually.';
}

export function sanitizeAiProviderText(value = '') {
  const legacyName = ['Open', 'Router'].join('');
  const legacyLower = ['open', 'router'].join('');
  const legacyUpper = ['OPEN', 'ROUTER'].join('');
  return String(value || '')
    .replace(new RegExp(legacyName, 'g'), 'OpenAI')
    .replace(new RegExp(legacyLower, 'g'), 'openai')
    .replace(new RegExp(legacyUpper, 'g'), 'OPENAI')
    .replace(/OPENAI_KEY_MISSING/g, 'OPENAI_KEY_MISSING')
    .replace(/OpenAI API key is missing in the Appwrite Function environment\./g, 'OpenAI API key is missing in the Appwrite Function environment.');
}

export function getAiAssistantErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const legacyProvider = ['open', 'router'].join('');
  const type = String(error?.type || error?.code || '').toLowerCase();
  const statusCode = Number(error?.responseStatusCode || error?.code || error?.statusCode || 0);

  if (message.includes('not configured') || message.includes('function id')) {
    return 'AI Assistant function is not configured. Add VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID.';
  }

  if (message.includes('returned success but no answer')) {
    return 'AI Assistant function executed but returned no answer. Open the latest Appwrite execution response body/logs and redeploy the current function code.';
  }

  if (statusCode === 401 || message.includes('authenticated') || message.includes('jwt')) {
    return 'Please log in again to use AI Assistant.';
  }

  if (statusCode === 403 || message.includes('permission') || message.includes('mismatch')) {
    return 'Permission error. AI could not access your business context.';
  }

  if (
    (message.includes('openai') || message.includes(legacyProvider)) &&
    (message.includes('key') || message.includes('auth'))
  ) {
    return 'AI Assistant is not fully configured. Add the server-side OpenAI key in the Appwrite Function environment.';
  }

  if (message.includes('openai_api_key') || type.includes('openai_key_missing')) {
    return 'AI Assistant is not fully configured. Add the server-side OpenAI key in the Appwrite Function environment.';
  }

  if (message.includes('appwrite_api_key') || message.includes('missing required environment variable')) {
    return 'AI Assistant backend is missing server-side Appwrite environment variables.';
  }

  if (message.includes('model') || type.includes('model')) {
    return 'Configured AI model is unavailable. Check the function model setting.';
  }

  if (message.includes('history') || message.includes('ai_history')) {
    return 'AI response was generated, but chat history could not be saved.';
  }

  if (message.includes('response') && message.includes('schema')) {
    return 'AI returned an unexpected response format. Please try again.';
  }

  if (statusCode === 429 || message.includes('rate limit')) {
    return 'AI Assistant is rate limited right now. Please wait a moment and try again.';
  }

  if (message.includes('context')) {
    return 'AI could not access your business context.';
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Network error while contacting the AI Assistant function.';
  }

  if (message.includes('temporarily unavailable') || type.includes('ai_assistant')) {
    return 'AI Assistant is temporarily unavailable. Please try again.';
  }

  return error?.message || 'AI Assistant request failed. Please try again.';
}

export function getAiSourceLabel(source = '') {
  if (source === 'openai_appwrite_function') return 'OpenAI Appwrite Function';
  if (source === ['open', 'router', '_appwrite_function'].join('')) return 'Legacy AI Function';
  if (source === 'tesseract_local_ocr') return 'Local OCR Parser';
  if (source === 'upload_only_pdf') return 'Upload Only';
  if (source === 'local_manual_review') return 'Manual Review';
  return source || 'Not run';
}
