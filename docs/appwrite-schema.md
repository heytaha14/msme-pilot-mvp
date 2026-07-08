# MSME Pilot Appwrite Schema

This document describes the Appwrite backend foundation for MSME Pilot.

## Project

- Appwrite endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `6a4b9c4c001d2015e28a`
- Database ID: `msme_pilot`
- Database name: `MSME Pilot`

The setup script is idempotent and safe to run multiple times. It checks for each database, collection, attribute, index, and bucket before creating it.

## Security Model

- No public read or write access is granted.
- No anonymous access is granted.
- Business collections use document-level security.
- Collection-level create permission is granted to authenticated users using `create("users")`.
- Real per-document read, update, and delete permissions will be added during CRUD integration.
- Storage buckets are private, use file-level security, and only allow authenticated users to create files.
- API keys must stay server-side only.

Important API key rules:

- Never put `APPWRITE_API_KEY` in `src/`.
- Never expose an Appwrite API key through Vite.
- Never create `VITE_APPWRITE_API_KEY`.
- Never commit `.env`.
- Use `.env.example` only for placeholders.

## Environment Variables

Copy `.env.example` to `.env` locally and fill the values:

```bash
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a

APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
APPWRITE_DATABASE_ID=msme_pilot
APPWRITE_API_KEY=
```

If `APPWRITE_API_KEY` is missing, the frontend still builds. The setup script will stop with a helpful error.

Run setup manually:

```bash
npm run appwrite:setup
```

## Collections

All business data collections include `userId`, `createdAt`, and `updatedAt`.

### business_profiles

Purpose: Stores owner and business profile connected to Appwrite Auth user. Uses `business_profiles`, not `users`, because Appwrite Auth already owns users.

Important attributes: `userId`, `ownerName`, `email`, `phone`, `language`, `timezone`, `businessName`, `businessType`, `industry`, `gstRegistered`, `gstin`, `pan`, address/contact fields, `logoFileId`, `profileCompletion`, `plan`, `accountStatus`.

Indexes: `unique_userId`, `email_index`, `businessName_index`, `createdAt_index`.

### products

Purpose: Stores inventory products.

Important attributes: `name`, `category`, `barcode`, `supplierId`, `supplierName`, `purchasePrice`, `sellingPrice`, `gstPercentage`, `stock`, `minStock`, `unit`, `imageFileId`, `status`, `notes`.

Indexes: `userId_index`, `name_index`, `category_index`, `barcode_index`, `supplierId_index`, `stock_index`, `createdAt_index`.

### inventory_movements

Purpose: Tracks stock increases, sales deductions, adjustments, returns, damage, and invoice scan updates.

Important attributes: `productId`, `productName`, `movementType`, `quantity`, `previousStock`, `newStock`, `referenceType`, `referenceId`, `note`.

Conceptual `movementType` values: `purchase`, `sale`, `adjustment`, `return`, `damage`, `invoice_scan`.

Indexes: `userId_index`, `productId_index`, `movementType_index`, `referenceId_index`, `createdAt_index`.

### customers

Purpose: Stores customer CRM and pending payments.

Important attributes: `name`, `phone`, `address`, `totalPurchases`, `pendingAmount`, `paymentStatus`, `notes`, `lastPurchaseDate`.

Indexes: `userId_index`, `name_index`, `phone_index`, `paymentStatus_index`, `pendingAmount_index`, `lastPurchaseDate_index`, `createdAt_index`.

### suppliers

Purpose: Stores supplier/vendor records and supplier dues.

Important attributes: `name`, `phone`, `address`, `productsSupplied`, `category`, `totalPurchase`, `paymentDue`, `paymentStatus`, `notes`, `lastInvoiceDate`, `lastPaymentDate`.

Indexes: `userId_index`, `name_index`, `phone_index`, `category_index`, `paymentStatus_index`, `paymentDue_index`, `lastInvoiceDate_index`, `createdAt_index`.

### sales

Purpose: Stores sales invoice headers.

Important attributes: `invoiceNumber`, `customerId`, `customerName`, `customerPhone`, `subtotal`, `gstAmount`, `totalAmount`, `profit`, `paidAmount`, `dueAmount`, `paymentStatus`, `saleDate`, `notes`.

Indexes: `userId_index`, `invoiceNumber_index`, `customerId_index`, `customerName_index`, `paymentStatus_index`, `saleDate_index`, `createdAt_index`.

### sale_items

Purpose: Stores individual sale line items.

Important attributes: `saleId`, `productId`, `productName`, `quantity`, `unit`, `sellingPrice`, `purchasePrice`, `gstPercentage`, `lineSubtotal`, `lineGst`, `lineTotal`, `profit`.

Indexes: `userId_index`, `saleId_index`, `productId_index`, `productName_index`, `createdAt_index`.

### purchase_invoices

Purpose: Stores uploaded/scanned supplier purchase invoices.

Important attributes: `invoiceNumber`, `supplierId`, `supplierName`, `supplierPhone`, `invoiceDate`, `subtotal`, `gstAmount`, `totalAmount`, `status`, `inventoryUpdated`, `extractedText`, `aiExtractedJson`, `fileId`, `fileName`, `fileType`.

Large JSON/text values are stored as strings for now. Appwrite enforces total
attribute size limits per collection, so `extractedText` remains the large OCR
field while `aiExtractedJson` is kept compact. Full extracted JSON can later move
to Storage or a dedicated detail collection if needed.

Indexes: `userId_index`, `invoiceNumber_index`, `supplierId_index`, `supplierName_index`, `status_index`, `inventoryUpdated_index`, `invoiceDate_index`, `createdAt_index`.

### invoice_items

Purpose: Stores individual purchase invoice extracted items.

Important attributes: `invoiceId`, `productId`, `productName`, `quantity`, `unit`, `amount`, `gstPercentage`, `inventoryAction`.

Indexes: `userId_index`, `invoiceId_index`, `productId_index`, `productName_index`, `createdAt_index`.

### payments

Purpose: Tracks customer payments received and supplier payments made.

Important attributes: `direction`, `entityType`, `entityId`, `entityName`, `amount`, `method`, `status`, `paymentDate`, `referenceId`, `note`.

Conceptual `direction` values: `customer_in`, `supplier_out`.

Conceptual `entityType` values: `customer`, `supplier`.

Conceptual `method` values: `cash`, `upi`, `bank`, `card`, `other`.

Indexes: `userId_index`, `direction_index`, `entityType_index`, `entityId_index`, `status_index`, `paymentDate_index`, `createdAt_index`.

### notifications

Purpose: Stores in-app alerts for stock, payments, invoices, GST, health, and sales.

Important attributes: `title`, `message`, `type`, `priority`, `status`, `actionLabel`, `routeTarget`, `relatedEntityType`, `relatedEntityId`, `readAt`, `archivedAt`.

Indexes: `userId_index`, `type_index`, `priority_index`, `status_index`, `relatedEntityId_index`, `createdAt_index`.

### business_health_snapshots

Purpose: Stores calculated business health score history.

Important attributes: `score`, `status`, `inventoryHealth`, `salesPerformance`, `pendingPaymentsScore`, `customerGrowth`, `profitMargin`, `recommendationsJson`, `risksJson`, `opportunitiesJson`.

Large JSON values are serialized strings for now. Recommendation, risk, and
opportunity JSON fields are intentionally compact to stay within Appwrite
collection attribute size limits.

Indexes: `userId_index`, `score_index`, `status_index`, `createdAt_index`.

### ai_history

Purpose: Stores AI assistant conversation history and saved insights.

Important attributes: `conversationId`, `role`, `message`, `contextType`, `saved`.

Conceptual `role` values: `user`, `assistant`, `system`.

Indexes: `userId_index`, `conversationId_index`, `role_index`, `saved_index`, `createdAt_index`.

### app_settings

Purpose: Stores per-user app/business/settings preferences.

Important attributes: `userId`, `settingsJson`, `createdAt`, `updatedAt`.

Indexes: `unique_userId`, `createdAt_index`.

### generated_reports

Purpose: Stores generated report metadata and optional report file references.

Important attributes: `reportName`, `reportType`, `period`, `status`, `summaryJson`, `fileId`, `generatedAt`.

Indexes: `userId_index`, `reportType_index`, `period_index`, `status_index`, `generatedAt_index`, `createdAt_index`.

## Storage Buckets

MSME Pilot is currently configured for Appwrite Cloud Free plan, which uses one
real private bucket:

### invoice_images

Purpose: Stores uploaded invoice images, invoice PDF files, and any future
demo-safe uploads that need a private shared bucket.

Allowed extensions for new setup: `jpg`, `jpeg`, `png`, `webp`, `pdf`, `svg`.

Security: private, file-level security enabled.

### Free-plan bucket mapping

In `src/config/appwriteSchema.js`, all bucket IDs map to `invoice_images`:

```js
INVOICE_IMAGES: 'invoice_images'
PRODUCT_IMAGES: 'invoice_images'
COMPANY_LOGOS: 'invoice_images'
REPORT_PDFS: 'invoice_images'
```

Invoice upload continues to use `invoice_images`. Product image upload and
company logo upload should remain local/preview-only unless a dedicated upload
service is added later. Report PDF export remains simulated for now.

If the project upgrades from Appwrite Free later, dedicated buckets can be added
again without changing collection schema.

## Setup Script Behavior

`scripts/appwrite/setupSchema.js`:

- Loads `.env.local` and `.env`.
- Validates required `APPWRITE_*` variables.
- Refuses to run if `VITE_APPWRITE_API_KEY` is set.
- Never logs the full API key.
- Creates the database if missing.
- Creates collections if missing.
- Creates attributes if missing.
- Polls attributes until available before creating indexes.
- Creates indexes if missing.
- Creates the shared `invoice_images` bucket if missing.
- Prints a final summary.

## Next Step

Next backend integration prompt: **Prompt 18 Auth Integration**.

That step should connect Appwrite Auth, create sessions, protect app routes, and add per-user document permissions for CRUD flows.
