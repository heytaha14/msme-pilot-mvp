# MSME Pilot Sales CRUD

Prompt 21 connects the Sales module to Appwrite using the frontend Appwrite SDK and the authenticated session from `AuthContext`.

## Collections Used

- `sales`: sale invoice headers.
- `sale_items`: line items for each sale.
- `products`: stock is deducted when a sale item is linked to a product.
- `customers`: purchase totals and pending dues are updated when a sale is linked to a customer.
- `inventory_movements`: sale deductions and sale-delete stock restoration are logged.

Database ID: `msme_pilot`.

## Security Model

The frontend never uses `APPWRITE_API_KEY` and must never define `VITE_APPWRITE_API_KEY`.

Every created sale and sale item includes:

- `userId`
- `createdAt`
- `updatedAt`
- per-user document permissions:
  - `read: Role.user(userId)`
  - `update: Role.user(userId)`
  - `delete: Role.user(userId)`

All reads query by `userId`, and update/delete helpers verify ownership before mutating documents.

## Create Sale Flow

1. Validate customer name and at least one line item.
2. Allow either a saved customer or walk-in customer text.
3. Allow either a saved product or custom item text.
4. Validate selected product stock before creating the sale.
5. Generate the next invoice number, such as `INV-1001`.
6. Calculate:
   - subtotal
   - GST amount
   - total amount
   - estimated profit
   - paid amount
   - due amount
   - payment status
7. Create a `sales` document.
8. Create related `sale_items` documents.
9. Deduct linked product stock.
10. Create inventory movements with `movementType: "sale"`.
11. Update linked customer total purchases and pending dues.

Custom line items are allowed, but they do not deduct inventory.

## Payment Status Rules

- `Paid`: paid amount is greater than or equal to total amount and due amount is zero.
- `Pending`: paid amount is zero and due amount is greater than zero.
- `Partial`: paid amount is greater than zero but less than total amount.
- `Cancelled`: manual status only.

## Mark Paid Flow

Marking a sale as paid:

- sets `paidAmount` to `totalAmount`
- sets `dueAmount` to `0`
- sets `paymentStatus` to `Paid`
- reduces linked customer pending dues by the previous sale due amount

No real payment gateway is connected yet.

## Edit Sale Flow

Safe MVP editing allows:

- customer name
- customer phone
- sale date
- paid amount
- notes

Line item editing after posting is disabled in the UI to protect stock accuracy. Full item replacement should be implemented later in an Appwrite Function or explicit adjustment workflow.

## Delete Sale Flow

Deleting a sale:

- can restore deducted stock for linked products
- creates `return` inventory movements for restored stock
- deletes related `sale_items`
- deletes the `sales` header
- reverses linked customer purchase totals and pending dues

The UI defaults to restoring stock before deletion.

## Atomicity Note

This implementation performs multiple frontend Appwrite writes. It is safe enough for the current MVP demo, but it is not truly atomic. A failure after one document has been created can leave partial state.

Before production, final sale posting should move into a secure Appwrite Function so sale creation, sale items, stock deduction, inventory movements, and customer dues update as one server-side workflow.

## Demo Seed Behavior

`Load Demo Sales` creates sample sales only when the logged-in user already has products and customers. It uses matching product/customer names where possible and keeps demo quantities small to avoid stock errors.

## Troubleshooting

- Missing collections: run Prompt 17 Appwrite schema setup.
- Permission denied: confirm collection document security and authenticated create permissions.
- Missing indexes: rerun schema setup so `userId`, `saleId`, and date indexes exist.
- Insufficient stock: reduce quantity or restock the product first.
- User not authenticated: login again and confirm Appwrite Web platform hostname is configured.
- Sale items not visible: confirm `sale_items` collection exists and `saleId_index` was created.

## Next Step

Prompt 22: Invoice Storage with Appwrite.
