export function getAiInvoiceErrorMessage(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const type = String(error?.type || error?.code || '').toLowerCase();
  const statusCode = Number(error?.responseStatusCode || error?.code || error?.statusCode || 0);

  if (message.includes('not configured') || message.includes('function id')) {
    return 'AI invoice function is not configured. Add VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID.';
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

  if (message.includes('model') || type.includes('model')) {
    return 'Configured OpenAI model is unavailable. Set OPENAI_MODEL to an enabled model.';
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'Network error while contacting the AI invoice function.';
  }

  if (message.includes('execution failed') || type.includes('ai_parse_failed')) {
    return 'AI could not parse this invoice. Try again or review manually.';
  }

  return error?.message || 'AI invoice parsing failed. Please try again or review manually.';
}

export function getAiSourceLabel(source = '') {
  if (source === 'openai_appwrite_function') return 'OpenAI Appwrite Function';
  if (source === 'tesseract_local_ocr') return 'Local OCR Parser';
  if (source === 'upload_only_pdf') return 'Upload Only';
  if (source === 'local_manual_review') return 'Manual Review';
  return source || 'Not run';
}
