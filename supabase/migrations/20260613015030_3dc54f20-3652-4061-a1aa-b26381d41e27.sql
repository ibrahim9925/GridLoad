
-- Add missing sales columns to fix Create Sale failure
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS is_installment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_plan_type text,
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_before_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS discount_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charges numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending';

-- Add purchase_type to differentiate Import Orders vs Local Purchases
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'import'
    CHECK (purchase_type IN ('import','local'));
