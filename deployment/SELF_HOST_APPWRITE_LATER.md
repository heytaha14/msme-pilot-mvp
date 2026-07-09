# Self-Host Appwrite Later

The current recommended MSME Pilot deployment uses:

- React frontend on Hostinger KVM.
- Appwrite Cloud for Auth, Database, Storage, and Functions.
- OpenAI called only from Appwrite Functions.

Do not self-host Appwrite in this deployment stage.

## When Self-Hosting Might Make Sense

Consider self-hosting later if you need:

- Full infrastructure ownership.
- Region or compliance control.
- Custom scaling and storage.
- Appwrite Cloud plan limits that cannot be resolved otherwise.

## Requirements

Self-hosting Appwrite needs:

- Docker and Docker Compose.
- Separate Appwrite domain/subdomain.
- SSL certificates.
- Persistent volumes.
- Backups.
- SMTP/email setup.
- Function runtime planning.
- Monitoring and log retention.
- Security patching ownership.

## Migration Plan

1. Export current schema and document the live Appwrite Cloud project.
2. Deploy Appwrite self-hosted on a properly sized server.
3. Configure domain, SSL, SMTP, storage, and backups.
4. Recreate project, database, collections, indexes, buckets, and functions.
5. Migrate data and files.
6. Configure function environment variables.
7. Update frontend `.env.production`.
8. Rebuild and deploy frontend.
9. Test auth, CRUD, storage, OCR, AI functions, reports, and notifications.
10. Switch production traffic only after full QA.

## Resource Warning

Running the React app and Appwrite on the same small KVM can be risky. Appwrite, databases, functions, file storage, OCR, and AI workflows need memory, CPU, disk, and operational care. Plan capacity before moving away from Appwrite Cloud.
