
-- =============================================
-- NEW TABLE: po_payments_out
-- =============================================
CREATE TABLE public.po_payments_out (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  original_currency text NOT NULL DEFAULT 'USD',
  exchange_rate_to_nis numeric NOT NULL DEFAULT 1,
  nis_equivalent numeric NOT NULL DEFAULT 0,
  payment_date timestamptz DEFAULT now(),
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  method_details jsonb DEFAULT '{}'::jsonb,
  cost_category text NOT NULL DEFAULT 'supplier_payment',
  cost_category_label text,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.po_payments_out ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD po_payments_out"
  ON public.po_payments_out FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================
-- NEW TABLE: warranty_fault_log
-- =============================================
CREATE TABLE public.warranty_fault_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id uuid NOT NULL REFERENCES public.warranties(id) ON DELETE CASCADE,
  fault_description text NOT NULL,
  logged_by uuid,
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE public.warranty_fault_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD warranty_fault_log"
  ON public.warranty_fault_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================
-- MODIFY: products — add supplier_id, landed_cost
-- =============================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS landed_cost numeric DEFAULT 0;

-- =============================================
-- MODIFY: customers — add phone2, area, preferred_currency, preferred_payment_method
-- =============================================
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'NIS',
  ADD COLUMN IF NOT EXISTS preferred_payment_method text;

-- Update customer_type default
ALTER TABLE public.customers ALTER COLUMN customer_type SET DEFAULT 'end_user';

-- =============================================
-- MODIFY: payments — add multi-currency + method_details
-- =============================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS original_currency text DEFAULT 'NIS',
  ADD COLUMN IF NOT EXISTS exchange_rate_to_nis numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nis_equivalent numeric,
  ADD COLUMN IF NOT EXISTS method_details jsonb DEFAULT '{}'::jsonb;

-- =============================================
-- MODIFY: purchase_orders — add origin_country, shipment_reference
-- =============================================
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS shipment_reference text;

-- =============================================
-- MODIFY: sales — add sale_number, payment_terms, deferred_due_date
-- =============================================
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_number text,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'paid_now',
  ADD COLUMN IF NOT EXISTS deferred_due_date timestamptz;

-- =============================================
-- MODIFY: warranties — add installation_date, expiry_date, updated_at
-- =============================================
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS installation_date timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =============================================
-- Auto-generate PO numbers
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := TO_CHAR(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM purchase_orders
    WHERE order_date >= DATE_TRUNC('year', now());
  RETURN 'PO-' || v_year || '-' || LPAD(v_count::text, 3, '0');
END;
$$;

-- =============================================
-- Auto-generate Sale numbers
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_year text;
BEGIN
  v_year := TO_CHAR(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM sales
    WHERE sale_date >= DATE_TRUNC('year', now());
  RETURN 'SALE-' || v_year || '-' || LPAD(v_count::text, 3, '0');
END;
$$;

-- =============================================
-- Updated timestamp trigger for po_payments_out
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_po_payments_out_updated_at
  BEFORE UPDATE ON public.po_payments_out
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
