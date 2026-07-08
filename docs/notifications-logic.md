# Notifications Logic

This document describes Prompt 27: real in-app notification generation and management from Appwrite business data.

## Scope

Notifications are generated from deterministic frontend rules and stored in Appwrite. This step does not send push notifications, email, SMS, or WhatsApp messages. It does not use AI or background scheduled jobs.

## Collections Used

Database: `msme_pilot`

Required:

- `notifications`
- `products`
- `customers`
- `suppliers`
- `sales`
- `purchase_invoices`
- `business_health_snapshots`

Optional:

- `payments`
- `generated_reports`

All reads are filtered by `userId`.

## Notification Schema

Documents in `notifications` use:

- `userId`
- `title`
- `message`
- `type`
- `priority`
- `status`
- `actionLabel`
- `routeTarget`
- `relatedEntityType`
- `relatedEntityId`
- `readAt`
- `archivedAt`
- `createdAt`
- `updatedAt`

## Status Lifecycle

- `Unread`: newly generated or escalated alert
- `Read`: user has marked it as read
- `Archived`: hidden from active alert counts

Supported actions:

- Mark read
- Mark unread
- Archive
- Delete
- Bulk mark read
- Bulk archive
- Bulk delete

## Permission Model

Created notifications use per-user permissions:

- read: current user
- update: current user
- delete: current user

No public notifications are created.

## Generation Rules

### Low Stock

Products create alerts when:

- `stock <= 0`: Critical out-of-stock notification
- `stock > 0 && stock <= minStock`: High low-stock notification

### Customer Payments

Customers create alerts when:

- `pendingAmount > 10000`: High customer pending notification
- `paymentStatus === "Overdue"`: Critical payment due notification

### Supplier Payments

Suppliers create alerts when `paymentDue > 0`.

Priority:

- Critical for overdue
- High for due amount >= 10000
- Medium otherwise

### Purchase Invoices

Invoices create alerts when:

- `Pending Review`: review invoice
- `Failed OCR`: review manually
- `Approved` and `inventoryUpdated === false`: inventory sync warning

### Sales

Sales create alerts when:

- sales due amount is pending
- no sales exist for the current month
- cancelled sales exist

### Business Health

Health snapshots create alerts when:

- score < 40: Critical
- score >= 40 and < 60: High
- score improved compared to previous snapshot: Low positive alert

### GST

If sales or purchase invoices exist for the current month, the app creates a GST summary reminder.

This is only an estimate from business records. It is not a legal GST filing.

### Reports

Generated reports create low-priority report notifications. If no monthly report exists but business data exists, the app suggests generating one.

## Duplicate Prevention

Generated notifications are matched using:

- `type`
- `relatedEntityType`
- `relatedEntityId`
- `title`

The fingerprint is used in local sync logic only. It is not stored because the current Appwrite schema does not include a `fingerprint` attribute.

If an active duplicate exists:

- message, priority, route, and action label may be updated
- status is not reset unless priority escalates

Archived matching notifications are not recreated.

## Current Limitations

- In-app only
- No push/email/WhatsApp delivery
- No scheduled background generation
- No AI-generated notifications
- Notification preferences are local until `app_settings` integration

## Troubleshooting

Missing collection:

- Run `npm run appwrite:setup`.
- Confirm `notifications` exists.
- Confirm source collections have `userId` indexes.

Permission denied:

- Confirm the user is logged in.
- Confirm authenticated users can create notification documents.
- Confirm document-level security and per-user permissions are configured.

Duplicate alerts:

- Refresh uses fingerprint matching.
- Archived alerts are intentionally not recreated unless the underlying issue changes in a future backend implementation.

Empty alerts:

- Add products, customers, suppliers, sales, invoices, or health snapshots.
- Click `Refresh Alerts`.

Query/index issue:

- Confirm `userId`, `status`, and `createdAt` indexes exist on `notifications`.

## Next Step

Prompt 28: AI Assistant Backend with secure Appwrite Function.
