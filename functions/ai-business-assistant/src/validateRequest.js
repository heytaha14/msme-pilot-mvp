import { z } from 'zod';

const requestSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(2000, 'message is too long'),
  conversationId: z.string().trim().max(80).optional().default(''),
  mode: z.literal('business_chat').optional().default('business_chat'),
  includeContext: z.boolean().optional().default(true),
  saveHistory: z.boolean().optional().default(true),
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
