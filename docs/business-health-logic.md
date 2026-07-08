# Business Health Logic

This document describes Prompt 26: real deterministic Business Health scoring from Appwrite data.

## Scope

Business Health now calculates a live score from the logged-in user's Appwrite records and can save score snapshots to Appwrite. The calculation is deterministic and client-side for now.

No API keys are used in the frontend. No real AI, scheduled scoring, notifications, or PDF export is implemented in this step.

## Collections Used

Database: `msme_pilot`

Required collections:

- `products`
- `customers`
- `suppliers`
- `sales`
- `sale_items`
- `purchase_invoices`
- `business_health_snapshots`

Optional collections:

- `payments`
- `notifications`

Every read query is filtered by `userId`.

## Score Formula

Overall score is calculated out of 100:

```text
overallScore =
  inventoryHealth * 0.25 +
  salesPerformance * 0.25 +
  pendingPaymentsScore * 0.20 +
  customerGrowth * 0.15 +
  profitMargin * 0.15
```

The final value is rounded and clamped from 0 to 100.

## Component Weights

- Inventory Health: 25%
- Sales Performance: 25%
- Pending Payments: 20%
- Customer Growth: 15%
- Profit Margin: 15%

## Inventory Health

Inventory health uses product stock and minimum stock:

- `stock <= 0`: Out of Stock
- `stock <= minStock`: Low Stock
- `stock > minStock`: Healthy

If no products exist, inventory score is `40` with setup-focused recommendations.

Formula:

```text
inventoryHealth = 100 - outOfStockPenalty * 45 - lowStockPenalty * 25
```

## Sales Performance

Sales performance uses non-cancelled sales.

It compares current month revenue against previous month revenue and applies boosts for enough current-month sales and today's sales.

If no sales exist, sales score is `35`.

## Pending Payments

Pending payments uses customer pending amount as the primary source and sale due amount as a fallback.

Rules:

- No pending amount: `100`
- Pending ratio <= 10% of monthly revenue: `90`
- Pending ratio <= 25%: `75`
- Pending ratio <= 50%: `55`
- Pending ratio > 50%: `35`

Overdue customers subtract 10 points.

## Customer Growth

Customer growth uses new customers this month and total customers.

Rules:

- No customers: `35`
- 10+ new customers: `90`
- 3-9 new customers: `75`
- 1-2 new customers: `60`
- No new customers: `45`

Total customer count can add a small boost.

## Profit Margin

Profit margin uses non-cancelled sales:

```text
profitMargin = totalProfit / totalRevenue * 100
```

Rules:

- 30% or higher: `95`
- 20% or higher: `85`
- 15% or higher: `75`
- 10% or higher: `60`
- Positive profit: `45`
- Zero or negative profit: `25`

## Status Labels

Overall score:

- 90-100: Excellent
- 75-89: Strong
- 60-74: Good
- 40-59: Needs Attention
- 0-39: Critical

Component score:

- 90-100: Excellent
- 75-89: Healthy
- 60-74: Good
- 40-59: Needs Action
- 0-39: Critical

## Snapshot Storage

Clicking `Recalculate Score` calculates the score and creates a document in `business_health_snapshots`.

Stored fields:

- `userId`
- `score`
- `status`
- `inventoryHealth`
- `salesPerformance`
- `pendingPaymentsScore`
- `customerGrowth`
- `profitMargin`
- `recommendationsJson`
- `risksJson`
- `opportunitiesJson`
- `createdAt`
- `updatedAt`

Raw datasets are not stored in snapshots.

## Permissions

Snapshots are created with per-user permissions:

- read: current authenticated user
- update: current authenticated user
- delete: current authenticated user

No public access is used.

## Recommendations, Risks, and Opportunities

Recommendations are generated from deterministic rules:

- Low stock and out-of-stock products
- Customer dues
- Supplier dues
- Pending invoices
- Low profit margin
- Missing sales data

Risks and opportunities are derived from the same current business metrics.

## What-If Simulation

The projected score is local-only and not persisted.

Actions include:

- Recover pending payments
- Restock low-stock products
- Approve pending invoices
- Improve profit margin
- Add this month's sales

Each action has a deterministic point estimate based on the current component scores.

## Current Limitations

- Calculation runs client-side.
- No scheduled background health scoring yet.
- No AI-generated recommendations yet.
- Checklist completion is local-only.
- Export is simulated.
- Notifications are not created yet.

## Troubleshooting

Missing collection:

- Run `npm run appwrite:setup`.
- Confirm `business_health_snapshots` exists.
- Confirm all required collections use the IDs in `src/config/appwriteSchema.js`.

Permission denied:

- Confirm the user is logged in.
- Confirm authenticated users can create health snapshots.
- Confirm document security and per-user permissions are configured.

Empty data:

- Add products, customers, suppliers, sales, and invoices.
- Recalculate after adding records.

Query or index issue:

- Confirm `userId` indexes exist on every collection used by Business Health.
- Confirm `createdAt` index exists on `business_health_snapshots`.

## Next Step

Prompt 27: Notifications Logic from Real Data.
