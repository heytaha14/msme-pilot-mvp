import { DATABASE_ID, COLLECTION_IDS } from '../config/appwriteSchema.js';
import { databases, ID, Query } from '../lib/appwrite.js';
import { userDocumentPermissions } from '../utils/appwritePermissions.js';
import { createFriendlyAppwriteError } from '../utils/appwriteErrors.js';
import { assertOwnsDocument } from '../utils/ownership.js';
import {
  buildAllBusinessNotifications,
  getNotificationFingerprint,
} from '../utils/notificationRules.js';
import { listAllDocuments } from './reportService.js';

const priorityOrder = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const collectionLimits = {
  notifications: 200,
  products: 500,
  customers: 500,
  suppliers: 500,
  sales: 500,
  purchaseInvoices: 500,
  healthSnapshots: 30,
  payments: 200,
  generatedReports: 30,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInputDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function formatTimeLabel(date) {
  if (!date) return 'Recently';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Recently';

  const today = new Date();
  const diffMs = today.getTime() - parsed.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (parsed.toDateString() === today.toDateString()) {
    return `Today, ${parsed.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  if (diffMs < 2 * dayMs) return 'Yesterday';
  if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)} days ago`;

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeNotification(document) {
  return {
    ...document,
    id: document.$id || document.id,
    timeLabel: formatTimeLabel(document.createdAt || document.$createdAt),
    relatedEntity: document.relatedEntityType || '',
  };
}

function normalizeProduct(document) {
  return {
    ...document,
    id: document.$id || document.id,
    name: document.name || document.productName,
    productName: document.productName || document.name,
    stock: toNumber(document.stock ?? document.currentStock),
    currentStock: toNumber(document.stock ?? document.currentStock),
    minStock: toNumber(document.minStock ?? document.minimumStock),
    minimumStock: toNumber(document.minStock ?? document.minimumStock),
  };
}

function normalizeCustomer(document) {
  return {
    ...document,
    id: document.$id || document.id,
    pendingAmount: toNumber(document.pendingAmount),
    totalPurchases: toNumber(document.totalPurchases),
  };
}

function normalizeSupplier(document) {
  return {
    ...document,
    id: document.$id || document.id,
    paymentDue: toNumber(document.paymentDue),
    totalPurchase: toNumber(document.totalPurchase),
  };
}

function normalizeSale(document) {
  return {
    ...document,
    id: document.$id || document.id,
    saleDate: toInputDate(document.saleDate),
    totalAmount: toNumber(document.totalAmount),
    dueAmount: toNumber(document.dueAmount),
    gstAmount: toNumber(document.gstAmount),
  };
}

function normalizePurchaseInvoice(document) {
  return {
    ...document,
    id: document.$id || document.id,
    invoiceDate: toInputDate(document.invoiceDate),
    totalAmount: toNumber(document.totalAmount),
    gstAmount: toNumber(document.gstAmount),
    inventoryUpdated: Boolean(document.inventoryUpdated),
  };
}

function normalizeSnapshot(document) {
  return {
    ...document,
    id: document.$id || document.id,
    score: toNumber(document.score),
  };
}

async function loadCollection(label, collectionId, userId, limit, warnings) {
  try {
    return await listAllDocuments(collectionId, userId, {
      limit,
      orderDesc: 'createdAt',
    });
  } catch {
    warnings.push(`${label} alerts could not be scanned.`);
    return [];
  }
}

async function loadNotificationSourceData(userId) {
  const warnings = [];
  const [
    products,
    customers,
    suppliers,
    sales,
    purchaseInvoices,
    healthSnapshots,
    payments,
    generatedReports,
  ] = await Promise.all([
    loadCollection('Products', COLLECTION_IDS.PRODUCTS, userId, collectionLimits.products, warnings),
    loadCollection('Customers', COLLECTION_IDS.CUSTOMERS, userId, collectionLimits.customers, warnings),
    loadCollection('Suppliers', COLLECTION_IDS.SUPPLIERS, userId, collectionLimits.suppliers, warnings),
    loadCollection('Sales', COLLECTION_IDS.SALES, userId, collectionLimits.sales, warnings),
    loadCollection('Purchase invoices', COLLECTION_IDS.PURCHASE_INVOICES, userId, collectionLimits.purchaseInvoices, warnings),
    loadCollection('Business health', COLLECTION_IDS.BUSINESS_HEALTH_SNAPSHOTS, userId, collectionLimits.healthSnapshots, warnings),
    loadCollection('Payments', COLLECTION_IDS.PAYMENTS, userId, collectionLimits.payments, warnings),
    loadCollection('Generated reports', COLLECTION_IDS.GENERATED_REPORTS, userId, collectionLimits.generatedReports, warnings),
  ]);

  return {
    products: products.map(normalizeProduct),
    customers: customers.map(normalizeCustomer),
    suppliers: suppliers.map(normalizeSupplier),
    sales: sales.map(normalizeSale),
    purchaseInvoices: purchaseInvoices.map(normalizePurchaseInvoice),
    healthSnapshots: healthSnapshots.map(normalizeSnapshot),
    payments,
    generatedReports,
    warnings,
  };
}

function sanitizeNotificationData(notificationData, userId) {
  const now = new Date().toISOString();
  return {
    userId,
    title: notificationData.title,
    message: notificationData.message,
    type: notificationData.type,
    priority: notificationData.priority || 'Low',
    status: notificationData.status || 'Unread',
    actionLabel: notificationData.actionLabel || 'Open',
    routeTarget: notificationData.routeTarget || '/dashboard',
    relatedEntityType: notificationData.relatedEntityType || '',
    relatedEntityId: notificationData.relatedEntityId || '',
    readAt: notificationData.readAt || null,
    archivedAt: notificationData.archivedAt || null,
    createdAt: notificationData.createdAt || now,
    updatedAt: notificationData.updatedAt || now,
  };
}

function allowedUpdate(data) {
  const allowed = [
    'title',
    'message',
    'type',
    'priority',
    'status',
    'actionLabel',
    'routeTarget',
    'relatedEntityType',
    'relatedEntityId',
    'readAt',
    'archivedAt',
    'updatedAt',
  ];

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => allowed.includes(key)),
  );
}

async function assertNotificationOwner(userId, notificationId) {
  const notification = await databases.getDocument(
    DATABASE_ID,
    COLLECTION_IDS.NOTIFICATIONS,
    notificationId,
  );

  assertOwnsDocument(notification, userId, 'Notification');

  return notification;
}

export async function listNotifications(userId, options = {}) {
  try {
    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('createdAt'),
      Query.limit(options.limit || collectionLimits.notifications),
    ];

    if (options.status && options.status !== 'All') {
      queries.splice(1, 0, Query.equal('status', options.status));
    }

    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.NOTIFICATIONS,
      queries,
    );

    return response.documents.map(normalizeNotification);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load notifications.');
  }
}

export async function getNotification(userId, notificationId) {
  try {
    return normalizeNotification(await assertNotificationOwner(userId, notificationId));
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not load notification.');
  }
}

export async function createNotification(userId, notificationData) {
  try {
    const created = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_IDS.NOTIFICATIONS,
      ID.unique(),
      sanitizeNotificationData(notificationData, userId),
      userDocumentPermissions(userId),
    );

    return normalizeNotification(created);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not create notification.');
  }
}

export async function updateNotification(userId, notificationId, data) {
  try {
    await assertNotificationOwner(userId, notificationId);
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.NOTIFICATIONS,
      notificationId,
      allowedUpdate({
        ...data,
        updatedAt: new Date().toISOString(),
      }),
    );

    return normalizeNotification(updated);
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not update notification.');
  }
}

export async function deleteNotification(userId, notificationId) {
  try {
    await assertNotificationOwner(userId, notificationId);
    await databases.deleteDocument(DATABASE_ID, COLLECTION_IDS.NOTIFICATIONS, notificationId);
    return { success: true };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not delete notification.');
  }
}

export async function markNotificationRead(userId, notificationId) {
  return updateNotification(userId, notificationId, {
    status: 'Read',
    readAt: new Date().toISOString(),
  });
}

export async function markNotificationUnread(userId, notificationId) {
  return updateNotification(userId, notificationId, {
    status: 'Unread',
    readAt: null,
  });
}

export async function archiveNotification(userId, notificationId) {
  return updateNotification(userId, notificationId, {
    status: 'Archived',
    archivedAt: new Date().toISOString(),
  });
}

export async function markAllNotificationsRead(userId) {
  const notifications = await listNotifications(userId);
  const unread = notifications.filter((notification) => notification.status === 'Unread');
  const updated = await Promise.all(
    unread.map((notification) => markNotificationRead(userId, notification.id)),
  );
  return updated;
}

export async function archiveNotifications(userId, notificationIds) {
  return Promise.all(notificationIds.map((id) => archiveNotification(userId, id)));
}

export async function deleteNotifications(userId, notificationIds) {
  return Promise.all(notificationIds.map((id) => deleteNotification(userId, id)));
}

export async function generateBusinessNotifications(userId, options = {}) {
  try {
    const data = options.data || (await loadNotificationSourceData(userId));
    const notifications = buildAllBusinessNotifications(data)
      .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
      .slice(0, 30);

    return {
      notifications,
      warnings: data.warnings || [],
    };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not refresh business alerts.');
  }
}

export async function syncGeneratedNotifications(userId, generatedNotifications) {
  try {
    const existing = await listNotifications(userId, { limit: 200 });
    const created = [];
    const updated = [];

    for (const generated of generatedNotifications) {
      const fingerprint = getNotificationFingerprint(generated);
      const matching = existing.find((notification) =>
        getNotificationFingerprint(notification) === fingerprint,
      );

      if (!matching) {
        created.push(await createNotification(userId, generated));
        continue;
      }

      if (matching.status === 'Archived') {
        continue;
      }

      const priorityEscalated =
        (priorityOrder[generated.priority] || 0) > (priorityOrder[matching.priority] || 0);
      const needsUpdate =
        matching.message !== generated.message ||
        matching.priority !== generated.priority ||
        matching.actionLabel !== generated.actionLabel ||
        matching.routeTarget !== generated.routeTarget;

      if (needsUpdate || priorityEscalated) {
        updated.push(await updateNotification(userId, matching.id, {
          message: generated.message,
          priority: generated.priority,
          actionLabel: generated.actionLabel,
          routeTarget: generated.routeTarget,
          status: priorityEscalated ? 'Unread' : matching.status,
        }));
      }
    }

    return { created, updated };
  } catch (error) {
    throw createFriendlyAppwriteError(error, 'Could not sync generated notifications.');
  }
}

export function getNotificationStats(notifications = []) {
  const active = notifications.filter((notification) => notification.status !== 'Archived');
  const today = new Date().toDateString();

  return {
    totalAlerts: active.length,
    unread: active.filter((notification) => notification.status === 'Unread').length,
    critical: active.filter((notification) => notification.priority === 'Critical').length,
    dueToday: active.filter((notification) => {
      const parsed = new Date(notification.createdAt || notification.$createdAt);
      return !Number.isNaN(parsed.getTime()) && parsed.toDateString() === today;
    }).length,
    archived: notifications.filter((notification) => notification.status === 'Archived').length,
  };
}

export function searchNotifications(notifications = [], filters = {}) {
  const searchTerm = (filters.search || '').trim().toLowerCase();

  return notifications.filter((notification) => {
    const matchesSearch =
      !searchTerm ||
      [
        notification.title,
        notification.message,
        notification.type,
        notification.relatedEntityType,
        notification.relatedEntityId,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    const matchesType = !filters.type || filters.type === 'All Types' || notification.type === filters.type;
    const matchesPriority =
      !filters.priority ||
      filters.priority === 'All Priority' ||
      notification.priority === filters.priority;
    const matchesStatus = !filters.status || filters.status === 'All' || notification.status === filters.status;

    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });
}
