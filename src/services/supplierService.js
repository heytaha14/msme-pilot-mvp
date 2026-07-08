import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { getSupplierPaymentStatus } from '../utils/formatters.js';
import { assertOwnsDocument } from '../utils/ownership.js';

const allowedSupplierFields = [
  'name',
  'phone',
  'address',
  'productsSupplied',
  'category',
  'totalPurchase',
  'paymentDue',
  'paymentStatus',
  'notes',
  'lastInvoiceDate',
  'lastPaymentDate',
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeProductsSupplied(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value || '');
}

function normalizeSupplierInput(supplierData) {
  const paymentDue = toNumber(supplierData.paymentDue);
  const paymentStatus =
    supplierData.paymentStatus === 'Overdue'
      ? 'Overdue'
      : paymentDue > 0
        ? 'Due'
        : 'Paid';

  return {
    name: supplierData.name?.trim() || '',
    phone: supplierData.phone?.trim() || '',
    address: supplierData.address?.trim() || '',
    productsSupplied: normalizeProductsSupplied(supplierData.productsSupplied),
    category: supplierData.category || '',
    totalPurchase: toNumber(supplierData.totalPurchase),
    paymentDue,
    paymentStatus,
    notes: supplierData.notes?.trim() || '',
    lastInvoiceDate: supplierData.lastInvoiceDate || new Date().toISOString(),
    lastPaymentDate: supplierData.lastPaymentDate || new Date().toISOString(),
  };
}

function assertRequiredSupplierFields(supplierData) {
  if (!supplierData.name) {
    throw new Error('Supplier name is required.');
  }

  if (!supplierData.phone) {
    throw new Error('Phone number is required.');
  }

  if (supplierData.paymentDue < 0) {
    throw new Error('Payment due must be 0 or more.');
  }
}

function pickAllowedFields(supplierData) {
  return allowedSupplierFields.reduce((picked, field) => {
    if (supplierData[field] !== undefined) {
      picked[field] = supplierData[field];
    }

    return picked;
  }, {});
}

export function toSupplierRecord(document) {
  const productsSupplied = Array.isArray(document.productsSupplied)
    ? document.productsSupplied
    : String(document.productsSupplied || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    ...document,
    id: document.$id || document.id,
    productsSupplied,
    totalPurchase: Number(document.totalPurchase || 0),
    paymentDue: Number(document.paymentDue || 0),
  };
}

export async function listSuppliers(userId, options = {}) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || 100),
      ],
    );

    return response.documents.map(toSupplierRecord);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load suppliers.');
  }
}

export async function getSupplier(userId, supplierId) {
  try {
    const supplier = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      supplierId,
    );

    assertOwnsDocument(supplier, userId, 'Supplier');
    return toSupplierRecord(supplier);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load supplier details.');
  }
}

export async function createSupplier(userId, supplierData) {
  const now = new Date().toISOString();
  const normalized = normalizeSupplierInput(supplierData);
  assertRequiredSupplierFields(normalized);

  try {
    const createdSupplier = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      ID.unique(),
      {
        ...normalized,
        userId,
        createdAt: now,
        updatedAt: now,
      },
      userDocumentPermissions(userId),
    );

    return toSupplierRecord(createdSupplier);
  } catch (error) {
    throw createFriendlyAppwriteError(
      error,
      'Could not add supplier. Please check Appwrite permissions.',
    );
  }
}

export async function updateSupplier(userId, supplierId, supplierData) {
  try {
    const existingSupplier = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      supplierId,
    );

    assertOwnsDocument(existingSupplier, userId, 'Supplier');

    const normalized = normalizeSupplierInput({
      ...existingSupplier,
      ...supplierData,
      paymentStatus:
        supplierData.paymentStatus === 'Overdue'
          ? 'Overdue'
          : supplierData.paymentStatus,
    });
    assertRequiredSupplierFields(normalized);

    const updatedSupplier = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      supplierId,
      {
        ...pickAllowedFields(normalized),
        updatedAt: new Date().toISOString(),
      },
    );

    return toSupplierRecord(updatedSupplier);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save supplier.');
  }
}

export async function deleteSupplier(userId, supplierId) {
  try {
    const existingSupplier = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.SUPPLIERS,
      supplierId,
    );

    assertOwnsDocument(existingSupplier, userId, 'Supplier');
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.SUPPLIERS, supplierId);

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete supplier.');
  }
}

export async function searchSuppliers(userId, filters = {}) {
  const suppliers = await listSuppliers(userId, { limit: filters.limit || 100 });
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  return suppliers.filter((supplier) => {
    const status = getSupplierPaymentStatus(supplier);
    const matchesSearch =
      !searchTerm ||
      supplier.name.toLowerCase().includes(searchTerm) ||
      String(supplier.phone || '').toLowerCase().includes(searchTerm) ||
      supplier.productsSupplied.join(' ').toLowerCase().includes(searchTerm) ||
      String(supplier.category || '').toLowerCase().includes(searchTerm);
    const matchesStatus =
      !filters.paymentStatus ||
      filters.paymentStatus === 'All Suppliers' ||
      status === filters.paymentStatus;
    const matchesCategory =
      !filters.category ||
      filters.category === 'All Categories' ||
      supplier.category === filters.category;

    return matchesSearch && matchesStatus && matchesCategory;
  });
}

export async function markSupplierPaid(userId, supplierId) {
  const supplier = await getSupplier(userId, supplierId);

  return updateSupplier(userId, supplierId, {
    ...supplier,
    paymentDue: 0,
    paymentStatus: 'Paid',
    lastPaymentDate: new Date().toISOString(),
  });
}

export function getSupplierStats(suppliers) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    totalSuppliers: suppliers.length,
    totalPaymentDue: suppliers.reduce(
      (sum, supplier) => sum + Number(supplier.paymentDue || 0),
      0,
    ),
    activeSuppliers: suppliers.filter((supplier) => Number(supplier.totalPurchase || 0) > 0).length,
    invoicesThisMonth: suppliers.filter((supplier) => {
      const date = new Date(supplier.lastInvoiceDate);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length,
    paidSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Paid').length,
    dueSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Due').length,
    overdueSuppliers: suppliers.filter((supplier) => getSupplierPaymentStatus(supplier) === 'Overdue').length,
  };
}
