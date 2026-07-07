import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Permission, Query, Role } from '../lib/appwrite.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';

export async function createInventoryMovement(userId, movementData) {
  const now = new Date().toISOString();

  const document = {
    userId,
    productId: movementData.productId,
    productName: movementData.productName,
    movementType: movementData.movementType,
    quantity: Number(movementData.quantity || 0),
    previousStock: Number(movementData.previousStock || 0),
    newStock: Number(movementData.newStock || 0),
    referenceType: movementData.referenceType || 'product',
    referenceId: movementData.referenceId || movementData.productId,
    note: movementData.note || '',
    createdAt: movementData.createdAt || now,
    updatedAt: now,
  };

  try {
    return await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.INVENTORY_MOVEMENTS,
      ID.unique(),
      document,
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ],
    );
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Inventory movement could not be created:', error?.message || error);
    }

    return null;
  }
}

export async function listInventoryMovements(userId, options = {}) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.INVENTORY_MOVEMENTS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || 50),
      ],
    );

    return response.documents;
  } catch (error) {
    throw createFriendlyAppwriteError(
      error,
      'Could not load inventory movements. Please try again.',
    );
  }
}

export async function listMovementsForProduct(userId, productId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.INVENTORY_MOVEMENTS,
      [
        Query.equal('userId', userId),
        Query.equal('productId', productId),
        Query.orderDesc('createdAt'),
        Query.limit(20),
      ],
    );

    return response.documents;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Inventory movements unavailable:', error?.message || error);
    }

    return [];
  }
}
