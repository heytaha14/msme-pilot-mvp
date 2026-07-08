import {
  Account,
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
} from 'node-appwrite';

export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'msme_pilot';

export const COLLECTION_IDS = {
  BUSINESS_PROFILES: 'business_profiles',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  PURCHASE_INVOICES: 'purchase_invoices',
  INVOICE_ITEMS: 'invoice_items',
  NOTIFICATIONS: 'notifications',
  BUSINESS_HEALTH_SNAPSHOTS: 'business_health_snapshots',
  GENERATED_REPORTS: 'generated_reports',
  AI_HISTORY: 'ai_history',
};

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createAdminClient() {
  const client = new Client()
    .setEndpoint(requireEnv('APPWRITE_ENDPOINT'))
    .setProject(requireEnv('APPWRITE_PROJECT_ID'))
    .setKey(requireEnv('APPWRITE_API_KEY'));

  return {
    client,
    databases: new Databases(client),
  };
}

export function createJwtAccount(jwt) {
  const client = new Client()
    .setEndpoint(requireEnv('APPWRITE_ENDPOINT'))
    .setProject(requireEnv('APPWRITE_PROJECT_ID'))
    .setJWT(jwt);

  return new Account(client);
}

export async function verifyJwtUser(userId, jwt) {
  if (!userId) {
    throw Object.assign(new Error('Authentication required.'), {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    });
  }

  if (!jwt) {
    throw Object.assign(
      new Error('Authenticated function JWT is missing. Execute this function through an authenticated Appwrite client.'),
      { statusCode: 401, code: 'AUTH_JWT_MISSING' },
    );
  }

  const account = createJwtAccount(jwt);
  const user = await account.get();

  if (user.$id !== userId) {
    throw Object.assign(new Error('Authenticated user mismatch.'), {
      statusCode: 403,
      code: 'AUTH_USER_MISMATCH',
    });
  }

  return user;
}

export async function listOwnedDocuments(databases, collectionId, userId, options = {}) {
  const queries = [
    Query.equal('userId', userId),
    Query.limit(options.limit || 100),
  ];

  if (options.orderDesc) queries.push(Query.orderDesc(options.orderDesc));
  if (options.orderAsc) queries.push(Query.orderAsc(options.orderAsc));
  if (options.conversationId) queries.push(Query.equal('conversationId', options.conversationId));

  const response = await databases.listDocuments(DATABASE_ID, collectionId, queries);
  return response.documents;
}

export { ID, Permission, Query, Role };
