# MSME Pilot Inventory CRUD

Prompt 19 connects the Inventory page to Appwrite using the frontend SDK and
the authenticated session from `AuthContext`.

## Appwrite Collections

- Database: `msme_pilot`
- Products collection: `products`
- Inventory movements collection: `inventory_movements`

Constants come from `src/config/appwriteSchema.js`.

## Product CRUD Flow

### List Products

`listProducts(userId)` queries `products` where `userId` equals the logged-in
Appwrite Auth user ID and orders by `createdAt` descending.

### Create Product

`createProduct(userId, productData)` validates and stores:

- `userId`
- `name`
- `category`
- `barcode`
- `supplierId`
- `supplierName`
- `purchasePrice`
- `sellingPrice`
- `gstPercentage`
- `stock`
- `minStock`
- `unit`
- `imageFileId`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

New documents are created with per-user permissions:

- read: current user
- update: current user
- delete: current user

No product document is public.

### Update Product

`updateProduct(userId, productId, productData)` fetches the existing product,
checks ownership by `userId`, updates allowed fields, recalculates stock status,
and writes `updatedAt`.

If stock changes, an inventory movement is created.

### Delete Product

`deleteProduct(userId, productId)` fetches the product, checks ownership, creates
a best-effort adjustment movement, and deletes the document.

If movement logging fails because the collection or permissions are not ready,
product CRUD continues and the issue is logged in development.

## Inventory Movement Behavior

Initial product creation records:

- movementType: `purchase` or `adjustment`
- previousStock: `0`
- newStock: product stock
- quantity: product stock
- note: `Initial stock added`

Stock edits record:

- movementType: `adjustment`
- previousStock: old stock
- newStock: new stock
- quantity: new stock minus old stock
- note: `Stock adjusted from inventory page`

Delete attempts record:

- movementType: `adjustment`
- previousStock: old stock
- newStock: `0`
- quantity: negative old stock
- note: `Product deleted from inventory`

## Empty State And Demo Seed

New users see a first-time empty state with:

- Add Product
- Demo seeding was removed after the real Appwrite CRUD pass. Add products through the Inventory UI or import flow instead.

Demo seed creates the sample Kirana products for the logged-in user with
per-document permissions and skips products that already match by barcode or
name.

## Product Images

Product image upload is still visual-only in Prompt 19. Real storage upload to
dedicated `product_images` should wait until the project upgrades from Appwrite
Free. For now `BUCKET_IDS.PRODUCT_IMAGES` maps to the shared private
`invoice_images` bucket, and the UI should remain safe if product image upload is
kept local/preview-only.

## Troubleshooting

### Missing Products Collection

Run:

```bash
npm run appwrite:setup
```

### Permission Denied

Check that the `products` collection allows authenticated document creation and
that document-level security is enabled. Do not make products public.

### Missing Indexes

`listProducts` requires querying by `userId` and ordering by `createdAt`. Re-run
the schema setup if either index is missing.

### Env Variable Issue

Frontend auth and CRUD require:

```env
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a4b9c4c001d2015e28a
```

Never add `VITE_APPWRITE_API_KEY`.

### User Not Authenticated

The `/inventory` route is protected. If the session expires, login again.

## Next Step

Prompt 20: Customer/Supplier CRUD with Appwrite.
