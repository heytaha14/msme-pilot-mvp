import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { calculateProductValue, getStockStatus } from '../utils/formatters.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import { createInventoryMovement } from './inventoryMovementService.js';

const allowedProductFields = [
  'name',
  'category',
  'barcode',
  'supplierId',
  'supplierName',
  'purchasePrice',
  'sellingPrice',
  'gstPercentage',
  'stock',
  'minStock',
  'unit',
  'imageFileId',
  'status',
  'notes',
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function assertRequiredProductFields(productData) {
  const required = [
    ['name', 'Product name is required.'],
    ['category', 'Category is required.'],
    ['purchasePrice', 'Purchase price is required.'],
    ['sellingPrice', 'Selling price is required.'],
    ['stock', 'Stock is required.'],
    ['minStock', 'Minimum stock is required.'],
  ];

  required.forEach(([field, message]) => {
    if (productData[field] === undefined || productData[field] === null || productData[field] === '') {
      throw new Error(message);
    }
  });

  ['purchasePrice', 'sellingPrice', 'gstPercentage', 'stock', 'minStock'].forEach((field) => {
    if (toNumber(productData[field]) < 0) {
      throw new Error(`${field} must be 0 or more.`);
    }
  });
}

function normalizeInputProduct(productData) {
  const normalized = {
    name: productData.name ?? productData.productName ?? '',
    category: productData.category ?? '',
    barcode: productData.barcode ?? '',
    supplierId: productData.supplierId ?? '',
    supplierName: productData.supplierName ?? productData.supplier ?? '',
    purchasePrice: toNumber(productData.purchasePrice),
    sellingPrice: toNumber(productData.sellingPrice),
    gstPercentage: toNumber(productData.gstPercentage),
    stock: toNumber(productData.stock ?? productData.currentStock),
    minStock: toNumber(productData.minStock ?? productData.minimumStock),
    unit: productData.unit ?? '',
    imageFileId: productData.imageFileId ?? '',
    notes: productData.notes ?? '',
  };

  normalized.status = getStockStatus(normalized);
  return normalized;
}

export function toInventoryProduct(document) {
  return {
    ...document,
    id: document.$id || document.id,
    productName: document.name ?? document.productName,
    supplier: document.supplierName ?? document.supplier ?? '',
    currentStock: Number(document.stock ?? document.currentStock ?? 0),
    minimumStock: Number(document.minStock ?? document.minimumStock ?? 0),
    productImage: document.productImage || '',
  };
}

function toAppwriteProductDocument(productData) {
  const normalized = normalizeInputProduct(productData);
  assertRequiredProductFields(normalized);

  return normalized;
}

function pickAllowedFields(productData) {
  return allowedProductFields.reduce((picked, field) => {
    if (productData[field] !== undefined) {
      picked[field] = productData[field];
    }

    return picked;
  }, {});
}

export async function listProducts(userId, options = {}) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || 100),
      ],
    );

    return response.documents.map(toInventoryProduct);
  } catch (error) {
    throw createFriendlyAppwriteError(
      error,
      'Could not load products. Please check your connection and Appwrite permissions.',
    );
  }
}

export async function getProduct(productId) {
  try {
    const product = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      productId,
    );

    return toInventoryProduct(product);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load product details.');
  }
}

export async function createProduct(userId, productData) {
  const now = new Date().toISOString();
  const document = {
    ...toAppwriteProductDocument(productData),
    userId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const createdProduct = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      ID.unique(),
      document,
      userDocumentPermissions(userId),
    );

    await createInventoryMovement(userId, {
      productId: createdProduct.$id,
      productName: createdProduct.name,
      movementType: createdProduct.stock > 0 ? 'purchase' : 'adjustment',
      quantity: createdProduct.stock,
      previousStock: 0,
      newStock: createdProduct.stock,
      referenceType: 'product',
      referenceId: createdProduct.$id,
      note: 'Initial stock added',
    });

    return toInventoryProduct(createdProduct);
  } catch (error) {
    throw createFriendlyAppwriteError(
      error,
      'Could not add product. Please check your connection and Appwrite permissions.',
    );
  }
}

export async function updateProduct(userId, productId, productData) {
  try {
    const existingProduct = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      productId,
    );

    assertOwnsDocument(existingProduct, userId, 'Product');

    const normalized = toAppwriteProductDocument(productData);
    const updateDocument = {
      ...pickAllowedFields(normalized),
      updatedAt: new Date().toISOString(),
    };

    const updatedProduct = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      productId,
      updateDocument,
    );

    const previousStock = Number(existingProduct.stock || 0);
    const newStock = Number(updatedProduct.stock || 0);

    if (previousStock !== newStock) {
      await createInventoryMovement(userId, {
        productId,
        productName: updatedProduct.name,
        movementType: 'adjustment',
        quantity: newStock - previousStock,
        previousStock,
        newStock,
        referenceType: 'product',
        referenceId: productId,
        note: 'Stock adjusted from inventory page',
      });
    }

    return toInventoryProduct(updatedProduct);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update product. Please try again.');
  }
}

export async function deleteProduct(userId, productId) {
  try {
    const existingProduct = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.PRODUCTS,
      productId,
    );

    assertOwnsDocument(existingProduct, userId, 'Product');

    if (Number(existingProduct.stock || 0) > 0) {
      await createInventoryMovement(userId, {
        productId,
        productName: existingProduct.name,
        movementType: 'adjustment',
        quantity: -Number(existingProduct.stock || 0),
        previousStock: Number(existingProduct.stock || 0),
        newStock: 0,
        referenceType: 'product',
        referenceId: productId,
        note: 'Product deleted from inventory',
      });
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.PRODUCTS, productId);

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete product. Please try again.');
  }
}

export async function searchProducts(userId, filters = {}) {
  const products = await listProducts(userId, { limit: filters.limit || 100 });
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  return products.filter((product) => {
    const status = getStockStatus(product);
    const matchesSearch =
      !searchTerm ||
      product.productName.toLowerCase().includes(searchTerm) ||
      String(product.barcode || '').toLowerCase().includes(searchTerm) ||
      String(product.supplier || '').toLowerCase().includes(searchTerm) ||
      String(product.category || '').toLowerCase().includes(searchTerm);
    const matchesCategory =
      !filters.category ||
      filters.category === 'All Categories' ||
      product.category === filters.category;
    const matchesStatus =
      !filters.stockStatus ||
      filters.stockStatus === 'All Stock' ||
      status === filters.stockStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

export function getProductStats(products) {
  const categories = new Set(products.map((product) => product.category).filter(Boolean));
  const lowStockCount = products.filter((product) => {
    const stock = Number(product.currentStock ?? product.stock ?? 0);
    const minStock = Number(product.minimumStock ?? product.minStock ?? 0);
    return stock > 0 && stock <= minStock;
  }).length;

  return {
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount: products.filter((product) => Number(product.currentStock ?? product.stock ?? 0) <= 0).length,
    inventoryValue: products.reduce((sum, product) => sum + calculateProductValue(product), 0),
    categoriesCount: categories.size,
  };
}
