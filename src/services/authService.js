import { account, ID, isAppwriteConfigured } from '../lib/appwrite.js';
import { isMissingSessionError, mapAuthError } from '../utils/authErrors.js';
import { createBusinessProfile, getBusinessProfile } from './profileService.js';

function assertAppwriteConfigured() {
  if (!isAppwriteConfigured) {
    throw new Error('Missing Appwrite configuration.');
  }
}

function rethrowFriendly(error) {
  if (isMissingSessionError(error)) {
    throw error;
  }

  const friendly = new Error(mapAuthError(error));
  friendly.originalError = error;
  throw friendly;
}

export async function getCurrentUser() {
  assertAppwriteConfigured();

  try {
    return await account.get();
  } catch (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    rethrowFriendly(error);
  }
}

export async function getCurrentSession() {
  assertAppwriteConfigured();

  try {
    return await account.getSession('current');
  } catch (error) {
    if (isMissingSessionError(error)) {
      return null;
    }

    rethrowFriendly(error);
  }
}

export async function registerWithEmailPassword(payload) {
  assertAppwriteConfigured();

  try {
    const user = await account.create(
      ID.unique(),
      payload.email.trim(),
      payload.password,
      payload.ownerName.trim(),
    );

    const session = await account.createEmailPasswordSession(
      payload.email.trim(),
      payload.password,
    );
    const profile = await createBusinessProfile(user, payload);

    return { user, session, profile };
  } catch (error) {
    rethrowFriendly(error);
  }
}

export async function loginWithEmailPassword(email, password) {
  assertAppwriteConfigured();

  try {
    const session = await account.createEmailPasswordSession(email.trim(), password);
    const user = await account.get();
    const profile = await getBusinessProfile(user.$id);

    return { user, session, profile };
  } catch (error) {
    rethrowFriendly(error);
  }
}

export async function logout() {
  assertAppwriteConfigured();

  try {
    await account.deleteSession('current');
  } catch (error) {
    if (!isMissingSessionError(error)) {
      rethrowFriendly(error);
    }
  }
}

export async function sendPasswordRecovery(email) {
  assertAppwriteConfigured();

  try {
    const recoveryUrl = `${window.location.origin}/login`;
    return await account.createRecovery(email.trim(), recoveryUrl);
  } catch (error) {
    rethrowFriendly(error);
  }
}
