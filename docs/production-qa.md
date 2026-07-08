# MSME Pilot Production QA

Run this checklist after deploying the frontend to Hostinger KVM and before sharing the production URL.

## Auth

- [ ] Register a new account.
- [ ] Confirm a business profile document is created.
- [ ] Logout.
- [ ] Login again.
- [ ] Refresh `/dashboard` and confirm session persists.
- [ ] Visit `/login` while logged in and confirm redirect to `/dashboard`.
- [ ] Visit `/dashboard` while logged out and confirm redirect to `/login`.

## Business Data

- [ ] Add product.
- [ ] Edit product.
- [ ] Delete product.
- [ ] Add customer.
- [ ] Edit customer.
- [ ] Delete customer.
- [ ] Add supplier.
- [ ] Edit supplier.
- [ ] Mark supplier paid.
- [ ] Create sale.
- [ ] Mark sale paid.
- [ ] Upload invoice.
- [ ] Run OCR.
- [ ] Run AI invoice parsing.
- [ ] Approve invoice.
- [ ] Generate report.
- [ ] Recalculate business health.
- [ ] Refresh notifications.
- [ ] Ask AI Assistant a business question.

## Security

- [ ] User A cannot see User B inventory.
- [ ] User A cannot see User B customers.
- [ ] User A cannot see User B suppliers.
- [ ] User A cannot see User B sales.
- [ ] User A cannot see User B invoices.
- [ ] User A cannot see User B AI history.
- [ ] No `APPWRITE_API_KEY` appears in browser source.
- [ ] No `OPENROUTER_API_KEY` or `OPENAI_API_KEY` appears in browser source.
- [ ] No secret appears in browser network responses.
- [ ] Storage files are private.
- [ ] Appwrite Functions require authenticated execution.
- [ ] `npm run security:audit` has no critical findings.

## Mobile

- [ ] Android Chrome layout.
- [ ] iPhone Safari layout if available.
- [ ] Tablet width layout.
- [ ] Bottom navigation works.
- [ ] Modals fit small screens.
- [ ] Forms are touch-friendly.
- [ ] Tables switch to cards where expected.

## Performance

- [ ] Landing page loads quickly.
- [ ] Dashboard loads after login.
- [ ] Inventory/customer/supplier large lists remain usable.
- [ ] OCR does not freeze the UI.
- [ ] AI function response time is acceptable.
- [ ] Reports generate without crashing.

## Deployment

- [ ] Nginx serves nested React routes.
- [ ] HTTPS certificate works.
- [ ] HTTP redirects to HTTPS after Certbot setup.
- [ ] `deployment/scripts/health-check.sh` passes.
- [ ] Rollback script tested on staging or a safe release.
