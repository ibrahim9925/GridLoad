-- Standardize sellable serial status on 'available' (matches CHECK constraint + sale picker).
-- Warehouse register_shipment_serials previously wrote 'in_stock', which the sale UI never queried.

UPDATE public.product_serial_numbers
SET status = 'available'
WHERE status = 'in_stock';

CREATE OR REPLACE FUNCTION public.register_shipment_serials(
  p_shipment_id uuid,
  p_items jsonb
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
        VALUES ((v_item->>'product_id')::uuid, TRIM(v_sn), 'available', p_shipment_id, now());
        v_inserted := v_inserted + 1;
      EXCEPTION WHEN unique_violation THEN
        v_dupes := v_dupes + 1;
      END;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('inserted', v_inserted, 'duplicates_skipped', v_dupes);
END $$;
