export function mapAuthError(error) {
  const message = String(error?.message || '');
  const type = String(error?.type || '');
  const code = Number(error?.code || error?.response?.code || 0);
  const lowerMessage = message.toLowerCase();
  const lowerType = type.toLowerCase();

  if (lowerType.includes('user_invalid_credentials') || code === 401) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (
    lowerType.includes('user_already_exists') ||
    lowerMessage.includes('already exists') ||
    code === 409
  ) {
    return 'An account with this email already exists. Please login instead.';
  }

  if (lowerMessage.includes('password') && (code === 400 || code === 422)) {
    return 'Password must be at least 8 characters and meet Appwrite security rules.';
  }

  if (
    lowerMessage.includes('collection') &&
    (lowerMessage.includes('not found') || code === 404)
  ) {
    return 'Business profile collection is missing. Run Prompt 17 Appwrite setup first.';
  }

  if (lowerMessage.includes('database') && code === 404) {
    return 'Appwrite database is missing. Run Prompt 17 Appwrite setup first.';
  }

  if (code === 403 || lowerMessage.includes('permission')) {
    return 'Permission denied. Check Appwrite collection permissions and document security.';
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('failed to fetch')) {
    return 'Network error. Check your internet connection and Appwrite endpoint.';
  }

  if (lowerMessage.includes('missing appwrite configuration')) {
    return 'Missing Appwrite configuration. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID to your local environment.';
  }

  return message || 'Something went wrong with authentication. Please try again.';
}

export function isMissingSessionError(error) {
  const message = String(error?.message || '').toLowerCase();
  const type = String(error?.type || '').toLowerCase();
  const code = Number(error?.code || error?.response?.code || 0);

  return (
    code === 401 ||
    type.includes('user_unauthorized') ||
    type.includes('general_unauthorized_scope') ||
    message.includes('missing scope') ||
    message.includes('user (role: guests)')
  );
}
