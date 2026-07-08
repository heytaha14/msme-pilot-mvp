import { config } from 'dotenv';
import {
  AppwriteException,
  Client,
  Databases,
  Storage,
} from 'node-appwrite';
import {
  BUCKET_IDS,
  COLLECTION_IDS,
  DATABASE_ID as DEFAULT_DATABASE_ID,
} from '../../src/config/appwriteSchema.js';

config({ path: ['.env.local', '.env'], quiet: true });

const REQUIRED_ENV = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
];

const allowedAuthenticatedCreate = 'create("users")';

const businessCollections = Object.values(COLLECTION_IDS);
const privateBuckets = Array.from(new Set(Object.values(BUCKET_IDS)));

const findings = {
  passed: 0,
  warnings: 0,
  critical: 0,
  skipped: 0,
};

function log(level, message) {
  const prefix = {
    pass: '[pass]',
    warn: '[warn]',
    critical: '[critical]',
    skip: '[skip]',
    info: '[info]',
  }[level] || '[info]';

  console.log(`${prefix} ${message}`);
}

function recordPass(message) {
  findings.passed += 1;
  log('pass', message);
}

function recordWarning(message) {
  findings.warnings += 1;
  log('warn', message);
}

function recordCritical(message) {
  findings.critical += 1;
  log('critical', message);
}

function recordSkip(message) {
  findings.skipped += 1;
  log('skip', message);
}

function validateEnvironment() {
  if (process.env.VITE_APPWRITE_API_KEY) {
    throw new Error('VITE_APPWRITE_API_KEY is set. Remove it immediately; API keys must never be frontend variables.');
  }

  if (process.env.VITE_OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY is set. OpenAI keys must stay server-side only.');
  }

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    recordSkip(`Appwrite security audit not executed. Missing backend env: ${missing.join(', ')}.`);
    return false;
  }

  if (process.env.APPWRITE_API_KEY === 'must_be_loaded_from_env_only') {
    throw new Error('APPWRITE_API_KEY still contains the placeholder value.');
  }

  log('info', 'Backend Appwrite env is present. API key loaded but never printed.');
  return true;
}

function createClients() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  return {
    databases: new Databases(client),
    storage: new Storage(client),
  };
}

function isNotFound(error) {
  return error instanceof AppwriteException && error.code === 404;
}

function permissionsOf(resource) {
  return resource?.$permissions || resource?.permissions || [];
}

function permissionIsPublic(permission) {
  const value = String(permission).toLowerCase();
  return (
    value.includes('"any"') ||
    value.includes(':any') ||
    value.includes('any()') ||
    value.includes('"guests"') ||
    value.includes(':guests') ||
    value.includes('guest')
  );
}

function hasBroadReadUpdateDelete(permission) {
  const value = String(permission).toLowerCase();
  return (
    (value.startsWith('read(') || value.startsWith('update(') || value.startsWith('delete(')) &&
    value.includes('users')
  );
}

function auditPermissions(label, permissions = []) {
  if (!permissions.length) {
    recordPass(`${label}: no collection/bucket-level public permissions.`);
    return;
  }

  const publicPermissions = permissions.filter(permissionIsPublic);
  if (publicPermissions.length) {
    recordCritical(`${label}: public/guest permission detected (${publicPermissions.join(', ')}).`);
  } else {
    recordPass(`${label}: no public/guest permissions.`);
  }

  const broadDataPermissions = permissions.filter(hasBroadReadUpdateDelete);
  if (broadDataPermissions.length) {
    recordWarning(`${label}: broad authenticated read/update/delete permission detected (${broadDataPermissions.join(', ')}). Prefer per-document permissions.`);
  }

  const createPermissions = permissions.filter((permission) =>
    String(permission).toLowerCase().startsWith('create('),
  );
  const unexpectedCreate = createPermissions.filter((permission) => permission !== allowedAuthenticatedCreate);
  if (unexpectedCreate.length) {
    recordWarning(`${label}: unexpected create permissions (${unexpectedCreate.join(', ')}).`);
  }
}

async function auditCollections(databases, databaseId) {
  log('info', `Auditing database ${databaseId}.`);

  for (const collectionId of businessCollections) {
    try {
      const collection = await databases.getCollection(databaseId, collectionId);
      const label = `collection:${collectionId}`;

      if (collection.documentSecurity === true) {
        recordPass(`${label}: document security enabled.`);
      } else {
        recordCritical(`${label}: document security is not enabled.`);
      }

      auditPermissions(label, permissionsOf(collection));
    } catch (error) {
      if (isNotFound(error)) {
        recordCritical(`collection:${collectionId}: missing.`);
        continue;
      }

      recordCritical(`collection:${collectionId}: audit failed (${error.message}).`);
    }
  }
}

async function auditBuckets(storage) {
  for (const bucketId of privateBuckets) {
    try {
      const bucket = await storage.getBucket(bucketId);
      const label = `bucket:${bucketId}`;

      if (bucket.enabled === false) {
        recordWarning(`${label}: bucket is disabled.`);
      } else {
        recordPass(`${label}: bucket exists and is enabled.`);
      }

      if (bucket.fileSecurity === true) {
        recordPass(`${label}: file security enabled.`);
      } else {
        recordCritical(`${label}: file security is not enabled.`);
      }

      if (bucket.$permissions?.some(permissionIsPublic) || bucket.permissions?.some(permissionIsPublic)) {
        auditPermissions(label, permissionsOf(bucket));
      } else {
        recordPass(`${label}: no public/guest bucket permissions.`);
      }
    } catch (error) {
      if (isNotFound(error)) {
        recordCritical(`bucket:${bucketId}: missing.`);
        continue;
      }

      recordCritical(`bucket:${bucketId}: audit failed (${error.message}).`);
    }
  }
}

async function main() {
  console.log('[security:audit] MSME Pilot Appwrite security audit');

  if (!validateEnvironment()) {
    process.exitCode = 0;
    return;
  }

  const databaseId = process.env.APPWRITE_DATABASE_ID || DEFAULT_DATABASE_ID;
  const { databases, storage } = createClients();

  await auditCollections(databases, databaseId);
  await auditBuckets(storage);

  console.log('\n[security:audit] Summary');
  console.log(`Passed: ${findings.passed}`);
  console.log(`Warnings: ${findings.warnings}`);
  console.log(`Critical: ${findings.critical}`);
  console.log(`Skipped: ${findings.skipped}`);

  if (findings.critical > 0) {
    process.exitCode = 2;
  } else if (findings.warnings > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

main().catch((error) => {
  console.error(`[security:audit] Failed safely: ${error.message}`);
  process.exitCode = 1;
});
