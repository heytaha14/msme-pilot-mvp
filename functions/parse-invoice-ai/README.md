# parse-invoice-ai

Secure Appwrite Function for MSME Pilot purchase invoice AI extraction.

## Purpose

This function receives an authenticated request containing an invoice document ID, fetches the private invoice server-side, reads its OCR text, calls OpenRouter server-side, validates the structured result, updates the purchase invoice, and replaces invoice item rows for review.

The React frontend never calls OpenRouter directly.

## Function ID

Recommended Appwrite Function ID:

```text
parse_invoice_ai
```

## Required Environment Variables

Set these in the Appwrite Console function settings:

```text
OPENROUTER_API_KEY=
OPENROUTER_MODEL=tencent/hy3:free
OPENROUTER_FALLBACK_MODELS=poolside/laguna-xs-2.1:free,cohere/north-mini-code:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost
OPENROUTER_APP_NAME=MSME Pilot
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=msme_pilot
```

Security notes:

- `OPENROUTER_API_KEY` must be Appwrite Function-only.
- `APPWRITE_API_KEY` must be Appwrite Function-only.
- Never create `VITE_OPENROUTER_API_KEY`.
- Never create `VITE_OPENAI_API_KEY`.
- Never create `VITE_APPWRITE_API_KEY`.
- Do not log secrets.

## Input

```json
{
  "invoiceId": "purchase_invoice_document_id",
  "mode": "parse_ocr_text",
  "force": false,
  "forceReplaceItems": false
}
```

The function does not trust `userId` from the body. It reads the authenticated Appwrite execution context and verifies ownership.

## Output

```json
{
  "success": true,
  "invoiceId": "...",
  "status": "Pending Review",
  "parsed": {},
  "checks": {},
  "itemsCreated": 3,
  "needsManualReview": false,
  "warnings": []
}
```

## Security Model

1. Requires an authenticated Appwrite execution.
2. Reads `x-appwrite-user-id`.
3. Verifies `x-appwrite-user-jwt` with Appwrite Account.
4. Fetches the invoice with the server API key.
5. Confirms `invoice.userId === authenticatedUserId`.
6. Rejects approved or already inventory-updated invoices.
7. Updates only the owner invoice and owner invoice item rows.

The Appwrite API key bypasses document permissions, so the explicit ownership check is mandatory.

## Install Dependencies

From this folder:

```bash
npm install
npm run check
```

## Deploy

If Appwrite CLI is configured, create/deploy a Node.js function with ID `parse_invoice_ai`, then set the environment variables above.

This repository does not currently include `appwrite.json`, so deployment was not automated in this prompt.

## Troubleshooting

- Missing `OPENROUTER_API_KEY`: set it in Appwrite Function environment variables.
- Missing `APPWRITE_API_KEY`: set a server-side Appwrite key with database document read/update/delete/create permissions.
- Missing `x-appwrite-user-jwt`: execute the function through an authenticated Appwrite client.
- Missing OCR text: run OCR first from `/invoice-scanner`.
- Approved invoice: reset/revise the invoice before parsing again.
- Model unavailable: change `OPENROUTER_MODEL` to an enabled OpenRouter model for your account.

## Limitations

- AI extraction may make mistakes.
- Approval is still manual.
- Inventory is not updated by this function.
- Products and suppliers are only matched for preview.
