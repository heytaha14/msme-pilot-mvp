import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import {
  databases,
  ID,
  isAppwriteConfigured,
  Query,
} from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { mapAuthError } from '../utils/authErrors.js';

function assertAppwriteConfigured() {
  if (!isAppwriteConfigured) {
    throw new Error('Missing Appwrite configuration.');
  }
}

function normalizeProfileError(error) {
  const friendlyMessage = mapAuthError(error);
  const normalized = new Error(friendlyMessage);
  normalized.originalError = error;
  throw normalized;
}

export async function getBusinessProfile(userId) {
  assertAppwriteConfigured();

  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_PROFILES,
      [Query.equal('userId', userId), Query.limit(1)],
    );

    return response.documents[0] || null;
  } catch (error) {
    normalizeProfileError(error);
  }
}

export async function createBusinessProfile(user, registrationData) {
  assertAppwriteConfigured();

  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const ownerName = registrationData.ownerName || user.name || 'Owner';
  const email = registrationData.email || user.email;
  const phone = registrationData.phone || '';
  const businessType = registrationData.businessType || 'Retail';

  const document = {
    userId: user.$id,
    ownerName,
    email,
    phone,
    role: 'Owner',
    language: 'English',
    timezone: 'Asia/Kolkata',
    businessName: registrationData.businessName || `${ownerName}'s Business`,
    businessType,
    industry: businessType || 'Retail',
    businessSize: 'Micro Enterprise',
    employees: 1,
    establishedYear: currentYear,
    gstRegistered: false,
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    businessPhone: phone,
    supportEmail: email,
    logoFileId: '',
    profileCompletion: 45,
    plan: 'Pilot Beta',
    accountStatus: 'Active',
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_PROFILES,
      ID.unique(),
      document,
      userDocumentPermissions(user.$id),
    );
  } catch (error) {
    normalizeProfileError(error);
  }
}

export async function updateBusinessProfile(profileId, data) {
  assertAppwriteConfigured();

  try {
    return await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.BUSINESS_PROFILES,
      profileId,
      {
        ...data,
        updatedAt: new Date().toISOString(),
      },
    );
  } catch (error) {
    normalizeProfileError(error);
  }
}

export async function ensureBusinessProfile(user, fallbackData = {}) {
  const existingProfile = await getBusinessProfile(user.$id);

  if (existingProfile) {
    return existingProfile;
  }

  const hasEnoughProfileData =
    fallbackData.ownerName &&
    fallbackData.businessName &&
    fallbackData.businessType &&
    fallbackData.phone;

  if (!hasEnoughProfileData) {
    return null;
  }

  return createBusinessProfile(user, fallbackData);
}
