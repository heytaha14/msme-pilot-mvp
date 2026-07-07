# OCR Integration

MSME Pilot now uses browser-side OCR for invoice images with `tesseract.js`.

## Scope

- OCR runs in the frontend browser session.
- Supported OCR file types: JPG, JPEG, PNG, WEBP.
- PDF files can be uploaded and saved for manual review, but PDF OCR is not enabled yet.
- The OCR text is parsed locally with simple rule-based helpers.
- No GPT, AI API, Appwrite Function, or external OCR API is called in this step.
- No real inventory updates are performed yet.

## Flow

1. User selects an invoice file on `/invoice-scanner`.
2. The file is uploaded to the private Appwrite `invoice_images` bucket.
3. If the file is an image, `tesseract.js` extracts OCR text locally.
4. `src/utils/invoiceTextParser.js` attempts to parse:
   - supplier name
   - supplier phone
   - invoice number
   - invoice date
   - subtotal
   - GST amount
   - total amount
   - line items
5. The purchase invoice is saved to `purchase_invoices`.
6. Parsed line items are saved to `invoice_items`.
7. The invoice remains in `Pending Review` until the user approves it.

## Files

- `src/services/ocrService.js`
  - wraps `tesseract.js`
  - validates supported image types
  - normalizes OCR text
  - maps OCR progress into UI-friendly progress
- `src/utils/invoiceTextParser.js`
  - rule-based invoice parser
  - returns parsed fields and review warnings
- `src/pages/invoice-scanner/InvoiceScannerPage.jsx`
  - real upload plus OCR workflow
  - PDF upload/manual-review fallback
  - editable extracted data
- `src/pages/invoices/InvoicesPage.jsx`
  - displays OCR metadata, confidence, warnings, and extracted text

## Saved metadata

OCR metadata is stored in `purchase_invoices.aiExtractedJson` as serialized JSON for now:

```json
{
  "source": "tesseract_local_ocr",
  "parser": "local_rule_based_parser",
  "confidence": 82,
  "durationMs": 4200,
  "warnings": [],
  "parsedAt": "2026-07-07T00:00:00.000Z",
  "parsedData": {}
}
```

The field name remains `aiExtractedJson` because the schema was designed for the next AI extraction step. Prompt 24 can replace or enrich the same metadata with secure server-side AI output.

## Security

- No API keys are used for OCR.
- OCR runs in the browser and does not require backend secrets.
- Appwrite access uses the authenticated frontend session only.
- Invoice files and invoice documents remain private through Appwrite permissions.

## Limitations

- OCR accuracy depends on image quality.
- Handwritten or blurred invoices may produce incomplete text.
- PDF OCR is not connected yet.
- Local parsing is best-effort and should be reviewed by the user.
- AI understanding and automatic inventory update are intentionally deferred.

## Troubleshooting

- If OCR does not start, confirm `tesseract.js` is installed.
- If the OCR worker fails to load, check network access and browser console errors.
- If invoices save fails, confirm Appwrite collections and bucket permissions from Prompt 17 and Prompt 22.
- If parsed totals look wrong, use the edit extracted data modal before approval.

## Next step

Prompt 24: secure AI invoice extraction through an Appwrite Function. API keys must stay server-side only.
