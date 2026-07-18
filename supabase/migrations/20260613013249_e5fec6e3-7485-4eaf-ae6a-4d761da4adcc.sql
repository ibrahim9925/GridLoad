
-- ============ checks table ============
CREATE TABLE IF NOT EXISTS public.checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_number text NOT NULL,
  issuing_bank text,
  check_date date,
  due_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NIS',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','cleared','bounced','cancelled')),
  cleared_date date,
  cleared_to_bank_account_id uuid REFERENCES public.bank_accounts(id),
  bounce_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checks TO authenticated;
GRANT ALL ON public.checks TO service_role;

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checks_admin_accountant_rw" ON public.checks
  FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['admin','accountant']::app_role[]))
  WITH CHECK (public.has_any_role(ARRAY['admin','accountant']::app_role[]));

CREATE INDEX IF NOT EXISTS idx_checks_status_due ON public.checks (status, due_date);
CREATE INDEX IF NOT EXISTS idx_checks_sale ON public.checks (sale_id);
CREATE INDEX IF NOT EXISTS idx_checks_payment ON public.checks (payment_id);

CREATE TRIGGER trg_checks_updated_at
  BEFORE UPDATE ON public.checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPC: clear_check ============
CREATE OR REPLACE FUNCTION public.clear_check(
  p_check_id uuid,
  p_bank_account_id uuid,
  p_cleared_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_check public.checks%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','accountant']::app_role[]) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT * INTO v_check FROM public.checks WHERE id = p_check_id FOR UPDATE;
  IF v_check.id IS NULL THEN RAISE EXCEPTION 'check not found'; END IF;
  IF v_check.status <> 'pending' THEN
    RAISE EXCEPTION 'check is % and cannot be cleared', v_check.status;
  END IF;
  IF p_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'bank_account_id is required';
  END IF;

  UPDATE public.checks
    SET status = 'cleared',
        cleared_date = COALESCE(p_cleared_date, CURRENT_DATE),
        cleared_to_bank_account_id = p_bank_account_id,
        updated_at = now()
    WHERE id = p_check_id;

  -- Push the linked payment to the bank ledger by assigning a bank account
  -- and using the cleared date as the payment date (ledger trigger handles the rest).
  IF v_check.payment_id IS NOT NULL THEN
    UPDATE public.payments
      SET bank_account_id = p_bank_account_id,
          payment_date = COALESCE(p_cleared_date, CURRENT_DATE)::timestamptz,
          status = 'completed'
      WHERE id = v_check.payment_id;
  END IF;

  RETURN jsonb_build_object('check_id', p_check_id, 'status', 'cleared');
END $$;

-- ============ RPC: bounce_check ============
CREATE OR REPLACE FUNCTION public.bounce_check(
  p_check_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_check public.checks%ROWTYPE;
  v_pay public.payments%ROWTYPE;
  v_user uuid := auth.uid();
  v_new_paid numeric;
  v_total numeric;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','accountant']::app_role[]) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT * INTO v_check FROM public.checks WHERE id = p_check_id FOR UPDATE;
  IF v_check.id IS NULL THEN RAISE EXCEPTION 'check not found'; END IF;
  IF v_check.status <> 'pending' THEN
    RAISE EXCEPTION 'check is % and cannot be bounced', v_check.status;
  END IF;

  UPDATE public.checks
    SET status = 'bounced',
        bounce_reason = p_reason,
        updated_at = now()
    WHERE id = p_check_id;

  -- Insert a reversal payment (negative) for audit if original payment exists
  IF v_check.payment_id IS NOT NULL THEN
    SELECT * INTO v_pay FROM public.payments WHERE id = v_check.payment_id;
    IF v_pay.id IS NOT NULL THEN
      INSERT INTO public.payments (
        sale_id, customer_id, amount, original_amount, original_currency,
        exchange_rate_to_nis, nis_equivalent, payment_method, payment_date,
        reference_number, notes, status, created_by, method_details
      ) VALUES (
        v_pay.sale_id, v_pay.customer_id,
        -COALESCE(v_pay.amount, 0),
        -COALESCE(v_pay.original_amount, v_pay.amount, 0),
        v_pay.original_currency,
        v_pay.exchange_rate_to_nis,
        -COALESCE(v_pay.nis_equivalent, v_pay.amount, 0),
        'check_bounce',
        CURRENT_DATE,
        'BOUNCE-' || COALESCE(v_check.check_number,''),
        'Check bounced: ' || COALESCE(p_reason,'no reason'),
        'completed', v_user,
        jsonb_build_object('bounced_check_id', p_check_id, 'reason', p_reason)
      );

      -- Recompute sale balance if linked
      IF v_pay.sale_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount),0) INTO v_new_paid
          FROM public.payments
         WHERE sale_id = v_pay.sale_id AND COALESCE(status,'completed') = 'completed';
        SELECT total_amount INTO v_total FROM public.sales WHERE id = v_pay.sale_id;
        UPDATE public.sales
          SET balance_due = GREATEST(COALESCE(v_total,0) - v_new_paid, 0),
              payment_status = CASE
                WHEN COALESCE(v_total,0) - v_new_paid <= 0.01 THEN 'paid'
                WHEN v_new_paid > 0 THEN 'partial_paid'
                ELSE 'pending'
              END,
              updated_at = now()
          WHERE id = v_pay.sale_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('check_id', p_check_id, 'status', 'bounced');
END $$;

-- ============ RPC: get_pending_checks ============
CREATE OR REPLACE FUNCTION public.get_pending_checks()
RETURNS TABLE (
  id uuid,
  check_number text,
  issuing_bank text,
  check_date date,
  due_date date,
  amount numeric,
  currency text,
  customer_id uuid,
  customer_name text,
  sale_id uuid,
  sale_number text,
  days_until_due integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ch.id, ch.check_number, ch.issuing_bank, ch.check_date, ch.due_date,
    ch.amount, ch.currency, ch.customer_id,
    COALESCE(c.contact_person, c.company_name, '—') AS customer_name,
    ch.sale_id,
    COALESCE(s.sale_number, s.invoice_number) AS sale_number,
    (ch.due_date - CURRENT_DATE)::int AS days_until_due
  FROM public.checks ch
  LEFT JOIN public.customers c ON c.id = ch.customer_id
  LEFT JOIN public.sales s ON s.id = ch.sale_id
  WHERE ch.status = 'pending'
  ORDER BY ch.due_date ASC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_checks_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'count', COUNT(*),
    'total_amount_nis', ROUND(COALESCE(SUM(
      amount * public.get_exchange_rate(COALESCE(currency,'NIS'),'NIS')
    ),0), 2),
    'next_due_date', MIN(due_date)
  )
  FROM public.checks WHERE status = 'pending';
$$;
