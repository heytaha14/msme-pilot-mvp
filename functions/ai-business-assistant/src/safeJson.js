export function safeJsonParse(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

export function safeStringify(value, fallback = '{}') {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

export function getRequestJson(req) {
  const candidates = [
    req?.bodyJson,
    req?.body,
    req?.bodyText,
    req?.bodyRaw,
    req?.payload,
  ];

  for (const candidate of candidates) {
    const parsed = safeJsonParse(candidate, null);
    if (parsed && typeof parsed === 'object') return parsed;
  }

  return {};
}
