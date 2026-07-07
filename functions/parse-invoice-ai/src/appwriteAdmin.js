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
  PURCHASE_INVOICES: 'purchase_invoices',
  INVOICE_ITEMS: 'invoice_items',
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
};

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
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
    throw Object.assign(new Error('Authentication required.'), { statusCode: 401, code: 'UNAUTHENTICATED' });
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
    throw Object.assign(new Error('Authenticated user mismatch.'), { statusCode: 403, code: 'AUTH_USER_MISMATCH' });
  }

  return user;
}

export async function getOwnedInvoice(databases, invoiceId, userId) {
  try {
    const invoice = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PURCHASE_INVOICES,
      invoiceId,
    );

    if (invoice.userId !== userId) {
      throw Object.assign(new Error('You can only parse your own invoices.'), {
        statusCode: 403,
        code: 'FORBIDDEN_INVOICE',
      });
    }

    return invoice;
  } catch (error) {
    if (error.statusCode || error.code === 'FORBIDDEN_INVOICE') {
      throw error;
    }

    throw Object.assign(new Error('Invoice not found.'), { statusCode: 404, code: 'INVOICE_NOT_FOUND' });
  }
}

export async function listInvoiceItems(databases, userId, invoiceId) {
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_IDS.INVOICE_ITEMS,
    [
      Query.equal('userId', userId),
      Query.equal('invoiceId', invoiceId),
      Query.limit(100),
    ],
  );

  return response.documents;
}

export async function replaceInvoiceItems(databases, userId, invoiceId, items, options = {}) {
  const existingItems = await listInvoiceItems(databases, userId, invoiceId);
  const usableItems = items.filter((item) => item.productName);

  if (!usableItems.length && !options.forceReplaceItems) {
    return {
      itemsCreated: 0,
      itemsDeleted: 0,
      skippedReplace: true,
    };
  }

  await Promise.all(
    existingItems.map((item) =>
      databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.INVOICE_ITEMS, item.$id),
    ),
  );

  const now = new Date().toISOString();
  const created = await Promise.all(
    usableItems.map((item) =>
      databases.createDocument(
        DATABASE_ID,
        COLLECTION_IDS.INVOICE_ITEMS,
        ID.unique(),
        {
          userId,
          invoiceId,
          productId: item.productId || '',
          productName: item.productName,
          quantity: Number(item.quantity || 0),
          unit: item.unit || '',
          amount: Number(item.amount || 0),
          gstPercentage: Number(item.gstPercentage || 0),
          inventoryAction:
            item.inventoryAction ||
            (Number(item.quantity || 0) ? `Increase stock by ${Number(item.quantity || 0)}` : 'Review manually'),
          createdAt: now,
          updatedAt: now,
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
      ),
    ),
  );

  return {
    itemsCreated: created.length,
    itemsDeleted: existingItems.length,
    skippedReplace: false,
  };
}

export async function listUserProducts(databases, userId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      [Query.equal('userId', userId), Query.limit(100)],
    );
    return response.documents;
  } catch {
    return [];
  }
}

export async function listUserSuppliers(databases, userId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      [Query.equal('userId', userId), Query.limit(100)],
    );
    return response.documents;
  } catch {
    return [];
  }
}
