# MSME Pilot Security Audit

This document records the frontend and Appwrite security posture for MSME Pilot before production CRUD expansion.

## Scope

- Frontend environment variable safety
- Appwrite collection and bucket permissions
- Per-user document and file permissions
- Ownership checks in frontend services
- Appwrite Function authentication checks
- Protected route and session behavior

## Secret Rules

- `APPWRITE_API_KEY` is server/setup/function only.
- `OPENAI_API_KEY` is Appwrite Function only.
- Never create `VITE_APPWRITE_API_KEY`.
- Never create `VITE_OPENAI_API_KEY`.
- Real `.env` and `.env.local` files must not be committed.
- `.env.example` may contain only placeholders and frontend-safe IDs.

The current `.gitignore` ignores real env files and keeps `.env.example` allowed.

## Frontend-Safe Variables

Only these Appwrite values should be exposed to Vite:

```env
VITE_APPWRITE_ENDPOINT=
VITE_APPWRITE_PROJECT_ID=
VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID=
VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=
```

Function IDs are safe identifiers. API keys are not.

## Appwrite Database Security

Database ID: `msme_pilot`

All business collections should:

- Enable document-level security.
- Avoid public or anonymous permissions.
- Allow authenticated users to create documents only where needed.
- Depend on per-document read/update/delete permissions for owned records.
- Include `userId`, `createdAt`, and `updatedAt`.

Frontend services now use shared helpers:

- `userDocumentPermissions(userId)`
- `userFilePermissions(userId)`
- `assertOwnsDocument(document, userId, resourceName)`

These helpers centralize the per-user permission recipe and ownership checks.

## Storage Bucket Security

Buckets:

- `invoice_images` is the only real bucket in Appwrite Cloud Free mode.
- `PRODUCT_IMAGES`, `COMPANY_LOGOS`, and `REPORT_PDFS` map to `invoice_images` in schema constants.

The bucket should:

- Stay private.
- Enable file-level security.
- Avoid public or anonymous permissions.
- Use per-file owner permissions.

Invoice upload now uses `userFilePermissions(userId)`.

## Appwrite Function Security

Functions audited:

- `parse-invoice-ai`
- `ai-business-assistant`

Expected behavior:

- Function secrets live only in Appwrite Function environment variables.
- Function receives authenticated user context from Appwrite.
- Function verifies JWT with Appwrite Account.
- Function rejects user mismatch.
- Function queries by `userId`.
- Function checks document ownership before updating invoice or AI history data.

## Security Audit Script

Run:

```bash
npm run security:audit
```

The script:

- Loads backend env from `.env.local` or `.env`.
- Refuses frontend API key variables.
- Does not print secrets.
- Checks every schema collection for document security.
- Checks collection permissions for public/guest exposure.
- Checks every unique configured storage bucket for file security and public/guest exposure.
- Prints pass/warning/critical counts.

If backend env is missing, the script skips safely so frontend builds are not blocked.

## No Repair Script Yet

No automatic repair script was added. Permission repair can be destructive if run without reviewing live project state. Use the audit report first, then repair intentionally through Appwrite Console or a separate reviewed script.

## Current Limitations

- Existing documents created before this pass should be spot-checked in Appwrite Console for document permissions.
- Collection-level create permissions are acceptable for authenticated users, but read/update/delete should remain document-level.
- Appwrite Console platform hostnames must still be managed manually.
- Appwrite Cloud Free mode intentionally uses only `invoice_images`. Missing `product_images`, `company_logos`, and `report_pdfs` are not blockers while they map to `invoice_images`.

## Next Step

Prompt 30 should continue from this baseline with production readiness or the next CRUD/security integration step.
