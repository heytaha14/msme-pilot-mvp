export function mapAppwriteError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  const message = String(error?.message || '');
  const type = String(error?.type || '');
  const code = Number(error?.code || error?.response?.code || 0);
  const lowerMessage = message.toLowerCase();
  const lowerType = type.toLowerCase();

  if (
    code === 401 ||
    lowerType.includes('user_unauthorized') ||
    lowerMessage.includes('missing scope') ||
    lowerMessage.includes('session')
  ) {
    return 'Your session has expired. Please login again.';
  }

  if (code === 403 || lowerMessage.includes('permission')) {
    return 'Permission error. Check collection permissions and document security setup.';
  }

  if (lowerMessage.includes('collection') && code === 404) {
    return 'Required Appwrite collection is missing. Run the Appwrite schema setup first.';
  }

  if (
    code === 404 &&
    (
      lowerMessage.includes('generated_reports') ||
      lowerMessage.includes('business_health_snapshots') ||
      lowerMessage.includes('notifications') ||
      lowerMessage.includes('sale_items') ||
      lowerMessage.includes('invoice_items') ||
      lowerMessage.includes('purchase_invoices')
    )
  ) {
    return 'A required analytics collection is missing. Run the Appwrite schema setup before using reports or business health.';
  }

  if (lowerMessage.includes('bucket') && code === 404) {
    return 'Required Appwrite storage bucket is missing. Run the Appwrite schema setup first.';
  }

  if (lowerMessage.includes('attribute') || lowerMessage.includes('document_invalid_structure')) {
    return 'Appwrite document structure does not match the schema. Check collection attributes.';
  }

  if (lowerMessage.includes('index')) {
    return 'Required Appwrite index is missing. Run the Appwrite schema setup first.';
  }

  if (code === 429 || lowerMessage.includes('rate limit') || lowerType.includes('rate_limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (lowerMessage.includes('not enough stock') || lowerMessage.includes('insufficient stock')) {
    return message || 'Not enough stock for this product.';
  }

  if (lowerMessage.includes('unsupported file type')) {
    return 'Unsupported file type. Please upload JPG, PNG, WEBP, or PDF.';
  }

  if (lowerMessage.includes('file is too large') || lowerMessage.includes('maximum size')) {
    return 'File is too large. Maximum size is 10MB.';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
    return 'Network error. Check your connection, Appwrite endpoint, and Appwrite Web platform hostname.';
  }

  if (lowerMessage.includes('missing appwrite configuration')) {
    return 'Missing Appwrite configuration. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.';
  }

  return message || fallbackMessage;
}

export function createFriendlyAppwriteError(error, fallbackMessage) {
  const friendly = new Error(mapAppwriteError(error, fallbackMessage));
  friendly.originalError = error;
  return friendly;
}
