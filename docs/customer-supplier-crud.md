# MSME Pilot Customer and Supplier CRUD

Prompt 20 connects Customers and Suppliers to Appwrite using the frontend SDK
and the authenticated user from `AuthContext`.

## Appwrite Collections

- Database: `msme_pilot`
- Customer collection: `customers`
- Supplier collection: `suppliers`

Constants come from `src/config/appwriteSchema.js`.

## Customer CRUD Flow

Customers are queried by `userId` and ordered by `createdAt` descending.

Customer documents store:

- `userId`
- `name`
- `phone`
- `address`
- `totalPurchases`
- `pendingAmount`
- `paymentStatus`
- `notes`
- `lastPurchaseDate`
- `createdAt`
- `updatedAt`

Creating a customer validates name and phone, converts money fields to numbers,
derives payment status, and creates the document with per-user permissions.

Updating a customer first fetches the document and verifies it belongs to the
current user. Only customer fields are updated, and `updatedAt` is refreshed.

Deleting a customer also verifies ownership before deleting the document.

## Supplier CRUD Flow

Suppliers are queried by `userId` and ordered by `createdAt` descending.

Supplier documents store:

- `userId`
- `name`
- `phone`
- `address`
- `productsSupplied`
- `category`
- `totalPurchase`
- `paymentDue`
- `paymentStatus`
- `notes`
- `lastInvoiceDate`
- `lastPaymentDate`
- `createdAt`
- `updatedAt`

`productsSupplied` is stored as a comma-separated string in Appwrite and
converted back to an array for the UI.

Creating, updating, and deleting suppliers all enforce the current `userId`.

## Permission Model

New customer and supplier documents are created with:

- read: current Appwrite user
- update: current Appwrite user
- delete: current Appwrite user

Documents are never public. Collection-level create permissions must allow
authenticated users, and document-level security should remain enabled.

## Payment Status Behavior

Customer status:

- `pendingAmount <= 0`: Paid
- `pendingAmount > 0`: Pending
- Manual `Overdue` stays Overdue when passed explicitly

Supplier status:

- `paymentDue <= 0`: Paid
- `paymentDue > 0`: Due
- Manual `Overdue` stays Overdue when passed explicitly

Supplier “Mark as Paid” updates:

- `paymentDue: 0`
- `paymentStatus: Paid`
- `lastPaymentDate: current date`

Customer reminder remains a simulated reminder preview. Real WhatsApp, SMS,
email, and payment ledger integrations come later.

## Demo Seed Behavior

Both pages include a first-time empty state with a demo seed option.

Demo seed:

- creates sample records for the logged-in user
- uses per-user document permissions
- skips records already matching by name or phone
- asks for confirmation if records already exist

## Troubleshooting

### Missing Collections

Run:

```bash
npm run appwrite:setup
```

### Permission Denied

Check Appwrite collection permissions and document security. Do not make
customer or supplier data public to fix permission errors.

### Missing Indexes

The pages query by `userId` and order by `createdAt`. Re-run schema setup if
indexes are missing.

### Env Issue

Frontend CRUD requires:

```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
```

Never add `VITE_APPWRITE_API_KEY`.

### User Not Authenticated

`/customers` and `/suppliers` are protected routes. Login again if the session
expires.

## Next Step

Prompt 21: Sales CRUD with Appwrite.
