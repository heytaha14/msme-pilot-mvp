# MSME Pilot Deployment Checklist

## Pre-Deployment

- [ ] Security audit completed.
- [ ] Exposed API keys rotated if any were ever shared.
- [ ] Appwrite Cloud project working.
- [ ] Appwrite Web Platform has production domain.
- [ ] Appwrite Web Platform has localhost for development.
- [ ] `parse_invoice_ai` function deployed.
- [ ] `ai_business_assistant` function deployed.
- [ ] Function env vars configured server-side only.
- [ ] Frontend env vars prepared in `.env.production`.
- [ ] `npm run build` passes.
- [ ] `npm run security:audit` reviewed.

## Server

- [ ] Ubuntu updated.
- [ ] Nginx installed.
- [ ] Node.js LTS installed.
- [ ] Git installed.
- [ ] Certbot installed.
- [ ] Firewall rules configured.
- [ ] Domain points to VPS IP.
- [ ] Nginx config active.
- [ ] SSL installed.

## Post-Deployment

- [ ] Landing page loads.
- [ ] Login works.
- [ ] Register works.
- [ ] Protected routes work.
- [ ] Inventory loads.
- [ ] CRUD works.
- [ ] Invoice upload works.
- [ ] OCR works.
- [ ] AI functions work.
- [ ] Reports work.
- [ ] Notifications work.
- [ ] No console secret leaks.
- [ ] Mobile UI checked.
- [ ] `deployment/scripts/health-check.sh` passes.
