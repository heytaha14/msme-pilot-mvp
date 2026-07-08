import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import { normalizeSaleItem } from '../utils/salesCalculations.js';

function assertSaleItemOwner(item, userId) {
  return assertOwnsDocument(item, userId, 'Sale item');
}

export function toSaleItemRecord(document) {
  return {
    ...document,
    id: document.$id || document.id,
    quantity: Number(document.quantity || 0),
    sellingPrice: Number(document.sellingPrice || 0),
    purchasePrice: Number(document.purchasePrice || 0),
    gstPercentage: Number(document.gstPercentage || 0),
    lineSubtotal: Number(document.lineSubtotal || 0),
    lineGst: Number(document.lineGst || 0),
    lineTotal: Number(document.lineTotal || 0),
    profit: Number(document.profit || 0),
  };
}

export async function listSaleItems(userId, saleId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.SALE_ITEMS,
      [
        Query.equal('userId', userId),
        Query.equal('saleId', saleId),
        Query.orderAsc('createdAt'),
        Query.limit(100),
      ],
    );

    return response.documents.map(toSaleItemRecord);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load sale items.');
  }
}

export async function createSaleItem(userId, saleId, itemData) {
  const now = new Date().toISOString();
  const normalized = normalizeSaleItem(itemData);

  if (!normalized.productName) {
    throw new Error('Product name is required.');
  }

  if (normalized.quantity <= 0) {
    throw new Error('Quantity must be greater than 0.');
  }

  if (normalized.sellingPrice < 0) {
    throw new Error('Selling price must be 0 or more.');
  }

  try {
    const createdItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALE_ITEMS,
      ID.unique(),
      {
        ...normalized,
        userId,
        saleId,
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    return toSaleItemRecord(createdItem);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save sale item.');
  }
}

export async function updateSaleItem(userId, itemId, itemData) {
  try {
    const existingItem = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALE_ITEMS,
      itemId,
    );

    assertSaleItemOwner(existingItem, userId);
    const normalized = normalizeSaleItem({ ...existingItem, ...itemData });

    const updatedItem = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALE_ITEMS,
      itemId,
      {
        ...normalized,
        updatedAt: new Date().toISOString(),
      },
    );

    return toSaleItemRecord(updatedItem);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update sale item.');
  }
}

export async function deleteSaleItem(userId, itemId) {
  try {
    const existingItem = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SALE_ITEMS,
      itemId,
    );

    assertSaleItemOwner(existingItem, userId);
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.SALE_ITEMS, itemId);

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete sale item.');
  }
}

export async function deleteSaleItemsForSale(userId, saleId) {
  const items = await listSaleItems(userId, saleId);

  await Promise.all(items.map((item) => deleteSaleItem(userId, item.id)));

  return { success: true, deletedCount: items.length };
}
