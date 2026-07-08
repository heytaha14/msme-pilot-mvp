# AI Assistant Backend

This document describes the secure AI Assistant backend using Appwrite Functions and OpenRouter.

## Architecture

```text
React AI Assistant
  -> Appwrite Function ai_business_assistant
  -> Appwrite Database summaries for current user
  -> OpenRouter Chat Completions API
  -> ai_history
  -> React chat response
```

The browser never calls OpenRouter directly.

## Why Keys Are Server-Side

`OPENROUTER_API_KEY` and `APPWRITE_API_KEY` must only exist in the Appwrite Function environment. They must never be prefixed with `VITE_` and must never be imported into React code.

Frontend uses only:

```bash
VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=ai_business_assistant
```

## Function Environment Variables

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost
OPENROUTER_APP_NAME=MSME Pilot
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=msme_pilot
```

`OPENROUTER_MODEL` is configurable so the deployer can change the model without code changes.

## Auth Verification

The function reads the authenticated user from Appwrite execution headers:

- `x-appwrite-user-id`
- `x-appwrite-user-jwt`

It verifies the JWT using the Appwrite Account API. The function does not accept or trust `userId` from the request body.

## Context Loading

The function queries each collection using:

```js
Query.equal('userId', userId)
```

It summarizes:

- Business profile
- Inventory
- Customers
- Suppliers
- Sales
- Sale items
- Purchase invoices
- Invoice items
- Notifications
- Business health snapshots
- Generated reports
- Recent AI conversation history

Large raw collections, file URLs, secrets, passwords, and unnecessary OCR text are not sent to OpenRouter.

## Prompt Strategy

The system prompt tells MSME Pilot AI to:

- Use only provided business context
- Avoid inventing exact numbers
- Give short, practical advice
- Avoid destructive actions
- Treat GST as informational only
- Return JSON for UI rendering

## Response Shape

The function returns:

```json
{
  "success": true,
  "conversationId": "conv_...",
  "answer": "string",
  "summary": "string",
  "suggestedActions": [],
  "relatedMetrics": [],
  "warnings": [],
  "model": "openrouter/free",
  "savedHistory": true
}
```

If JSON validation fails, the function falls back to a plain answer and does not crash.

## Conversation History

Successful exchanges are saved to `ai_history`:

- user message
- assistant response
- `conversationId`
- `role`
- `contextType: business_chat`
- `saved`
- timestamps

Documents are created with per-user read, update, and delete permissions.

## Suggested Actions

The assistant can return action cards such as:

- Open Inventory
- Open Customers
- Review Invoices
- Check Business Health
- Open Reports

The AI does not perform these actions automatically. The user chooses whether to navigate and act.

## Limitations

- AI cannot update inventory, approve invoices, create sales, send payments, or change settings.
- AI suggestions require user review.
- No WhatsApp, email, SMS, or task automation yet.
- No long-term vector memory yet.
- Context size is intentionally limited.

## Troubleshooting

Function ID missing:

- Add `VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=ai_business_assistant`.

Function not deployed:

- Deploy `functions/ai-business-assistant` in Appwrite Console or CLI.

OpenRouter key missing:

- Add `OPENROUTER_API_KEY` to function environment variables only.

Appwrite API key missing:

- Add `APPWRITE_API_KEY` to function environment variables only.

Model unavailable:

- Change `OPENROUTER_MODEL` to an enabled OpenRouter model for your account.

Permission denied:

- Confirm the user is logged in and function executions include authenticated headers.
- Confirm documents include matching `userId`.

No business data:

- Add products, customers, suppliers, sales, invoices, reports, notifications, and health snapshots.

History not saving:

- Confirm `ai_history` collection exists and authenticated user document permissions are allowed.

## Next Step

Prompt 29: Security + Permissions Audit.
