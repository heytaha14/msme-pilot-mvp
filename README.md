# MSME Pilot MVP

MSME Pilot is an AI-powered business manager for Indian MSMEs. It helps owners manage inventory, customers, suppliers, sales, invoices, invoice scanning, reports, business health, notifications, profile, settings, and AI-powered decisions from one dashboard.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Lucide React
- Framer Motion
- Appwrite Cloud Auth, Database, Storage, and Functions
- Tesseract.js local OCR
- OpenRouter through Appwrite Functions only
- Hostinger KVM + Nginx for frontend deployment

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use only frontend-safe Vite values in `.env.local`:

```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
VITE_APPWRITE_PARSE_INVOICE_FUNCTION_ID=parse_invoice_ai
VITE_APPWRITE_AI_ASSISTANT_FUNCTION_ID=ai_business_assistant
```

Never add API keys to frontend env.

## Appwrite Setup

The schema setup script is idempotent:

```bash
npm run appwrite:setup
```

Backend/setup-only env belongs in local `.env` or secure server env:

```env
APPWRITE_ENDPOINT=
APPWRITE_PROJECT_ID=
APPWRITE_DATABASE_ID=msme_pilot
APPWRITE_API_KEY=
```

Do not commit `.env` files.

## Security Audit

Run:

```bash
npm run security:audit
```

The audit checks Appwrite collection document security, public permissions, and storage bucket file security. It does not print secrets.

Current Appwrite Free setup uses one shared private bucket, `invoice_images`. Dedicated product image, company logo, and report PDF buckets are optional after upgrading.

## Build

```bash
npm run build
npm run preview
```

## Deployment

Primary deployment target:

- React static build on Hostinger KVM.
- Nginx serves `/var/www/msme-pilot/current`.
- Appwrite stays on Appwrite Cloud.

Deployment docs:

- [Hostinger KVM Deployment](deployment/README.md)
- [Deployment Checklist](deployment/CHECKLIST.md)
- [Self-host Appwrite Later](deployment/SELF_HOST_APPWRITE_LATER.md)
- [Production QA](docs/production-qa.md)

## Production Frontend Env

Copy `.env.production.example` to `.env.production` on the server or CI before build.

```bash
cp .env.production.example .env.production
npm run build
```

Vite env values are baked into `dist/`, so rebuild after changing them.

## Security Notes

- No `APPWRITE_API_KEY` in frontend.
- No `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in frontend.
- No `VITE_APPWRITE_API_KEY`.
- No `VITE_OPENAI_API_KEY`.
- AI provider calls happen only in Appwrite Functions.
- Appwrite Functions must keep OpenRouter and Appwrite API keys in server-side function env.
- Business documents use `userId` isolation and per-user document permissions.

## Next Step

Prompt 31: Final QA and Full Workflow Testing.
