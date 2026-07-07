# Reports From Real Appwrite Data

This document describes the Prompt 25 reports integration for MSME Pilot.

## Scope

The Reports page now reads authenticated user data from Appwrite and calculates report summaries in the frontend. It does not call real AI, generate real PDFs, or use backend API keys.

## Collections Used

Database: `msme_pilot`

The reports service reads these collections with the logged-in user's `userId`:

- `products`
- `customers`
- `suppliers`
- `sales`
- `sale_items`
- `purchase_invoices`
- `invoice_items`
- `payments`
- `generated_reports`

The `generated_reports` collection stores saved report metadata and a serialized summary payload.

## Security Model

- The frontend uses only the Appwrite client SDK.
- No `APPWRITE_API_KEY` is used in frontend code.
- No `VITE_APPWRITE_API_KEY` should exist.
- Every query is filtered by the authenticated user's `userId`.
- Saved generated reports are created with per-user read, update, and delete permissions.
- Real server-side report generation can be added later through secure Appwrite Functions.

## Report Types

The page supports:

- Business Overview
- Sales Report
- Profit Report
- Inventory Report
- Customer Report
- Supplier Report
- Payment Report
- GST Summary

Calculations are deterministic and based on stored Appwrite records.

## Calculations

Report calculations live in:

- `src/utils/reportCalculations.js`

The service layer lives in:

- `src/services/reportService.js`

Key calculations include:

- Revenue from non-cancelled sales
- Profit from non-cancelled sales
- Inventory value from product stock and purchase price
- Low-stock and out-of-stock counts
- Customer pending amount
- Supplier payment due
- GST collected from sales
- GST paid from purchase invoices
- Net GST estimate
- Best-selling products from sale items
- Top customers from sales
- Top suppliers from purchase invoices

## Partial Data Handling

If an optional collection is missing or unavailable, the reports page still loads the data it can read and shows a partial data warning. This helps during staged backend rollout when all modules may not be connected yet.

If required schema is missing, run:

```bash
npm run appwrite:setup
```

Then verify collection permissions in the Appwrite Console.

## Generated Reports

Clicking `Generate Report` saves a record to `generated_reports` with:

- `userId`
- `reportName`
- `reportType`
- `period`
- `status`
- `summaryJson`
- `generatedAt`
- `createdAt`
- `updatedAt`

The saved report can be viewed from the recent reports section or deleted locally from Appwrite.

## Export Behavior

PDF, CSV, and share link actions are simulated in the frontend for now. Real export generation should be implemented later using a secure backend flow.

## GST Note

The GST Summary is a business estimate from sales and purchase invoices. It is not a legal GST filing report.

## Troubleshooting

Missing collections:

- Run `npm run appwrite:setup`.
- Confirm the database ID is `msme_pilot`.
- Confirm collection IDs match `src/config/appwriteSchema.js`.

Permission denied:

- Confirm the user is logged in.
- Confirm documents have the correct `userId`.
- Confirm document security and collection create permissions are configured.

No report data:

- Add products, customers, suppliers, sales, and invoices first.
- Refresh the Reports page after CRUD operations.

Generated reports cannot be saved:

- Confirm the `generated_reports` collection exists.
- Confirm its attributes match the schema.
- Confirm authenticated users can create documents and document-level permissions are enabled.

## Next Step

Prompt 26: connect Business Health to real Appwrite data using the same authenticated, per-user data model.
