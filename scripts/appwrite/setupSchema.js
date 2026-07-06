import { config } from 'dotenv';
import {
  AppwriteException,
  Client,
  Compression,
  Databases,
  DatabasesIndexType,
  Permission,
  Query,
  Role,
  Storage,
} from 'node-appwrite';
import {
  BUCKET_IDS,
  COLLECTION_IDS,
  DATABASE_ID as DEFAULT_DATABASE_ID,
} from '../../src/config/appwriteSchema.js';

config({ path: ['.env.local', '.env'], quiet: true });

const DATABASE_NAME = 'MSME Pilot';
const REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_API_KEY',
];

const summary = {
  databasesCreated: 0,
  databasesSkipped: 0,
  collectionsCreated: 0,
  collectionsSkipped: 0,
  attributesCreated: 0,
  attributesSkipped: 0,
  indexesCreated: 0,
  indexesSkipped: 0,
  bucketsCreated: 0,
  bucketsSkipped: 0,
  bucketsFailed: 0,
};

function fail(message) {
  console.error(`\n[appwrite:setup] ${message}`);
  process.exitCode = 1;
}

function validateEnvironment() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());

  if (process.env.VITE_APPWRITE_API_KEY) {
    throw new Error(
      'Security violation: VITE_APPWRITE_API_KEY is set. API keys must never be exposed to frontend/Vite code.',
    );
  }

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill server-side values locally.`,
    );
  }

  if (process.env.APPWRITE_API_KEY === 'must_be_loaded_from_env_only') {
    throw new Error(
      'APPWRITE_API_KEY still contains the placeholder value. Put the real key only in local .env or a secure server environment.',
    );
  }

  if (process.env.APPWRITE_DATABASE_ID !== DEFAULT_DATABASE_ID) {
    console.warn(
      `[appwrite:setup] APPWRITE_DATABASE_ID is ${process.env.APPWRITE_DATABASE_ID}; schema constants use ${DEFAULT_DATABASE_ID}. Continuing with env value.`,
    );
  }

  console.log('[appwrite:setup] Environment validated. API key is loaded but will not be printed.');
}

function isNotFound(error) {
  return error instanceof AppwriteException && error.code === 404;
}

function isConflict(error) {
  return error instanceof AppwriteException && error.code === 409;
}

function isBucketPlanLimit(error) {
  return (
    error instanceof AppwriteException &&
    String(error.message || '').toLowerCase().includes('maximum number of buckets')
  );
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function collectionPermissions() {
  return [Permission.create(Role.users())];
}

function bucketPermissions() {
  return [Permission.create(Role.users())];
}

const attr = {
  string: (key, size, required = false) => ({ type: 'string', key, size, required }),
  email: (key, required = false) => ({ type: 'email', key, required }),
  integer: (key, required = false) => ({ type: 'integer', key, required }),
  float: (key, required = false) => ({ type: 'float', key, required }),
  boolean: (key, required = false) => ({ type: 'boolean', key, required }),
  datetime: (key, required = false) => ({ type: 'datetime', key, required }),
};

const keyIndex = (key, attributes = [key]) => ({
  key: `${key}_index`,
  type: DatabasesIndexType.Key,
  attributes,
});

const uniqueIndex = (key, attributes = [key]) => ({
  key: `unique_${key}`,
  type: DatabasesIndexType.Unique,
  attributes,
});

const commonAttributes = [
  attr.string('userId', 64, true),
  attr.datetime('createdAt', true),
  attr.datetime('updatedAt', true),
];

const collectionSchemas = [
  {
    id: COLLECTION_IDS.BUSINESS_PROFILES,
    name: 'Business Profiles',
    purpose: 'Stores owner and business profile connected to Appwrite Auth user.',
    attributes: [
      attr.string('userId', 64, true),
      attr.string('ownerName', 128, true),
      attr.email('email', true),
      attr.string('phone', 32),
      attr.string('role', 64),
      attr.string('language', 32),
      attr.string('timezone', 64),
      attr.string('businessName', 160, true),
      attr.string('businessType', 100),
      attr.string('industry', 100),
      attr.string('businessSize', 64),
      attr.integer('employees'),
      attr.integer('establishedYear'),
      attr.boolean('gstRegistered'),
      attr.string('gstin', 32),
      attr.string('pan', 20),
      attr.string('address', 500),
      attr.string('city', 100),
      attr.string('state', 100),
      attr.string('pinCode', 20),
      attr.string('country', 80),
      attr.string('businessPhone', 32),
      attr.email('supportEmail'),
      attr.string('logoFileId', 128),
      attr.integer('profileCompletion'),
      attr.string('plan', 64),
      attr.string('accountStatus', 64),
      attr.datetime('createdAt', true),
      attr.datetime('updatedAt', true),
    ],
    indexes: [
      uniqueIndex('userId'),
      keyIndex('email'),
      keyIndex('businessName'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.PRODUCTS,
    name: 'Products',
    purpose: 'Stores inventory products.',
    attributes: [
      ...commonAttributes,
      attr.string('name', 160, true),
      attr.string('category', 100, true),
      attr.string('barcode', 80),
      attr.string('supplierId', 64),
      attr.string('supplierName', 160),
      attr.float('purchasePrice', true),
      attr.float('sellingPrice', true),
      attr.float('gstPercentage'),
      attr.integer('stock', true),
      attr.integer('minStock', true),
      attr.string('unit', 40),
      attr.string('imageFileId', 128),
      attr.string('status', 64),
      attr.string('notes', 1000),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('name'),
      keyIndex('category'),
      keyIndex('barcode'),
      keyIndex('supplierId'),
      keyIndex('stock'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.INVENTORY_MOVEMENTS,
    name: 'Inventory Movements',
    purpose: 'Tracks stock increases, sales deductions, adjustments, returns, damage, and invoice scan updates.',
    attributes: [
      ...commonAttributes,
      attr.string('productId', 64, true),
      attr.string('productName', 160, true),
      attr.string('movementType', 64, true),
      attr.integer('quantity', true),
      attr.integer('previousStock', true),
      attr.integer('newStock', true),
      attr.string('referenceType', 80),
      attr.string('referenceId', 64),
      attr.string('note', 1000),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('productId'),
      keyIndex('movementType'),
      keyIndex('referenceId'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.CUSTOMERS,
    name: 'Customers',
    purpose: 'Stores customer CRM and pending payments.',
    attributes: [
      ...commonAttributes,
      attr.string('name', 160, true),
      attr.string('phone', 32, true),
      attr.string('address', 500),
      attr.float('totalPurchases'),
      attr.float('pendingAmount'),
      attr.string('paymentStatus', 64),
      attr.string('notes', 1000),
      attr.datetime('lastPurchaseDate'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('name'),
      keyIndex('phone'),
      keyIndex('paymentStatus'),
      keyIndex('pendingAmount'),
      keyIndex('lastPurchaseDate'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.SUPPLIERS,
    name: 'Suppliers',
    purpose: 'Stores supplier/vendor records and supplier dues.',
    attributes: [
      ...commonAttributes,
      attr.string('name', 160, true),
      attr.string('phone', 32, true),
      attr.string('address', 500),
      attr.string('productsSupplied', 1000),
      attr.string('category', 100),
      attr.float('totalPurchase'),
      attr.float('paymentDue'),
      attr.string('paymentStatus', 64),
      attr.string('notes', 1000),
      attr.datetime('lastInvoiceDate'),
      attr.datetime('lastPaymentDate'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('name'),
      keyIndex('phone'),
      keyIndex('category'),
      keyIndex('paymentStatus'),
      keyIndex('paymentDue'),
      keyIndex('lastInvoiceDate'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.SALES,
    name: 'Sales',
    purpose: 'Stores sales invoice headers.',
    attributes: [
      ...commonAttributes,
      attr.string('invoiceNumber', 80, true),
      attr.string('customerId', 64),
      attr.string('customerName', 160, true),
      attr.string('customerPhone', 32),
      attr.float('subtotal', true),
      attr.float('gstAmount'),
      attr.float('totalAmount', true),
      attr.float('profit'),
      attr.float('paidAmount'),
      attr.float('dueAmount'),
      attr.string('paymentStatus', 64, true),
      attr.datetime('saleDate', true),
      attr.string('notes', 1000),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('invoiceNumber'),
      keyIndex('customerId'),
      keyIndex('customerName'),
      keyIndex('paymentStatus'),
      keyIndex('saleDate'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.SALE_ITEMS,
    name: 'Sale Items',
    purpose: 'Stores individual sale line items.',
    attributes: [
      ...commonAttributes,
      attr.string('saleId', 64, true),
      attr.string('productId', 64),
      attr.string('productName', 160, true),
      attr.float('quantity', true),
      attr.string('unit', 40),
      attr.float('sellingPrice', true),
      attr.float('purchasePrice'),
      attr.float('gstPercentage'),
      attr.float('lineSubtotal'),
      attr.float('lineGst'),
      attr.float('lineTotal', true),
      attr.float('profit'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('saleId'),
      keyIndex('productId'),
      keyIndex('productName'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.PURCHASE_INVOICES,
    name: 'Purchase Invoices',
    purpose: 'Stores uploaded/scanned supplier purchase invoices.',
    attributes: [
      ...commonAttributes,
      attr.string('invoiceNumber', 80, true),
      attr.string('supplierId', 64),
      attr.string('supplierName', 160, true),
      attr.string('supplierPhone', 32),
      attr.datetime('invoiceDate', true),
      attr.float('subtotal'),
      attr.float('gstAmount'),
      attr.float('totalAmount', true),
      attr.string('status', 64, true),
      attr.boolean('inventoryUpdated'),
      attr.string('extractedText', 12000),
      attr.string('aiExtractedJson', 2000),
      attr.string('fileId', 128),
      attr.string('fileName', 255),
      attr.string('fileType', 80),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('invoiceNumber'),
      keyIndex('supplierId'),
      keyIndex('supplierName'),
      keyIndex('status'),
      keyIndex('inventoryUpdated'),
      keyIndex('invoiceDate'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.INVOICE_ITEMS,
    name: 'Invoice Items',
    purpose: 'Stores individual purchase invoice extracted items.',
    attributes: [
      ...commonAttributes,
      attr.string('invoiceId', 64, true),
      attr.string('productId', 64),
      attr.string('productName', 160, true),
      attr.float('quantity', true),
      attr.string('unit', 40),
      attr.float('amount', true),
      attr.float('gstPercentage'),
      attr.string('inventoryAction', 255),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('invoiceId'),
      keyIndex('productId'),
      keyIndex('productName'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.PAYMENTS,
    name: 'Payments',
    purpose: 'Tracks customer payments received and supplier payments made.',
    attributes: [
      ...commonAttributes,
      attr.string('direction', 40, true),
      attr.string('entityType', 40, true),
      attr.string('entityId', 64, true),
      attr.string('entityName', 160, true),
      attr.float('amount', true),
      attr.string('method', 40),
      attr.string('status', 64, true),
      attr.datetime('paymentDate', true),
      attr.string('referenceId', 64),
      attr.string('note', 1000),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('direction'),
      keyIndex('entityType'),
      keyIndex('entityId'),
      keyIndex('status'),
      keyIndex('paymentDate'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.NOTIFICATIONS,
    name: 'Notifications',
    purpose: 'Stores in-app alerts for stock, payments, invoices, GST, health, and sales.',
    attributes: [
      ...commonAttributes,
      attr.string('title', 180, true),
      attr.string('message', 3000, true),
      attr.string('type', 80, true),
      attr.string('priority', 40, true),
      attr.string('status', 40, true),
      attr.string('actionLabel', 100),
      attr.string('routeTarget', 160),
      attr.string('relatedEntityType', 80),
      attr.string('relatedEntityId', 64),
      attr.datetime('readAt'),
      attr.datetime('archivedAt'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('type'),
      keyIndex('priority'),
      keyIndex('status'),
      keyIndex('relatedEntityId'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS,
    name: 'Business Health Snapshots',
    purpose: 'Stores calculated business health score history.',
    attributes: [
      ...commonAttributes,
      attr.integer('score', true),
      attr.string('status', 64, true),
      attr.integer('inventoryHealth'),
      attr.integer('salesPerformance'),
      attr.integer('pendingPaymentsScore'),
      attr.integer('customerGrowth'),
      attr.integer('profitMargin'),
      attr.string('recommendationsJson', 3000),
      attr.string('risksJson', 3000),
      attr.string('opportunitiesJson', 3000),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('score'),
      keyIndex('status'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.AI_HISTORY,
    name: 'AI History',
    purpose: 'Stores AI assistant conversation history and saved insights.',
    attributes: [
      ...commonAttributes,
      attr.string('conversationId', 80, true),
      attr.string('role', 40, true),
      attr.string('message', 12000, true),
      attr.string('contextType', 80),
      attr.boolean('saved'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('conversationId'),
      keyIndex('role'),
      keyIndex('saved'),
      keyIndex('createdAt'),
    ],
  },
  {
    id: COLLECTION_IDS.APP_SETTINGS,
    name: 'App Settings',
    purpose: 'Stores per-user app/business/settings preferences.',
    attributes: [
      attr.string('userId', 64, true),
      attr.string('settingsJson', 12000, true),
      attr.datetime('createdAt', true),
      attr.datetime('updatedAt', true),
    ],
    indexes: [uniqueIndex('userId'), keyIndex('createdAt')],
  },
  {
    id: COLLECTION_IDS.GENERATED_REPORTS,
    name: 'Generated Reports',
    purpose: 'Stores generated report metadata and optional report file references.',
    attributes: [
      ...commonAttributes,
      attr.string('reportName', 160, true),
      attr.string('reportType', 80, true),
      attr.string('period', 80, true),
      attr.string('status', 64, true),
      attr.string('summaryJson', 12000),
      attr.string('fileId', 128),
      attr.datetime('generatedAt'),
    ],
    indexes: [
      keyIndex('userId'),
      keyIndex('reportType'),
      keyIndex('period'),
      keyIndex('status'),
      keyIndex('generatedAt'),
      keyIndex('createdAt'),
    ],
  },
];

const bucketSchemas = [
  {
    id: BUCKET_IDS.INVOICE_IMAGES,
    name: 'Invoice Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    maxSize: 20 * 1024 * 1024,
  },
  {
    id: BUCKET_IDS.PRODUCT_IMAGES,
    name: 'Product Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 10 * 1024 * 1024,
  },
  {
    id: BUCKET_IDS.COMPANY_LOGOS,
    name: 'Company Logos',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    maxSize: 5 * 1024 * 1024,
  },
  {
    id: BUCKET_IDS.REPORT_PDFS,
    name: 'Report PDFs',
    extensions: ['pdf'],
    maxSize: 25 * 1024 * 1024,
  },
];

async function ensureDatabase(databases, databaseId) {
  try {
    await databases.get({ databaseId });
    console.log(`[database] ${databaseId} exists, skipped`);
    summary.databasesSkipped += 1;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await databases.create({ databaseId, name: DATABASE_NAME, enabled: true });
    console.log(`[database] ${databaseId} created`);
    summary.databasesCreated += 1;
  }
}

async function ensureCollection(databases, databaseId, collection) {
  try {
    await databases.getCollection({ databaseId, collectionId: collection.id });
    console.log(`[collection] ${collection.id} exists, skipped`);
    summary.collectionsSkipped += 1;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await databases.createCollection({
      databaseId,
      collectionId: collection.id,
      name: collection.name,
      permissions: collectionPermissions(),
      documentSecurity: true,
      enabled: true,
    });
    console.log(`[collection] ${collection.id} created`);
    summary.collectionsCreated += 1;
  }
}

async function listAttributesMap(databases, databaseId, collectionId) {
  const response = await databases.listAttributes({
    databaseId,
    collectionId,
    queries: [Query.limit(200)],
    total: true,
  });
  return new Map(response.attributes.map((attribute) => [attribute.key, attribute]));
}

async function listIndexesMap(databases, databaseId, collectionId) {
  const response = await databases.listIndexes({
    databaseId,
    collectionId,
    queries: [Query.limit(200)],
    total: true,
  });
  return new Map(response.indexes.map((index) => [index.key, index]));
}

async function createAttribute(databases, databaseId, collectionId, definition) {
  const base = {
    databaseId,
    collectionId,
    key: definition.key,
    required: definition.required,
  };

  switch (definition.type) {
    case 'string':
      return databases.createStringAttribute({
        ...base,
        size: definition.size,
      });
    case 'email':
      return databases.createEmailAttribute(base);
    case 'integer':
      return databases.createIntegerAttribute(base);
    case 'float':
      return databases.createFloatAttribute(base);
    case 'boolean':
      return databases.createBooleanAttribute(base);
    case 'datetime':
      return databases.createDatetimeAttribute(base);
    default:
      throw new Error(`Unsupported attribute type: ${definition.type}`);
  }
}

async function ensureAttributes(databases, databaseId, collection) {
  let attributes = await listAttributesMap(databases, databaseId, collection.id);

  for (const definition of collection.attributes) {
    if (attributes.has(definition.key)) {
      console.log(`[attribute] ${collection.id}.${definition.key} exists, skipped`);
      summary.attributesSkipped += 1;
      continue;
    }

    try {
      await createAttribute(databases, databaseId, collection.id, definition);
      console.log(`[attribute] ${collection.id}.${definition.key} created`);
      summary.attributesCreated += 1;
    } catch (error) {
      if (!isConflict(error)) throw error;
      console.log(`[attribute] ${collection.id}.${definition.key} exists, skipped`);
      summary.attributesSkipped += 1;
    }
  }
}

async function waitForAttributes(databases, databaseId, collection) {
  const wanted = new Set(collection.attributes.map((attribute) => attribute.key));
  const timeoutMs = 120000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const attributes = await listAttributesMap(databases, databaseId, collection.id);
    const pending = [];

    for (const key of wanted) {
      const attribute = attributes.get(key);
      if (!attribute) {
        pending.push(`${key}:missing`);
        continue;
      }

      if (attribute.status === 'failed' || attribute.status === 'stuck') {
        throw new Error(
          `Attribute ${collection.id}.${key} is ${attribute.status}: ${attribute.error || 'no error message'}`,
        );
      }

      if (attribute.status !== 'available') {
        pending.push(`${key}:${attribute.status}`);
      }
    }

    if (!pending.length) {
      console.log(`[attribute] ${collection.id} attributes available`);
      return;
    }

    console.log(`[attribute] ${collection.id} waiting: ${pending.slice(0, 6).join(', ')}${pending.length > 6 ? '...' : ''}`);
    await sleep(2000);
  }

  throw new Error(`Timed out waiting for attributes on ${collection.id}`);
}

async function ensureIndexes(databases, databaseId, collection) {
  let indexes = await listIndexesMap(databases, databaseId, collection.id);

  for (const index of collection.indexes) {
    if (indexes.has(index.key)) {
      console.log(`[index] ${collection.id}.${index.key} exists, skipped`);
      summary.indexesSkipped += 1;
      continue;
    }

    try {
      await databases.createIndex({
        databaseId,
        collectionId: collection.id,
        key: index.key,
        type: index.type,
        attributes: index.attributes,
      });
      console.log(`[index] ${collection.id}.${index.key} created`);
      summary.indexesCreated += 1;
    } catch (error) {
      if (!isConflict(error)) throw error;
      console.log(`[index] ${collection.id}.${index.key} exists, skipped`);
      summary.indexesSkipped += 1;
    }
  }
}

async function ensureBucket(storage, bucket) {
  try {
    await storage.getBucket({ bucketId: bucket.id });
    console.log(`[bucket] ${bucket.id} exists, skipped`);
    summary.bucketsSkipped += 1;
  } catch (error) {
    if (!isNotFound(error)) throw error;
    try {
      await storage.createBucket({
        bucketId: bucket.id,
        name: bucket.name,
        permissions: bucketPermissions(),
        fileSecurity: true,
        enabled: true,
        maximumFileSize: bucket.maxSize,
        allowedFileExtensions: bucket.extensions,
        compression: Compression.None,
        encryption: true,
        antivirus: true,
      });
      console.log(`[bucket] ${bucket.id} created`);
      summary.bucketsCreated += 1;
    } catch (createError) {
      if (!isBucketPlanLimit(createError)) throw createError;
      console.warn(
        `[bucket] ${bucket.id} not created: Appwrite plan bucket limit reached. Upgrade the plan or create this bucket later.`,
      );
      summary.bucketsFailed += 1;
    }
  }
}

async function main() {
  validateEnvironment();

  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const storage = new Storage(client);

  console.log(`[appwrite:setup] Project ${projectId}`);
  console.log(`[appwrite:setup] Database ${databaseId}`);

  await ensureDatabase(databases, databaseId);

  for (const collection of collectionSchemas) {
    console.log(`\n[collection] ${collection.id} - ${collection.purpose}`);
    await ensureCollection(databases, databaseId, collection);
    await ensureAttributes(databases, databaseId, collection);
    await waitForAttributes(databases, databaseId, collection);
    await ensureIndexes(databases, databaseId, collection);
  }

  console.log('\n[storage] Buckets');
  for (const bucket of bucketSchemas) {
    await ensureBucket(storage, bucket);
  }

  console.log('\n[appwrite:setup] Complete');
  console.table(summary);
}

main().catch((error) => {
  fail(error?.message || String(error));
});
