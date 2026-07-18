
-- 1. po_shipments
CREATE TABLE IF NOT EXISTS public.po_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  shipment_number text UNIQUE,
  status text NOT NULL DEFAULT 'in_transit', -- in_transit | at_port | arrived | closed
  shipment_date date,
  expected_arrival_date date,
  actual_arrival_date date,
  warehouse_arrival_date date,
  shipping_method text,
  tracking_number text,
  freight_estimate numeric DEFAULT 0,
  clearance_estimate numeric DEFAULT 0,
  condition_notes text,
  has_variance boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.po_shipments TO authenticated;
GRANT ALL ON public.po_shipments TO service_role;
ALTER TABLE public.po_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_shipments authenticated read" ON public.po_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_shipments admin/warehouse manage" ON public.po_shipments FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse())
  WITH CHECK (public.is_admin() OR public.is_warehouse());

-- 2. po_shipment_items
CREATE TABLE IF NOT EXISTS public.po_shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.po_shipments(id) ON DELETE CASCADE,
  purchase_order_item_id uuid REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity_ordered_snapshot integer NOT NULL DEFAULT 0,
  quantity_received integer NOT NULL DEFAULT 0,
  variance integer GENERATED ALWAYS AS (quantity_received - quantity_ordered_snapshot) STORED,
  condition text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.po_shipment_items TO authenticated;
GRANT ALL ON public.po_shipment_items TO service_role;
ALTER TABLE public.po_shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_shipment_items authenticated read" ON public.po_shipment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "po_shipment_items admin/warehouse manage" ON public.po_shipment_items FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse())
  WITH CHECK (public.is_admin() OR public.is_warehouse());

-- 3. Alter po_payments_out
ALTER TABLE public.po_payments_out
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.po_shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_type text;

-- 4. Shipment number generator
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int; v_year text;
BEGIN
  v_year := to_char(now(),'YYYY');
  SELECT COUNT(*)+1 INTO v_count FROM public.po_shipments
   WHERE created_at >= date_trunc('year', now());
  RETURN 'SHIP-' || v_year || '-' || LPAD(v_count::text, 3, '0');
END $$;

CREATE OR REPLACE FUNCTION public.tr_po_shipments_set_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
    NEW.shipment_number := public.generate_shipment_number();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_po_shipments_set_number ON public.po_shipments;
CREATE TRIGGER trg_po_shipments_set_number BEFORE INSERT OR UPDATE ON public.po_shipments
  FOR EACH ROW EXECUTE FUNCTION public.tr_po_shipments_set_number();

-- 5. confirm_warehouse_arrival: ONLY way stock increments
CREATE OR REPLACE FUNCTION public.confirm_warehouse_arrival(
  p_shipment_id uuid,
  p_items jsonb,            -- [{"po_item_id":uuid,"product_id":uuid,"quantity_received":int,"condition":"text"}]
  p_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_po_id uuid;
  v_item jsonb;
  v_prev int;
  v_received int;
  v_ordered int;
  v_product_id uuid;
  v_po_item_id uuid;
  v_has_variance boolean := false;
  v_all_received boolean;
  v_user uuid := auth.uid();
BEGIN
  SELECT purchase_order_id INTO v_po_id FROM public.po_shipments WHERE id = p_shipment_id;
  IF v_po_id IS NULL THEN RAISE EXCEPTION 'shipment not found'; END IF;

  -- Clear any previous shipment_items for idempotency
  DELETE FROM public.po_shipment_items WHERE shipment_id = p_shipment_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_po_item_id := NULLIF(v_item->>'po_item_id','')::uuid;
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_received := COALESCE((v_item->>'quantity_received')::int, 0);
    SELECT quantity INTO v_ordered FROM public.purchase_order_items WHERE id = v_po_item_id;
    v_ordered := COALESCE(v_ordered, v_received);

    INSERT INTO public.po_shipment_items (shipment_id, purchase_order_item_id, product_id, quantity_ordered_snapshot, quantity_received, condition)
    VALUES (p_shipment_id, v_po_item_id, v_product_id, v_ordered, v_received, v_item->>'condition');

    IF v_received <> v_ordered THEN v_has_variance := true; END IF;

    IF v_product_id IS NOT NULL AND v_received > 0 THEN
      SELECT COALESCE(current_stock,0) INTO v_prev FROM public.products WHERE id = v_product_id;
      UPDATE public.products SET current_stock = COALESCE(current_stock,0) + v_received, updated_at = now()
        WHERE id = v_product_id;
      INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by, previous_stock, new_stock)
      VALUES (v_product_id, 'in', v_received, p_shipment_id, 'po_shipment',
              'Warehouse arrival ' || (SELECT shipment_number FROM public.po_shipments WHERE id = p_shipment_id),
              v_user, v_prev, v_prev + v_received);

      UPDATE public.purchase_order_items
        SET received_quantity = COALESCE(received_quantity,0) + v_received,
            status = CASE WHEN COALESCE(received_quantity,0) + v_received >= quantity THEN 'received' ELSE 'partial' END
        WHERE id = v_po_item_id;
    END IF;
  END LOOP;

  UPDATE public.po_shipments
     SET status = 'arrived', warehouse_arrival_date = CURRENT_DATE,
         has_variance = v_has_variance,
         condition_notes = COALESCE(p_notes, condition_notes),
         updated_at = now()
   WHERE id = p_shipment_id;

  -- Determine if PO is fully received
  SELECT bool_and(COALESCE(received_quantity,0) >= quantity) INTO v_all_received
    FROM public.purchase_order_items WHERE purchase_order_id = v_po_id;

  IF v_all_received THEN
    UPDATE public.purchase_orders SET status = 'received', received_date = now(), updated_at = now() WHERE id = v_po_id;
  ELSE
    UPDATE public.purchase_orders SET status = 'partial', updated_at = now() WHERE id = v_po_id;
  END IF;

  RETURN jsonb_build_object('shipment_id', p_shipment_id, 'po_id', v_po_id, 'has_variance', v_has_variance, 'all_received', v_all_received);
END $$;

-- 6. get_po_status
CREATE OR REPLACE FUNCTION public.get_po_status(p_po_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_po record; v_paid numeric; v_units int; v_shipments jsonb;
BEGIN
  SELECT * INTO v_po FROM public.purchase_orders WHERE id = p_po_id;
  IF v_po.id IS NULL THEN RAISE EXCEPTION 'po not found'; END IF;

  SELECT COALESCE(SUM(COALESCE(NULLIF(nis_equivalent,0), amount)),0) INTO v_paid
    FROM public.po_payments_out WHERE purchase_order_id = p_po_id;

  SELECT COALESCE(SUM(quantity_received),0) INTO v_units
    FROM public.po_shipment_items si
    JOIN public.po_shipments s ON s.id = si.shipment_id
    WHERE s.purchase_order_id = p_po_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'shipment_number', s.shipment_number, 'status', s.status,
    'shipment_date', s.shipment_date, 'expected_arrival_date', s.expected_arrival_date,
    'warehouse_arrival_date', s.warehouse_arrival_date, 'tracking_number', s.tracking_number,
    'has_variance', s.has_variance
  ) ORDER BY s.created_at), '[]'::jsonb) INTO v_shipments
  FROM public.po_shipments s WHERE s.purchase_order_id = p_po_id;

  RETURN jsonb_build_object(
    'po_id', p_po_id, 'order_number', v_po.order_number, 'stage', v_po.status,
    'total_paid_nis', ROUND(v_paid,2), 'total_units_received', v_units,
    'landed_cost_per_unit_nis', CASE WHEN v_units>0 THEN ROUND(v_paid/v_units,2) ELSE 0 END,
    'shipments', v_shipments
  );
END $$;

-- 7. get_active_shipments
CREATE OR REPLACE FUNCTION public.get_active_shipments()
RETURNS TABLE(
  shipment_id uuid, shipment_number text, status text, po_id uuid, po_number text,
  supplier_name text, shipment_date date, expected_arrival_date date, tracking_number text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.shipment_number, s.status, po.id, po.order_number, sup.name,
         s.shipment_date, s.expected_arrival_date, s.tracking_number
  FROM public.po_shipments s
  JOIN public.purchase_orders po ON po.id = s.purchase_order_id
  LEFT JOIN public.suppliers sup ON sup.id = po.supplier_id
  WHERE s.status IN ('in_transit','at_port')
  ORDER BY s.expected_arrival_date NULLS LAST;
$$;
