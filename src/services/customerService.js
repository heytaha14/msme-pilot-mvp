import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Permission, Query, Role } from '../lib/appwrite.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { getCustomerPaymentStatus } from '../utils/formatters.js';

const allowedCustomerFields = [
  'name',
  'phone',
  'address',
  'totalPurchases',
  'pendingAmount',
  'paymentStatus',
  'notes',
  'lastPurchaseDate',
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCustomerInput(customerData) {
  const pendingAmount = toNumber(customerData.pendingAmount);
  const paymentStatus =
    customerData.paymentStatus === 'Overdue'
      ? 'Overdue'
      : pendingAmount > 0
        ? 'Pending'
        : 'Paid';

  return {
    name: customerData.name?.trim() || '',
    phone: customerData.phone?.trim() || '',
    address: customerData.address?.trim() || '',
    totalPurchases: toNumber(customerData.totalPurchases),
    pendingAmount,
    paymentStatus,
    notes: customerData.notes?.trim() || '',
    lastPurchaseDate: customerData.lastPurchaseDate || new Date().toISOString(),
  };
}

function assertRequiredCustomerFields(customerData) {
  if (!customerData.name) {
    throw new Error('Customer name is required.');
  }

  if (!customerData.phone) {
    throw new Error('Phone number is required.');
  }

  if (customerData.pendingAmount < 0) {
    throw new Error('Pending amount must be 0 or more.');
  }
}

function pickAllowedFields(customerData) {
  return allowedCustomerFields.reduce((picked, field) => {
    if (customerData[field] !== undefined) {
      picked[field] = customerData[field];
    }

    return picked;
  }, {});
}

function assertCustomerOwner(customer, userId) {
  if (!customer || customer.userId !== userId) {
    throw new Error('Permission error. Customer does not belong to the current user.');
  }
}

export function toCustomerRecord(document) {
  return {
    ...document,
    id: document.$id || document.id,
    totalPurchases: Number(document.totalPurchases || 0),
    pendingAmount: Number(document.pendingAmount || 0),
  };
}

export async function listCustomers(userId, options = {}) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(options.limit || 100),
      ],
    );

    return response.documents.map(toCustomerRecord);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load customers.');
  }
}

export async function getCustomer(userId, customerId) {
  try {
    const customer = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      customerId,
    );

    assertCustomerOwner(customer, userId);
    return toCustomerRecord(customer);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load customer details.');
  }
}

export async function createCustomer(userId, customerData) {
  const now = new Date().toISOString();
  const normalized = normalizeCustomerInput(customerData);
  assertRequiredCustomerFields(normalized);

  try {
    const createdCustomer = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      ID.unique(),
      {
        ...normalized,
        userId,
        createdAt: now,
        updatedAt: now,
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ],
    );

    return toCustomerRecord(createdCustomer);
  } catch (error) {
    throw createFriendlyAppwriteError(
      error,
      'Could not add customer. Please check Appwrite permissions.',
    );
  }
}

export async function updateCustomer(userId, customerId, customerData) {
  try {
    const existingCustomer = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      customerId,
    );

    assertCustomerOwner(existingCustomer, userId);

    const normalized = normalizeCustomerInput({
      ...existingCustomer,
      ...customerData,
      paymentStatus:
        customerData.paymentStatus === 'Overdue'
          ? 'Overdue'
          : customerData.paymentStatus,
    });
    assertRequiredCustomerFields(normalized);

    const updatedCustomer = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      customerId,
      {
        ...pickAllowedFields(normalized),
        updatedAt: new Date().toISOString(),
      },
    );

    return toCustomerRecord(updatedCustomer);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not save customer.');
  }
}

export async function deleteCustomer(userId, customerId) {
  try {
    const existingCustomer = await databases.getDocument(
      DATABASE_ID,
      COLLECTION_IDS.CUSTOMERS,
      customerId,
    );

    assertCustomerOwner(existingCustomer, userId);
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.CUSTOMERS, customerId);

    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete customer.');
  }
}

export async function searchCustomers(userId, filters = {}) {
  const customers = await listCustomers(userId, { limit: filters.limit || 100 });
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  return customers.filter((customer) => {
    const status = getCustomerPaymentStatus(customer);
    const matchesSearch =
      !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm) ||
      String(customer.phone || '').toLowerCase().includes(searchTerm) ||
      String(customer.address || '').toLowerCase().includes(searchTerm);
    const matchesStatus =
      !filters.paymentStatus ||
      filters.paymentStatus === 'All Customers' ||
      status === filters.paymentStatus;

    return matchesSearch && matchesStatus;
  });
}

export async function recordCustomerPayment(userId, customerId, paymentData = {}) {
  const customer = await getCustomer(userId, customerId);
  const paymentAmount =
    paymentData.markPaid ? customer.pendingAmount : toNumber(paymentData.amount);
  const nextPendingAmount = Math.max(0, customer.pendingAmount - paymentAmount);

  return updateCustomer(userId, customerId, {
    ...customer,
    pendingAmount: nextPendingAmount,
    paymentStatus: nextPendingAmount > 0 ? 'Pending' : 'Paid',
  });
}

function deriveCustomerPaymentStatus(currentStatus, pendingAmount) {
  if (currentStatus === 'Overdue' && pendingAmount > 0) {
    return 'Overdue';
  }

  return pendingAmount > 0 ? 'Pending' : 'Paid';
}

export async function applySaleToCustomer(userId, customerId, saleTotals = {}) {
  const customer = await getCustomer(userId, customerId);
  const saleTotal = toNumber(saleTotals.totalAmount);
  const dueAmount = toNumber(saleTotals.dueAmount);
  const nextPendingAmount = Math.max(0, customer.pendingAmount + dueAmount);

  return updateCustomer(userId, customerId, {
    ...customer,
    totalPurchases: customer.totalPurchases + saleTotal,
    pendingAmount: nextPendingAmount,
    paymentStatus: deriveCustomerPaymentStatus(customer.paymentStatus, nextPendingAmount),
    lastPurchaseDate: saleTotals.saleDate || new Date().toISOString(),
  });
}

export async function reverseSaleFromCustomer(userId, customerId, saleTotals = {}) {
  const customer = await getCustomer(userId, customerId);
  const saleTotal = toNumber(saleTotals.totalAmount);
  const dueAmount = toNumber(saleTotals.dueAmount);
  const nextPendingAmount = Math.max(0, customer.pendingAmount - dueAmount);

  return updateCustomer(userId, customerId, {
    ...customer,
    totalPurchases: Math.max(0, customer.totalPurchases - saleTotal),
    pendingAmount: nextPendingAmount,
    paymentStatus: deriveCustomerPaymentStatus(customer.paymentStatus, nextPendingAmount),
  });
}

export async function updateCustomerDueAfterSale(userId, customerId, totalAmount, paidAmount) {
  return applySaleToCustomer(userId, customerId, {
    totalAmount,
    dueAmount: Math.max(0, toNumber(totalAmount) - toNumber(paidAmount)),
    saleDate: new Date().toISOString(),
  });
}

export async function adjustCustomerPendingAmount(userId, customerId, amountDelta) {
  const customer = await getCustomer(userId, customerId);
  const nextPendingAmount = Math.max(0, customer.pendingAmount + toNumber(amountDelta));

  return updateCustomer(userId, customerId, {
    ...customer,
    pendingAmount: nextPendingAmount,
    paymentStatus: deriveCustomerPaymentStatus(customer.paymentStatus, nextPendingAmount),
  });
}

export function getCustomerStats(customers) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  return {
    totalCustomers: customers.length,
    pendingAmountTotal: customers.reduce(
      (sum, customer) => sum + Number(customer.pendingAmount || 0),
      0,
    ),
    activeCustomers: customers.filter((customer) => Number(customer.totalPurchases || 0) > 0).length,
    newThisMonth: customers.filter((customer) => {
      const date = new Date(customer.createdAt || customer.$createdAt);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length,
    paidCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Paid').length,
    pendingCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Pending').length,
    overdueCustomers: customers.filter((customer) => getCustomerPaymentStatus(customer) === 'Overdue').length,
  };
}
