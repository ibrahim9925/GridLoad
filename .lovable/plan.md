# Plan: PO Lifecycle Refactor, Payment Bug Fix & Mobile UI

This is a large, multi-part change. I'd like your sign-off before touching code because it rewrites the procurement core, changes the stock-increment trigger, and refactors layout primitives used across every admin page.

---

## Part 1 — Bug Fix: Record Payment button

Investigate `POWizard` payments tab. Likely causes (will confirm by reading the file):
- `onClick` handler is async but swallowing errors
- Hidden form validation (missing `bank_account_id` or currency) failing silently
- Button inside a `<form>` without `type="button"` causing wrong submit path

Fix: surface errors via toast, make `bank_account_id` optional at insert time (it's already supported — payment can be unreconciled), ensure the insert actually fires and the list refreshes.

Verify: insert one payment from UI, confirm row in `po_payments_out`, confirm `bank_ledger` row appears when `bank_account_id` is set (existing trigger handles this).

---

## Part 2 — Architectural Refactor: PO + Shipment Lifecycle

### New stages
`ordered → in_transit → at_port → received → closed` (status on PO).
Payments decoupled from receiving entirely.

### Schema changes (new migration)

1. **New table `po_shipments`**
   - `id, purchase_order_id, shipment_number (SHIP-YYYY-NNN)`
   - `status` (`in_transit|at_port|arrived|closed`)
   - `shipment_date, expected_arrival_date, actual_arrival_date, warehouse_arrival_date`
   - `shipping_method, tracking_number`
   - `freight_estimate, clearance_estimate` (NIS)
   - `condition_notes, created_by, timestamps`
   - GRANTs + RLS (admin/warehouse manage; authenticated read).

2. **New table `po_shipment_items`**
   - `id, shipment_id, purchase_order_item_id, product_id`
   - `quantity_received, quantity_ordered_snapshot, variance, condition`
   - GRANTs + RLS.

3. **Alter `po_payments_out`**
   - Add `shipment_id uuid NULL REFERENCES po_shipments(id)`
   - Add `payment_type text` (deposit|balance|freight|clearance|other) — already partially present, normalize.

4. **New RPC `confirm_warehouse_arrival(p_shipment_id, p_items jsonb, p_notes text)`**
   - For each item: `UPDATE products SET current_stock = current_stock + qty`
   - Insert `stock_movements` rows
   - Set shipment `status='arrived'`, `warehouse_arrival_date=now()`
   - Flag variances when `qty_received <> qty_ordered_snapshot`
   - If all PO items fully received and balances paid → set PO status `closed`, else `received`.

5. **New RPC `get_po_status(p_po_id)`** → returns JSON with stage, total_paid_nis, total_units_received, shipments[], landed_cost_per_unit.

6. **New RPC `get_active_shipments()`** → POs currently `in_transit`/`at_port` with ETAs.

7. **Drop/replace** stock-update trigger on PO status change (if any). Stock now ONLY moves via `confirm_warehouse_arrival`.

### Frontend changes

- `POWizard`: replace tab 4 "Receive & Close PO" with **Shipments** tab containing:
  - Timeline view of all shipments
  - "Create Shipment" dialog (stage 3)
  - Per-shipment actions: "Mark Arrived at Port", "Confirm Warehouse Arrival" (opens qty grid)
  - Live landed-cost-per-unit card
- Payments tab: remove any guard that blocks recording before receipt.

### Zara API additions
- `GET /po/:id/status` → calls `get_po_status`
- `GET /shipments/active` → calls `get_active_shipments`

---

## Part 3 — Global Mobile UI Fixes (390–430px)

Touch only layout primitives, no business logic:

1. **AdminLayout / Sidebar** — collapse to Sheet drawer on `< md`, add hamburger trigger in top bar, prevent content overlap (already uses shadcn `sidebar`; confirm and patch).
2. **POWizard `<TabsList>`** — wrap in horizontal-scroll container (`overflow-x-auto`, `flex-nowrap`, `snap-x`).
3. **Dialogs** — buttons go `w-full sm:w-auto`, footers stack on mobile.
4. **Tables** — add responsive wrapper utility: `overflow-x-auto` on `md+`, collapse to stacked card list on `< sm` via a small `<ResponsiveTable>` enhancement (component already exists — extend it and adopt in Purchasing, Customers, Banking, CashBundles, ReconciliationQueue).
5. **Inputs** — set `text-base` on mobile (prevents iOS zoom), ensure `inputMode` on numeric fields in payment/shipment dialogs.

---

## Part 4 — Test Pass (executed before reporting back)

End-to-end via SQL + edge function curl:
1. Create PO (NIS, 2 line items, 10 units each)
2. Record 30% deposit → assert `po_payments_out` row + (if bank set) `bank_ledger`
3. Create shipment → assert `po_shipments` row, PO `in_transit`
4. Record 70% balance payment → assert no stock change
5. Mark `at_port` → record freight payment linked to shipment_id
6. `confirm_warehouse_arrival` with qty 10/10 → assert `products.current_stock` incremented, `stock_movements` inserted, PO `received`/`closed`
7. Hit `GET /po/:id/status` → verify landed cost = total_payments_nis / total_units
8. Hit `GET /shipments/active` → verify shipment no longer listed
9. Cleanup test rows

Report pass/fail per stage.

---

## Files I expect to touch / create

**New**
- `supabase/migrations/<ts>_po_shipment_lifecycle.sql`
- `src/components/admin/purchasing/ShipmentsTab.tsx`
- `src/components/admin/purchasing/CreateShipmentDialog.tsx`
- `src/components/admin/purchasing/WarehouseArrivalDialog.tsx`
- `src/hooks/usePOShipments.ts`

**Edited**
- `src/components/admin/purchasing/POWizard.tsx` (tab swap + payment button fix + mobile tabs)
- `src/components/admin/purchasing/PaymentsTab.tsx` (or equivalent)
- `src/components/ui/responsive-table.tsx` (extend)
- `src/components/admin/AdminLayout.tsx` / sidebar wrapper (mobile hamburger)
- `src/components/ui/dialog.tsx` / dialog footers in PO + customer + payment dialogs (full-width on mobile)
- `src/index.css` (mobile input base size)
- `supabase/functions/zara-api/index.ts` (2 new endpoints)

---

## Risks / Open questions

- **Backwards compat**: existing POs may have `status='received'` already with stock counted. I will NOT retroactively change historical stock. New trigger logic only fires from `confirm_warehouse_arrival` going forward.
- **Variance handling**: should under-delivery auto-create a back-order shipment, or just flag for manual review? Plan assumes flag-only.
- **Closing PO**: auto-close when fully received AND fully paid; otherwise stay `received`. Confirm this is desired vs. always manual close.

Reply "go" to proceed, or tell me what to adjust (esp. the two questions above).