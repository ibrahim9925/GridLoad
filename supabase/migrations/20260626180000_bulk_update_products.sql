-- Atomic bulk update for product catalog metadata (admin only)
CREATE OR REPLACE FUNCTION public.bulk_update_products(
  p_product_ids uuid[],
  p_updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected int;
  v_updated int;
  v_supplier_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_product_ids IS NULL OR array_length(p_product_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No products selected';
  END IF;

  IF p_updates IS NULL OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'No fields to update';
  END IF;

  v_expected := array_length(p_product_ids, 1);

  IF NOT (
    p_updates ? 'brand'
    OR p_updates ? 'product_type'
    OR p_updates ? 'category'
    OR p_updates ? 'warranty_months'
    OR p_updates ? 'supplier_id'
  ) THEN
    RAISE EXCEPTION 'No allowed fields in update payload';
  END IF;

  IF p_updates ? 'supplier_id' THEN
    SELECT name INTO v_supplier_name
    FROM public.suppliers
    WHERE id = NULLIF(p_updates->>'supplier_id', '')::uuid;

    IF NULLIF(p_updates->>'supplier_id', '') IS NOT NULL AND v_supplier_name IS NULL THEN
      RAISE EXCEPTION 'Invalid supplier_id';
    END IF;
  END IF;

  UPDATE public.products p
  SET
    brand = CASE
      WHEN p_updates ? 'brand' THEN NULLIF(p_updates->>'brand', '')
      ELSE p.brand
    END,
    product_type = CASE
      WHEN p_updates ? 'product_type' THEN (p_updates->>'product_type')::public.product_type_enum
      ELSE p.product_type
    END,
    category = CASE
      WHEN p_updates ? 'category' THEN NULLIF(p_updates->>'category', '')
      ELSE p.category
    END,
    warranty_months = CASE
      WHEN p_updates ? 'warranty_months' THEN (p_updates->>'warranty_months')::int
      ELSE p.warranty_months
    END,
    supplier_id = CASE
      WHEN p_updates ? 'supplier_id' THEN NULLIF(p_updates->>'supplier_id', '')::uuid
      ELSE p.supplier_id
    END,
    supplier = CASE
      WHEN p_updates ? 'supplier_id' THEN v_supplier_name
      ELSE p.supplier
    END,
    updated_at = now()
  WHERE p.id = ANY (p_product_ids);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated <> v_expected THEN
    RAISE EXCEPTION 'Bulk update failed: expected % products, updated %', v_expected, v_updated;
  END IF;

  RETURN jsonb_build_object('updated_count', v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_products(uuid[], jsonb) TO authenticated;
