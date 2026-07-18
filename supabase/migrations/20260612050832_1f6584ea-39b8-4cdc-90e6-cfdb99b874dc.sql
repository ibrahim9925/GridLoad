CREATE OR REPLACE FUNCTION public.force_close_po(p_po_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'only admins can force-close a purchase order';
  END IF;
  UPDATE public.purchase_orders
    SET status = 'closed',
        notes = COALESCE(notes,'') || E'\n[FORCE-CLOSED ' || to_char(now(),'YYYY-MM-DD HH24:MI') || ' by ' || COALESCE(v_user::text,'system') || ']: ' || COALESCE(p_reason,'no reason given'),
        updated_at = now()
    WHERE id = p_po_id;
  RETURN jsonb_build_object('po_id', p_po_id, 'status', 'closed');
END $$;

GRANT EXECUTE ON FUNCTION public.force_close_po(uuid, text) TO authenticated;