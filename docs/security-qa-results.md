# Security QA Results

Date: 08 Jul 2026

## Completed Checks

### Repository Secret Hygiene

- `.gitignore` ignores `.env`, `.env.local`, `.env.*`, and `.env.*.local`.
- `.env.example` is intentionally allowed and contains placeholders plus frontend-safe IDs.
- Source scan found no frontend API key variable assignment.
- Secret-related references found in docs and server-side function files are expected warnings/instructions, not exposed key values.

### Frontend Permission Helpers

Added:

- `src/utils/appwritePermissions.js`
- `src/utils/ownership.js`
- `src/utils/validation.js`

Updated services to use shared per-user document/file permission helpers where records are created.

### Ownership Checks

The Appwrite services continue to query by `userId` and verify ownership before sensitive update/delete operations.

### Appwrite Functions

Reviewed:

- `functions/parse-invoice-ai`
- `functions/ai-business-assistant`

Both functions keep API keys server-side, verify authenticated Appwrite JWTs, check user mismatch, and query business context by `userId`.

### Error Handling

Updated friendly error handling for:

- Expired sessions
- Missing scope/session issues
- Rate limiting
- Unexpected AI response schema

## Automated Validation

Run locally:

```bash
npm run build
npm run security:audit
```

`npm run security:audit` requires backend/setup env:

```env
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_DATABASE_ID=msme_pilot
APPWRITE_API_KEY=
```

The audit script skips safely if required backend env is missing.

### Previous Audit Result Before Free-Plan Bucket Mapping

`npm run security:audit` reached Appwrite successfully before bucket constants were consolidated.

- Passed: 33
- Warnings: 0
- Critical: 3
- Skipped: 0

Passing checks:

- All 15 database collections exist.
- All 15 collections have document security enabled.
- No collection has public/guest permissions.
- `invoice_images` bucket exists, is enabled, has file security enabled, and has no public/guest permissions.

Previous blockers:

- `product_images` bucket is missing.
- `company_logos` bucket is missing.
- `report_pdfs` bucket is missing.

`npm run appwrite:setup` was run after the audit. It confirmed the missing buckets could not be created on the current Appwrite plan because the project had reached the bucket limit. The follow-up fix was to consolidate bucket constants to the existing `invoice_images` bucket.

### Free-Plan Fix Applied

The app now maps all bucket IDs to the single existing private bucket:

- `INVOICE_IMAGES` -> `invoice_images`
- `PRODUCT_IMAGES` -> `invoice_images`
- `COMPANY_LOGOS` -> `invoice_images`
- `REPORT_PDFS` -> `invoice_images`

The setup and security audit scripts deduplicate bucket IDs, so Appwrite Free can pass with only `invoice_images`.

### Latest Audit Result After Free-Plan Mapping

`npm run security:audit` now passes with the Appwrite Free bucket strategy:

- Passed: 33
- Warnings: 0
- Critical: 0
- Skipped: 0

Confirmed:

- All 15 database collections exist.
- All 15 collections have document security enabled.
- No collection has public/guest permissions.
- The shared `invoice_images` bucket exists, is enabled, has file security enabled, and has no public/guest permissions.

## Manual Appwrite Console Checks Still Required

- Confirm all collections have document security enabled.
- Confirm collection permissions are not public.
- Confirm `invoice_images` is private with file security enabled.
- Confirm existing documents/files created before this pass have per-user permissions.
- Confirm any previously exposed API key has been revoked.

## Result

The codebase now has repeatable Appwrite security auditing and shared permission utilities. Live Appwrite collection security passes, and Appwrite Free storage is handled through the single shared `invoice_images` bucket.
