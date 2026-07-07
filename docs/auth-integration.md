# MSME Pilot Auth Integration

Prompt 18 replaces mock auth with real Appwrite Auth in the frontend.

## Appwrite Project

- Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Project ID: `6a4b9c4c001d2015e28a`
- Database ID: `msme_pilot`
- Business profile collection: `business_profiles`

## Required Frontend Environment

Add these to local `.env` or `.env.local`:

```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
```

Do not add an API key to the frontend. Do not create `VITE_APPWRITE_API_KEY`.

## Web Platform Hostname

For local Vite auth to work in Appwrite Cloud, add a Web platform in Appwrite
Console:

- Hostname: `localhost`

Do not include `http://`. Usually the hostname alone is enough for local Vite.
Add the production domain later before deployment.

## Auth Flow

- `src/lib/appwrite.js` initializes the browser Appwrite SDK from Vite env values.
- `src/context/AuthContext.jsx` restores the current session on app startup.
- Protected routes redirect logged-out users to `/login`.
- Public routes redirect authenticated users to `/dashboard`.

## Registration Flow

1. Create Appwrite Auth account with email/password.
2. Create an email/password session.
3. Create one `business_profiles` document for the new Auth user.
4. Add per-user document permissions for read, update, and delete.
5. Redirect to `/dashboard`.

The profile document stores business identity data only. Passwords are never
stored in the database.

## Login Flow

1. Create email/password session.
2. Load current Appwrite user.
3. Query `business_profiles` by `userId`.
4. Redirect to the intended protected route or `/dashboard`.

## Logout Flow

Logout deletes the current Appwrite session, clears local auth state, and sends
the user back to `/login`.

## Protected Routes

These routes require an Appwrite session:

- `/dashboard`
- `/inventory`
- `/customers`
- `/suppliers`
- `/sales`
- `/invoice-scanner`
- `/invoices`
- `/reports`
- `/business-health`
- `/ai-assistant`
- `/notifications`
- `/profile`
- `/settings`

Public routes are `/`, `/login`, and `/register`.

## Security Rules

- Frontend uses only the Appwrite browser SDK.
- API keys are never used in frontend code.
- Backend setup keys belong only in local `.env` or secure server-side
  environments.
- `business_profiles` documents are created with per-user permissions.
- Real CRUD prompts should continue using per-user document permissions for all
  business data.

If an API key was ever exposed, revoke it in Appwrite Console and create a new
key only for local setup/server-side use.

## Troubleshooting

### Missing Env Variables

If auth shows a configuration error, confirm `VITE_APPWRITE_ENDPOINT` and
`VITE_APPWRITE_PROJECT_ID` are set and restart Vite.

### Invalid Credentials

Check that the user exists in Appwrite Auth and that the password is correct.

### Collection Missing

If registration or login says the business profile collection is missing, run:

```bash
npm run appwrite:setup
```

### Permission Denied

Confirm the `business_profiles` collection was created by Prompt 17 and supports
authenticated document creation plus document-level security.

### Platform Hostname Error

Add `localhost` as a Web platform in Appwrite Console for the project.

## Next Step

Prompt 19: Inventory CRUD.
