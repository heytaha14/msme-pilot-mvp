export function mapAppwriteError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  const message = String(error?.message || '');
  const type = String(error?.type || '');
  const code = Number(error?.code || error?.response?.code || 0);
  const lowerMessage = message.toLowerCase();
  const lowerType = type.toLowerCase();

  if (code === 401 || lowerType.includes('user_unauthorized')) {
    return 'Your session has expired. Please login again.';
  }

  if (code === 403 || lowerMessage.includes('permission')) {
    return 'Permission error. Check collection permissions and document security setup.';
  }

  if (lowerMessage.includes('collection') && code === 404) {
    return 'Required Appwrite collection is missing. Run the Appwrite schema setup first.';
  }

  if (lowerMessage.includes('attribute') || lowerMessage.includes('document_invalid_structure')) {
    return 'Appwrite document structure does not match the schema. Check collection attributes.';
  }

  if (lowerMessage.includes('index')) {
    return 'Required Appwrite index is missing. Run the Appwrite schema setup first.';
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
