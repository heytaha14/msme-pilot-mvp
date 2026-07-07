import {
  Account,
  Client,
  Databases,
  ID,
  Permission,
  Query,
  Role,
  Storage,
} from 'appwrite';

export const appwriteConfig = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
};

export const isAppwriteConfigured = Boolean(
  appwriteConfig.endpoint && appwriteConfig.projectId,
);

if (!isAppwriteConfigured && import.meta.env.DEV) {
  console.warn(
    'MSME Pilot: missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID. Auth will stay unavailable until frontend-safe env variables are configured.',
  );
}

export const client = new Client();

if (appwriteConfig.endpoint) {
  client.setEndpoint(appwriteConfig.endpoint);
}

if (appwriteConfig.projectId) {
  client.setProject(appwriteConfig.projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Permission, Query, Role };
