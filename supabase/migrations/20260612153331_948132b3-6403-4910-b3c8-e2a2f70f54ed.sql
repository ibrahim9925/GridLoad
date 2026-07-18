
-- Add versioning to quotations and a server-side conversion RPC, plus mark-expired helper.

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0;

-- Auto-expire stale draft/sent quotations on read
CREATE OR REPLACE FUNCTION public.mark_expired_quotations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.quotations
  SET status = 'expired', updated_at = now()
  WHERE status IN ('draft','sent')
    AND valid_until IS NOT NULL
    AND valid_until < now();
$$;

-- Conversion RPC: copies quotation + items to sales + sale_items
CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice(p_quotation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.quotations%ROWTYPE;
  v_sale_id uuid;
  v_sale_number text;
  v_user uuid := auth.uid();
  v_nis numeric;
BEGIN
  SELECT * INTO v_q FROM public.quotations WHERE id = p_quotation_id;
  IF v_q.id IS NULL THEN RAISE EXCEPTION 'quotation not found'; END IF;
  IF v_q.converted_to_sale_id IS NOT NULL THEN
    RETURN v_q.converted_to_sale_id;
  END IF;

  v_sale_number := public.generate_sale_number();
  v_nis := CASE WHEN COALESCE(v_q.currency,'NIS') = 'NIS'
                THEN COALESCE(v_q.total_amount,0)
                ELSE COALESCE(v_q.total_amount,0)
                     * public.get_exchange_rate(COALESCE(v_q.currency,'NIS'),'NIS') END;

  INSERT INTO public.sales (
    customer_id, sale_date, total_amount, discount_amount, tax_amount, net_amount,
    payment_status, currency, exchange_rate, amount_nis, notes,
    created_by, sales_rep_id, status, sale_number, balance_due
  ) VALUES (
    v_q.customer_id, now(), v_q.total_amount, COALESCE(v_q.discount_amount,0),
    COALESCE(v_q.tax_amount,0), COALESCE(v_q.net_amount, v_q.total_amount),
    'pending', COALESCE(v_q.currency,'NIS'), COALESCE(v_q.exchange_rate,1),
    ROUND(v_nis,2),
    COALESCE(v_q.notes,'') || E'\nConverted from quotation ' || v_q.quote_number,
    v_user, v_user, 'active', v_sale_number, ROUND(v_nis,2)
  ) RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, discount, total, notes, description)
  SELECT v_sale_id, qi.product_id, qi.quantity, qi.unit_price,
         COALESCE(qi.discount,0), qi.total, qi.notes, qi.description
  FROM public.quotation_items qi
  WHERE qi.quotation_id = p_quotation_id;

  UPDATE public.quotations
  SET status = 'accepted', converted_to_sale_id = v_sale_id, updated_at = now()
  WHERE id = p_quotation_id;

  RETURN v_sale_id;
END;
$$;

-- Pending quotations summary for zara-api
CREATE OR REPLACE FUNCTION public.get_pending_quotations()
RETURNS TABLE(
  id uuid, quote_number text, customer_name text, total_amount numeric,
  currency text, valid_until timestamptz, days_until_expiry integer, status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.quote_number,
         COALESCE(c.contact_person, c.company_name, '—') AS customer_name,
         q.total_amount, COALESCE(q.currency,'NIS'),
         q.valid_until,
         CASE WHEN q.valid_until IS NULL THEN NULL
              ELSE GREATEST(0, (q.valid_until::date - CURRENT_DATE))::int END,
         q.status
  FROM public.quotations q
  LEFT JOIN public.customers c ON c.id = q.customer_id
  WHERE q.status IN ('draft','sent')
    AND (q.valid_until IS NULL OR q.valid_until >= now())
  ORDER BY q.valid_until NULLS LAST;
$$;
