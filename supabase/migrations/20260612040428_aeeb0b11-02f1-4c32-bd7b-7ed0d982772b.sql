
-- ===== 1. Helpers =====
CREATE OR REPLACE FUNCTION public.sale_nis_amount(
  p_total numeric, p_currency text, p_amount_nis numeric, p_date timestamptz
) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(p_amount_nis, 0) > 0 THEN p_amount_nis
    WHEN COALESCE(p_currency, 'NIS') = 'NIS' THEN COALESCE(p_total, 0)
    ELSE COALESCE(p_total, 0) * public.get_exchange_rate(
      COALESCE(p_currency, 'NIS'), 'NIS', COALESCE(p_date::date, CURRENT_DATE)
    )
  END;
$$;

-- ===== 2. Customer balance (NIS) =====
CREATE OR REPLACE FUNCTION public.get_customer_balance(p_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoiced numeric;
  v_paid numeric;
BEGIN
  SELECT COALESCE(SUM(public.sale_nis_amount(total_amount, currency, amount_nis, sale_date)), 0)
  INTO v_invoiced
  FROM public.sales
  WHERE customer_id = p_customer_id
    AND COALESCE(status, 'active') <> 'cancelled';

  SELECT COALESCE(SUM(COALESCE(NULLIF(nis_equivalent, 0), amount)), 0)
  INTO v_paid
  FROM public.payments
  WHERE customer_id = p_customer_id
    AND COALESCE(status, 'completed') = 'completed';

  RETURN jsonb_build_object(
    'total_invoiced_nis', ROUND(v_invoiced, 2),
    'total_paid_nis', ROUND(v_paid, 2),
    'outstanding_nis', ROUND(v_invoiced - v_paid, 2)
  );
END;
$$;

-- ===== 3. Customer ledger (chronological, NIS running balance) =====
CREATE OR REPLACE FUNCTION public.get_customer_ledger(p_customer_id uuid)
RETURNS TABLE(
  entry_type text,
  entry_date timestamptz,
  reference text,
  debit_nis numeric,
  credit_nis numeric,
  running_balance_nis numeric,
  original_amount numeric,
  original_currency text,
  entry_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH entries AS (
    SELECT
      'sale'::text AS t,
      sale_date AS d,
      COALESCE(sale_number, invoice_number, LEFT(id::text, 8)) AS ref,
      ROUND(public.sale_nis_amount(total_amount, currency, amount_nis, sale_date), 2) AS debit,
      0::numeric AS credit,
      total_amount AS oa,
      COALESCE(currency, 'NIS') AS oc,
      id AS eid
    FROM public.sales
    WHERE customer_id = p_customer_id AND COALESCE(status, 'active') <> 'cancelled'
    UNION ALL
    SELECT
      'payment'::text,
      payment_date,
      COALESCE(reference_number, payment_method, LEFT(id::text, 8)),
      0::numeric,
      ROUND(COALESCE(NULLIF(nis_equivalent, 0), amount), 2),
      COALESCE(original_amount, amount),
      COALESCE(original_currency, 'NIS'),
      id
    FROM public.payments
    WHERE customer_id = p_customer_id AND COALESCE(status, 'completed') = 'completed'
  ), ordered AS (
    SELECT entries.*,
      SUM(debit - credit) OVER (
        ORDER BY d ASC, t DESC, eid
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS rb
    FROM entries
  )
  SELECT t, d, ref, debit, credit, ROUND(rb, 2), oa, oc, eid
  FROM ordered
  ORDER BY d ASC, t DESC, eid;
$$;

-- ===== 4. Supplier balance (NIS) =====
CREATE OR REPLACE FUNCTION public.get_supplier_balance(p_supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ordered numeric;
  v_paid numeric;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(currency, 'USD') = 'NIS' THEN COALESCE(total_amount, 0)
      ELSE COALESCE(total_amount, 0) * public.get_exchange_rate(
        COALESCE(currency, 'USD'), 'NIS', COALESCE(order_date::date, CURRENT_DATE)
      )
    END
  ), 0)
  INTO v_ordered
  FROM public.purchase_orders
  WHERE supplier_id = p_supplier_id
    AND COALESCE(status, '') <> 'cancelled';

  SELECT COALESCE(SUM(COALESCE(NULLIF(po.nis_equivalent, 0), po.amount)), 0)
  INTO v_paid
  FROM public.po_payments_out po
  JOIN public.purchase_orders p ON p.id = po.purchase_order_id
  WHERE p.supplier_id = p_supplier_id;

  RETURN jsonb_build_object(
    'total_ordered_nis', ROUND(v_ordered, 2),
    'total_paid_nis', ROUND(v_paid, 2),
    'outstanding_nis', ROUND(v_ordered - v_paid, 2)
  );
END;
$$;

-- ===== 5. Add bank_account_id to po_payments_out =====
ALTER TABLE public.po_payments_out
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);

-- ===== 6. Idempotency indexes on bank_ledger =====
-- Clean up any duplicates already linked to the same payment, keeping the newest.
DELETE FROM public.bank_ledger a
USING public.bank_ledger b
WHERE a.linked_payment_id IS NOT NULL
  AND a.linked_payment_id = b.linked_payment_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS bank_ledger_linked_payment_uniq
  ON public.bank_ledger (linked_payment_id)
  WHERE linked_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bank_ledger_ref_uniq
  ON public.bank_ledger (reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- ===== 7. Bank balance recompute function =====
CREATE OR REPLACE FUNCTION public.recompute_bank_account_balance(p_account_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_opening numeric;
  v_sum numeric;
BEGIN
  IF p_account_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(opening_balance, 0) INTO v_opening
  FROM public.bank_accounts WHERE id = p_account_id;

  SELECT COALESCE(SUM(
    CASE
      WHEN UPPER(transaction_type) IN ('IN', 'CREDIT', 'DEPOSIT')  THEN  COALESCE(NULLIF(nis_value, 0), amount)
      WHEN UPPER(transaction_type) IN ('OUT', 'DEBIT', 'WITHDRAWAL') THEN -COALESCE(NULLIF(nis_value, 0), amount)
      ELSE 0
    END
  ), 0) INTO v_sum
  FROM public.bank_ledger
  WHERE bank_account_id = p_account_id;

  UPDATE public.bank_accounts
  SET current_balance = ROUND(v_opening + v_sum, 2),
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- ===== 8. Trigger: bank_ledger → bank_accounts.current_balance =====
CREATE OR REPLACE FUNCTION public.tr_bank_ledger_sync_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_bank_account_balance(OLD.bank_account_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_bank_account_balance(NEW.bank_account_id);
  IF TG_OP = 'UPDATE'
     AND OLD.bank_account_id IS DISTINCT FROM NEW.bank_account_id THEN
    PERFORM public.recompute_bank_account_balance(OLD.bank_account_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bank_ledger_sync_balance ON public.bank_ledger;
CREATE TRIGGER bank_ledger_sync_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_ledger
  FOR EACH ROW EXECUTE FUNCTION public.tr_bank_ledger_sync_balance();

-- ===== 9. Trigger: payments → bank_ledger =====
CREATE OR REPLACE FUNCTION public.tr_payments_to_bank_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amt numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bank_ledger WHERE linked_payment_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.bank_account_id IS NULL
     OR COALESCE(NEW.status, 'completed') <> 'completed' THEN
    DELETE FROM public.bank_ledger WHERE linked_payment_id = NEW.id;
    RETURN NEW;
  END IF;

  v_amt := COALESCE(NULLIF(NEW.nis_equivalent, 0), NEW.amount);

  INSERT INTO public.bank_ledger (
    bank_account_id, transaction_type, amount, currency, nis_value,
    description, date, linked_payment_id, linked_sale_id,
    reference_number, created_by
  ) VALUES (
    NEW.bank_account_id, 'IN', v_amt, 'NIS', v_amt,
    'Customer payment ' || COALESCE(NEW.reference_number, ''),
    COALESCE(NEW.payment_date::date, CURRENT_DATE),
    NEW.id, NEW.sale_id, NEW.reference_number, NEW.created_by
  )
  ON CONFLICT (linked_payment_id) WHERE linked_payment_id IS NOT NULL
  DO UPDATE SET
    bank_account_id = EXCLUDED.bank_account_id,
    amount = EXCLUDED.amount,
    nis_value = EXCLUDED.nis_value,
    date = EXCLUDED.date,
    reference_number = EXCLUDED.reference_number,
    linked_sale_id = EXCLUDED.linked_sale_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_to_bank_ledger ON public.payments;
CREATE TRIGGER payments_to_bank_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tr_payments_to_bank_ledger();

-- ===== 10. Trigger: po_payments_out → bank_ledger =====
CREATE OR REPLACE FUNCTION public.tr_po_payments_out_to_bank_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_amt numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bank_ledger
    WHERE reference_type = 'po_payment' AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.bank_account_id IS NULL THEN
    DELETE FROM public.bank_ledger
    WHERE reference_type = 'po_payment' AND reference_id = NEW.id;
    RETURN NEW;
  END IF;

  v_amt := COALESCE(NULLIF(NEW.nis_equivalent, 0), NEW.amount);

  INSERT INTO public.bank_ledger (
    bank_account_id, transaction_type, amount, currency, nis_value,
    description, date, reference_id, reference_type, created_by
  ) VALUES (
    NEW.bank_account_id, 'OUT', v_amt, 'NIS', v_amt,
    'PO payment', COALESCE(NEW.payment_date::date, CURRENT_DATE),
    NEW.id, 'po_payment', NEW.created_by
  )
  ON CONFLICT (reference_type, reference_id) WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL
  DO UPDATE SET
    bank_account_id = EXCLUDED.bank_account_id,
    amount = EXCLUDED.amount,
    nis_value = EXCLUDED.nis_value,
    date = EXCLUDED.date;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS po_payments_out_to_bank_ledger ON public.po_payments_out;
CREATE TRIGGER po_payments_out_to_bank_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.po_payments_out
  FOR EACH ROW EXECUTE FUNCTION public.tr_po_payments_out_to_bank_ledger();

-- ===== 11. Backfill: recompute every existing bank account balance =====
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.bank_accounts LOOP
    PERFORM public.recompute_bank_account_balance(r.id);
  END LOOP;
END $$;

-- ===== 12. Grant execute on new RPCs =====
GRANT EXECUTE ON FUNCTION public.get_customer_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sale_nis_amount(numeric, text, numeric, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_bank_account_balance(uuid) TO authenticated;
