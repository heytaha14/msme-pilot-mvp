export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isReasonableIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const localDigits = digits.startsWith('91') && digits.length > 10
    ? digits.slice(2)
    : digits;

  return localDigits.length === 10;
}

export function requireText(value, message) {
  if (!String(value || '').trim()) {
    throw new Error(message);
  }

  return String(value).trim();
}

export function nonNegativeNumber(value, fieldName = 'Value') {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be 0 or more.`);
  }

  return parsed;
}

export function clampText(value, maxLength, fallback = '') {
  const text = String(value || fallback);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}
