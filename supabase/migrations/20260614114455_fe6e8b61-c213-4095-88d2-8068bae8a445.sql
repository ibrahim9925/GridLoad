
-- 1) Pre-register serial numbers at warehouse arrival
ALTER TABLE public.product_serial_numbers
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.po_shipments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_psn_shipment ON public.product_serial_numbers(shipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_psn_product_serial ON public.product_serial_numbers(product_id, serial_number);

CREATE OR REPLACE FUNCTION public.register_shipment_serials(
  p_shipment_id uuid,
  p_items jsonb  -- [{ product_id, serials: [string, ...] }, ...]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_item jsonb; v_sn text; v_inserted int := 0; v_dupes int := 0;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','warehouse']::app_role[]) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) LOOP
    FOR v_sn IN SELECT jsonb_array_elements_text(v_item->'serials') LOOP
      IF v_sn IS NULL OR TRIM(v_sn) = '' THEN CONTINUE; END IF;
      BEGIN
        INSERT INTO public.product_serial_numbers
          (product_id, serial_number, status, shipment_id, received_date)
        VALUES ((v_item->>'product_id')::uuid, TRIM(v_sn), 'in_stock', p_shipment_id, now());
        v_inserted := v_inserted + 1;
      EXCEPTION WHEN unique_violation THEN
        v_dupes := v_dupes + 1;
      END;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('inserted', v_inserted, 'duplicates_skipped', v_dupes);
END $$;

-- 2) Supplier warranty claims
CREATE TABLE IF NOT EXISTS public.supplier_warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fault_id uuid REFERENCES public.warranty_fault_log(id) ON DELETE SET NULL,
  warranty_id uuid REFERENCES public.warranties(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  product_id uuid REFERENCES public.products(id),
  serial_number text,
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  po_reference text,
  purchase_date date,
  fault_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  supplier_response text,
  resolution_type text,
  credit_amount_nis numeric,
  replacement_serial_number text,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  resolved_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_warranty_claims TO authenticated;
GRANT ALL ON public.supplier_warranty_claims TO service_role;
ALTER TABLE public.supplier_warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON public.supplier_warranty_claims
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_supplier_warranty_claims_updated_at
  BEFORE UPDATE ON public.supplier_warranty_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Repair cost on fault record
ALTER TABLE public.warranty_fault_log
  ADD COLUMN IF NOT EXISTS repair_cost_nis numeric,
  ADD COLUMN IF NOT EXISTS repair_currency text DEFAULT 'NIS',
  ADD COLUMN IF NOT EXISTS repair_workshop text,
  ADD COLUMN IF NOT EXISTS repair_paid_date date,
  ADD COLUMN IF NOT EXISTS repair_notes text,
  ADD COLUMN IF NOT EXISTS repair_expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;
