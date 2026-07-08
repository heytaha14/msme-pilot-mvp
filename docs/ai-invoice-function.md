# AI Invoice Function

Prompt 24 adds a secure server-side AI invoice parser for MSME Pilot.

## Architecture

```text
React frontend -> Appwrite Function -> OpenRouter Chat Completions API -> Appwrite Database
```

The frontend executes an Appwrite Function with the authenticated Appwrite session. The function fetches the invoice, verifies ownership, calls OpenRouter server-side, validates the JSON result, updates `purchase_invoices`, and creates/replaces `invoice_items`.

## Why the OpenRouter Key Is Server-Side Only

OpenRouter API keys are secrets. They must never be bundled into Vite or exposed in browser code. The frontend only receives:

```text
VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID=parse_invoice_ai
```

The function receives:

```text
OPENROUTER_API_KEY=
OPENROUTER_MODEL=tencent/hy3:free
OPENROUTER_FALLBACK_MODELS=poolside/laguna-xs-2.1:free,cohere/north-mini-code:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost
OPENROUTER_APP_NAME=MSME Pilot
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=msme_pilot
```

`OPENROUTER_MODEL` should be a real model ID available to your OpenRouter account. The function also tries `OPENROUTER_FALLBACK_MODELS` and then bundled free-model fallbacks if the selected provider/model is unavailable.

Never create:

```text
VITE_OPENAI_API_KEY
VITE_APPWRITE_API_KEY
```

## Parse Flow

1. User uploads invoice image.
2. Browser OCR extracts text with Tesseract.js.
3. Invoice and OCR text are saved to Appwrite.
4. User clicks `Parse with AI`.
5. Frontend executes `parse_invoice_ai`.
6. Function verifies authenticated user and invoice ownership.
7. Function sends OCR text to OpenRouter and requests strict JSON.
8. Function validates the AI JSON.
9. Function runs deterministic amount/date/item checks.
10. Function updates the invoice to `Pending Review`.
11. Function replaces invoice item rows if reliable items exist.
12. User reviews and manually approves.

## Review Flow

AI extraction is never auto-approved. The user can edit:

- supplier name
- supplier phone
- invoice number
- invoice date
- subtotal
- GST amount
- total amount
- status
- line items

Saving review updates Appwrite invoice fields and invoice items.

## Approval Flow

Approval remains separate. This function does not:

- mark invoices approved
- update inventory stock
- create products
- create suppliers
- file GST

## Error Handling

Friendly UI messages are shown for:

- missing function ID
- function execution failure
- missing OCR text
- approved invoice lock
- permission errors
- model unavailable
- network errors

## Manual Review Requirement

The AI response includes confidence scores and `needsManualReview`. Deterministic checks also flag:

- missing invoice number
- missing supplier
- invalid date
- missing total
- subtotal plus GST mismatch
- item totals mismatch
- low-confidence line items

## Limitations

- AI may make mistakes.
- OCR quality still affects extraction.
- PDF OCR is not enabled yet.
- No automatic inventory update yet.
- No direct frontend OpenRouter calls.

## Troubleshooting

- Function ID missing: add `VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID=parse_invoice_ai`.
- Function deployment missing: create/deploy the Appwrite Function.
- OpenRouter key missing: add `OPENROUTER_API_KEY` in function env.
- Model unavailable: change `OPENROUTER_MODEL` to an enabled OpenRouter model.
- Appwrite API key missing: add server-side `APPWRITE_API_KEY` in function env.
- Permission denied: verify function execute permissions and document ownership.
- Invoice missing OCR text: run OCR before AI parse.
- Approved invoice cannot be re-parsed: reset/revise before parsing.

## Next Step

Prompt 25: Real Reports from Appwrite data.
