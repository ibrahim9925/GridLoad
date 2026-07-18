
ALTER TABLE containers ADD COLUMN IF NOT EXISTS clearance_cost numeric DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS transportation_cost numeric DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS customs_fees numeric DEFAULT 0;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS purchase_order_id uuid;
