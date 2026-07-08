import { BUCKET_IDS } from '../config/appwriteSchema.js';
import { ID, storage } from '../lib/appwrite.js';
import { userFilePermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const maxInvoiceFileSize = 10 * 1024 * 1024;

export function validateInvoiceFile(file) {
  if (!file) {
    throw new Error('Please choose an invoice file first.');
  }

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, WEBP, or PDF.');
  }

  if (file.size > maxInvoiceFileSize) {
    throw new Error('File is too large. Maximum size is 10MB.');
  }

  return true;
}

export async function uploadInvoiceFile(userId, file) {
  validateInvoiceFile(file);

  try {
    return await storage.createFile(
      BUCKET_IDS.INVOICE_IMAGES,
      ID.unique(),
      file,
      userFilePermissions(userId),
    );
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not upload invoice file.');
  }
}

export async function deleteInvoiceFile(fileId) {
  if (!fileId) {
    return { success: true };
  }

  try {
    await storage.deleteFile(BUCKET_IDS.INVOICE_IMAGES, fileId);
    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete invoice file.');
  }
}

export function getInvoiceFileView(fileId) {
  if (!fileId) return '';
  return storage.getFileView(BUCKET_IDS.INVOICE_IMAGES, fileId);
}

export function getInvoiceFilePreview(fileId) {
  if (!fileId) return '';
  return storage.getFilePreview(BUCKET_IDS.INVOICE_IMAGES, fileId, 900, 900);
}

export function getInvoiceFileDownload(fileId) {
  if (!fileId) return '';
  return storage.getFileDownload(BUCKET_IDS.INVOICE_IMAGES, fileId);
}
