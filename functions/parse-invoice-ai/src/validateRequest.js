import { z } from 'zod';

const requestSchema = z.object({
  invoiceId: z.string().min(1, 'invoiceId is required'),
  mode: z.literal('parse_ocr_text').default('parse_ocr_text'),
  force: z.boolean().optional().default(false),
  forceReplaceItems: z.boolean().optional().default(false),
});

export function validateRequestBody(body) {
  return requestSchema.parse(body);
}

export function getHeader(req, name) {
  const headers = req?.headers || {};
  const normalizedName = name.toLowerCase();
  const match = Object.keys(headers).find((key) => key.toLowerCase() === normalizedName);
  return match ? headers[match] : '';
}

export function getAuthenticatedUserId(req) {
  return (
    getHeader(req, 'x-appwrite-user-id') ||
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req?.variables?.APPWRITE_FUNCTION_USER_ID ||
    ''
  );
}

export function getAuthenticatedUserJwt(req) {
  return (
    getHeader(req, 'x-appwrite-user-jwt') ||
    process.env.APPWRITE_FUNCTION_JWT ||
    req?.variables?.APPWRITE_FUNCTION_JWT ||
    ''
  );
}
