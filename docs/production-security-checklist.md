# Production Security Checklist

Use this checklist before deploying MSME Pilot publicly.

## Secrets

- [ ] Revoke any API key that was ever pasted outside Appwrite Console or local secure env.
- [ ] Store `APPWRITE_API_KEY` only in local backend setup env or Appwrite Function env.
- [ ] Store `OPENAI_API_KEY` only in Appwrite Function env.
- [ ] Confirm no `VITE_APPWRITE_API_KEY` exists.
- [ ] Confirm no `VITE_OPENAI_API_KEY` exists.
- [ ] Confirm `.env`, `.env.local`, and `.env.*` are ignored by git.

## Appwrite Auth

- [ ] Add local web platform hostname: `localhost`.
- [ ] Add production web platform hostname.
- [ ] Configure allowed authentication methods.
- [ ] Review session duration and password policy.
- [ ] Enable email verification when ready for production.

## Database

- [ ] Run `npm run appwrite:setup` after rotating backend setup key.
- [ ] Run `npm run security:audit`.
- [ ] Confirm all business collections have document security enabled.
- [ ] Confirm no collection has public/guest read/write permissions.
- [ ] Confirm authenticated create permissions are only on intended collections.
- [ ] Spot-check newly created documents have per-user read/update/delete permissions.

## Storage

- [ ] Confirm the shared `invoice_images` bucket is private.
- [ ] Confirm the shared `invoice_images` bucket uses file-level security.
- [ ] Confirm no public bucket permissions exist.
- [ ] Spot-check uploaded files have per-user read/update/delete permissions.
- [ ] Confirm max file sizes and allowed extensions match product requirements.

## Appwrite Functions

- [ ] Deploy `parse-invoice-ai` with server-side env only.
- [ ] Deploy `ai-business-assistant` with server-side env only.
- [ ] Confirm functions require authenticated execution.
- [ ] Confirm functions verify Appwrite JWT.
- [ ] Confirm function logs never print full API keys, JWTs, or OpenAI keys.
- [ ] Confirm OpenAI requests run server-side only.

## Frontend

- [ ] Confirm protected routes redirect logged-out users to `/login`.
- [ ] Confirm login/register redirect authenticated users to `/dashboard`.
- [ ] Confirm Appwrite client uses only endpoint/project/function IDs.
- [ ] Confirm forms validate required fields and do not log passwords.
- [ ] Confirm errors are friendly and do not reveal stack traces.

## Data Isolation QA

- [ ] Create two test users.
- [ ] Create products/customers/suppliers/sales/invoices under user A.
- [ ] Login as user B and confirm user A data is not visible.
- [ ] Try direct URL operations where possible and confirm permission errors.
- [ ] Confirm reports, notifications, business health, and AI context only use logged-in user data.

## Deployment

- [ ] Configure production environment variables.
- [ ] Enable HTTPS.
- [ ] Enable backups.
- [ ] Restrict backend/setup API key scopes to the minimum required.
- [ ] Rotate setup API keys after schema operations when possible.
- [ ] Monitor Appwrite logs for auth, permission, and function errors.
