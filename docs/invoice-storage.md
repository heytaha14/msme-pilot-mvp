# MSME Pilot Invoice Storage

Prompt 22 connects Invoice Scanner and Invoices to Appwrite Storage and Database.

## Appwrite Resources

Database ID: `msme_pilot`

Collections:

- `purchase_invoices`: scanned purchase invoice headers and extraction metadata.
- `invoice_items`: item rows extracted or reviewed for each invoice.
- `suppliers`: supplier linking is prepared through `supplierId`, but supplier purchase syncing remains a later automation.

Storage bucket:

- `invoice_images`: private invoice images and PDFs.

## File Upload Flow

Invoice Scanner now uploads selected invoice files to Appwrite Storage before the simulated OCR workflow continues.

Allowed types:

- JPG / JPEG
- PNG
- WEBP
- PDF

Maximum file size: 10MB.

Files are created with per-user permissions:

- `read: Role.user(userId)`
- `update: Role.user(userId)`
- `delete: Role.user(userId)`

Files are not public.

## Invoice Scanner Flow

1. User selects an invoice image or PDF.
2. The frontend validates file type and size.
3. The file is uploaded to `invoice_images`.
4. Existing OCR and AI workflow remains simulated locally.
5. A real `purchase_invoices` document is created.
6. Real `invoice_items` documents are created.
7. The invoice appears on the Invoices page and recent scans list.
8. Approving the invoice sets status to `Approved`.

The mock OCR data currently saves:

- supplier: ABC Traders
- invoice number: ABC-2026-071
- invoice date: 2026-07-05
- subtotal: 8540
- GST amount: 1122
- total amount: 9662
- extracted text
- serialized AI extraction JSON

## Document Permission Model

Invoice documents and invoice item documents include:

- `userId`
- `createdAt`
- `updatedAt`

They are created with per-user document permissions:

- `read: Role.user(userId)`
- `update: Role.user(userId)`
- `delete: Role.user(userId)`

All reads query by `userId`.

## Invoices Page CRUD

The Invoices page now:

- loads real purchase invoices from Appwrite
- shows real invoice stats
- filters/searches/sorts client-side
- views invoice details and file links
- reviews invoice fields and item quantities/amounts
- approves invoices
- deletes invoice documents, item rows, and optionally uploaded files

## What Remains Simulated

These are intentionally not connected yet:

- real Tesseract OCR
- real GPT/AI invoice extraction
- automatic product matching
- purchase inventory update automation
- supplier payment ledger
- GST filing
- PDF generation
- WhatsApp/email

Approval currently marks the invoice as `Approved` and keeps `inventoryUpdated` false. Inventory update automation should be implemented after OCR/AI extraction and product matching are reliable.

## Troubleshooting

- Missing bucket: run Prompt 17 schema setup and confirm `invoice_images` exists.
- Permission denied: check bucket file security and collection document security.
- Unsupported file type: upload JPG, PNG, WEBP, or PDF.
- File too large: keep invoice uploads under 10MB.
- Missing collection: confirm `purchase_invoices` and `invoice_items` exist.
- Missing index: rerun schema setup so `userId` and `invoiceId` indexes exist.
- User not authenticated: login again and confirm Appwrite Web platform hostname is configured.

## Next Step

Prompt 23: OCR Integration with Tesseract.js.
