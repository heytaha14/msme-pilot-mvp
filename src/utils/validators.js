export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidIndianPhone(value) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits;

  return /^[6-9]\d{9}$/.test(normalized);
}
