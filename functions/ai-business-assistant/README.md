# AI Business Assistant Function

Function ID: `ai_business_assistant`

This Appwrite Function powers the MSME Pilot AI Assistant. It verifies the authenticated Appwrite user, loads only that user's business context, calls OpenRouter server-side, returns a business-focused response, and stores conversation history in `ai_history`.

## Required Environment Variables

Function-only variables:

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

Never expose `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `APPWRITE_API_KEY` in frontend Vite variables.

## Input JSON

```json
{
  "message": "What should I reorder this week?",
  "conversationId": "optional-existing-conversation-id",
  "mode": "business_chat",
  "includeContext": true,
  "saveHistory": true
}
```

`message` is required and limited to 2000 characters. The function does not accept or trust `userId` from the frontend.

## Output JSON

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

## Business Context Loaded

The function summarizes:

- Business profile
- Inventory and low-stock products
- Customer dues
- Supplier dues
- Sales and sale items
- Purchase invoices and invoice items
- Notifications
- Business health snapshots
- Generated reports
- Recent conversation messages

All collection queries include `Query.equal("userId", userId)`.

## Security Model

- The frontend calls this function through an authenticated Appwrite session.
- The function verifies the Appwrite JWT and authenticated user ID.
- Server API key access is used only inside the function.
- Data ownership is enforced by querying every collection with the authenticated `userId`.
- Conversation history is saved with per-user read, update, and delete permissions.
- The function never logs API keys, full business context, OCR text, passwords, or secrets.

## OpenRouter Usage

OpenRouter is called only server-side. The function uses the OpenAI-compatible Chat Completions API through the OpenAI Node SDK and requests a compact JSON response with:

- `answer`
- `summary`
- `suggestedActions`
- `relatedMetrics`
- `warnings`

If JSON validation fails, the function falls back to a safe text answer.

## Deploy

If Appwrite CLI is configured:

```bash
cd functions/ai-business-assistant
npm install
appwrite functions createDeployment --functionId ai_business_assistant --activate true --entrypoint src/main.js
```

If CLI configuration is not present, create the function in Appwrite Console with ID `ai_business_assistant`, upload this folder, set the environment variables, and deploy.

## Test

From the frontend, set:

```bash
VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=ai_business_assistant
```

Log in, open `/ai-assistant`, and send a question.

## Troubleshooting

Function ID missing:

- Add `VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=ai_business_assistant` to frontend env.

OpenRouter key missing:

- Add `OPENROUTER_API_KEY` to function environment variables only.

Appwrite API key missing:

- Add `APPWRITE_API_KEY` to function environment variables only.

Model unavailable:

- Change `OPENROUTER_MODEL` to an enabled OpenRouter model in the function environment.

History not saving:

- Confirm `ai_history` collection exists and allows document creation with per-user permissions.
