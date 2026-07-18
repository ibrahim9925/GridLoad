
ALTER TABLE public.po_payments_out
  ADD COLUMN IF NOT EXISTS needs_reconciliation boolean NOT NULL DEFAULT false;

UPDATE public.po_payments_out
SET needs_reconciliation = true
WHERE bank_account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_po_payments_out_needs_reconciliation
  ON public.po_payments_out (needs_reconciliation) WHERE needs_reconciliation = true;

CREATE OR REPLACE FUNCTION public.tr_po_payments_out_set_reconciliation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.needs_reconciliation := (NEW.bank_account_id IS NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_po_payments_out_set_reconciliation ON public.po_payments_out;
CREATE TRIGGER trg_po_payments_out_set_reconciliation
  BEFORE INSERT OR UPDATE OF bank_account_id ON public.po_payments_out
  FOR EACH ROW EXECUTE FUNCTION public.tr_po_payments_out_set_reconciliation();

CREATE OR REPLACE FUNCTION public.get_pending_reconciliation()
RETURNS TABLE (
  id uuid,
  purchase_order_id uuid,
  po_number text,
  supplier_id uuid,
  supplier_name text,
  amount numeric,
  currency text,
  nis_equivalent numeric,
  payment_date timestamptz,
  payment_method text,
  reference_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pop.id,
    pop.purchase_order_id,
    po.order_number AS po_number,
    po.supplier_id,
    s.name AS supplier_name,
    pop.amount,
    pop.original_currency AS currency,
    pop.nis_equivalent,
    pop.payment_date,
    pop.payment_method,
    NULL::text AS reference_number
  FROM public.po_payments_out pop
  LEFT JOIN public.purchase_orders po ON po.id = pop.purchase_order_id
  LEFT JOIN public.suppliers s ON s.id = po.supplier_id
  WHERE pop.needs_reconciliation = true OR pop.bank_account_id IS NULL
  ORDER BY pop.payment_date DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_reconciliation() TO authenticated, service_role;
