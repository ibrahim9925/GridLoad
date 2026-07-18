
-- ============== Cash Bundles ==============
CREATE TABLE IF NOT EXISTS public.cash_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  opened_date timestamptz NOT NULL DEFAULT now(),
  source_type text,
  source_id uuid,
  original_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NIS',
  status text NOT NULL DEFAULT 'open',
  notes text,
  deposit_batch_id uuid,
  closed_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_bundles_status_chk CHECK (status IN ('open','partially_spent','deposited','closed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_bundles TO authenticated;
GRANT ALL ON public.cash_bundles TO service_role;
ALTER TABLE public.cash_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read cash bundles" ON public.cash_bundles;
CREATE POLICY "Authenticated can read cash bundles" ON public.cash_bundles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can write cash bundles" ON public.cash_bundles;
CREATE POLICY "Authenticated can write cash bundles" ON public.cash_bundles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cash_bundles_status ON public.cash_bundles(status);

CREATE OR REPLACE FUNCTION public.generate_bundle_reference()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n FROM public.cash_bundles;
  RETURN 'BUNDLE-' || LPAD(n::text, 3, '0');
END $$;

CREATE OR REPLACE FUNCTION public.tr_cash_bundles_set_ref()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := public.generate_bundle_reference();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_cash_bundles_set_ref ON public.cash_bundles;
CREATE TRIGGER trg_cash_bundles_set_ref BEFORE INSERT OR UPDATE ON public.cash_bundles
FOR EACH ROW EXECUTE FUNCTION public.tr_cash_bundles_set_ref();

-- Link spend tables
ALTER TABLE public.expenses        ADD COLUMN IF NOT EXISTS cash_bundle_id uuid REFERENCES public.cash_bundles(id);
ALTER TABLE public.po_payments_out ADD COLUMN IF NOT EXISTS cash_bundle_id uuid REFERENCES public.cash_bundles(id);
CREATE INDEX IF NOT EXISTS idx_expenses_cash_bundle ON public.expenses(cash_bundle_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_out_cash_bundle ON public.po_payments_out(cash_bundle_id);

CREATE OR REPLACE FUNCTION public.get_bundle_remaining(p_bundle_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT original_amount FROM public.cash_bundles WHERE id = p_bundle_id), 0)
    - COALESCE((
        SELECT SUM(amount * public.get_exchange_rate(COALESCE(currency,'NIS'),'NIS'))
        FROM public.expenses WHERE cash_bundle_id = p_bundle_id
      ), 0)
    - COALESCE((
        SELECT SUM(COALESCE(NULLIF(nis_equivalent,0), amount))
        FROM public.po_payments_out WHERE cash_bundle_id = p_bundle_id
      ), 0);
$$;

CREATE OR REPLACE FUNCTION public.refresh_bundle_status(p_bundle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_original numeric; v_remaining numeric; v_status text;
BEGIN
  IF p_bundle_id IS NULL THEN RETURN; END IF;
  SELECT original_amount, status INTO v_original, v_status FROM public.cash_bundles WHERE id = p_bundle_id;
  IF v_original IS NULL THEN RETURN; END IF;
  IF v_status IN ('deposited','closed') THEN RETURN; END IF;
  v_remaining := public.get_bundle_remaining(p_bundle_id);
  IF v_remaining >= v_original THEN
    UPDATE public.cash_bundles SET status='open', updated_at=now() WHERE id = p_bundle_id;
  ELSE
    UPDATE public.cash_bundles SET status='partially_spent', updated_at=now() WHERE id = p_bundle_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tr_bundle_spend_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_bundle_status(OLD.cash_bundle_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_bundle_status(NEW.cash_bundle_id);
  IF TG_OP = 'UPDATE' AND OLD.cash_bundle_id IS DISTINCT FROM NEW.cash_bundle_id THEN
    PERFORM public.refresh_bundle_status(OLD.cash_bundle_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_expenses_bundle_refresh ON public.expenses;
CREATE TRIGGER trg_expenses_bundle_refresh AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.tr_bundle_spend_refresh();

DROP TRIGGER IF EXISTS trg_po_payments_out_bundle_refresh ON public.po_payments_out;
CREATE TRIGGER trg_po_payments_out_bundle_refresh AFTER INSERT OR UPDATE OR DELETE ON public.po_payments_out
FOR EACH ROW EXECUTE FUNCTION public.tr_bundle_spend_refresh();

-- Auto-create bundle on large cash customer payment (>= 5000 NIS)
CREATE OR REPLACE FUNCTION public.tr_payments_autocreate_bundle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nis numeric;
BEGIN
  IF LOWER(COALESCE(NEW.payment_method,'')) <> 'cash' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status,'completed') <> 'completed' THEN RETURN NEW; END IF;
  v_nis := COALESCE(NULLIF(NEW.nis_equivalent,0), NEW.amount, 0);
  IF v_nis < 5000 THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.cash_bundles WHERE source_type='payment' AND source_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.cash_bundles (source_type, source_id, original_amount, currency, status, created_by, notes)
  VALUES ('payment', NEW.id, v_nis, 'NIS', 'open', NEW.created_by,
          'Auto-created from customer cash payment ' || COALESCE(NEW.reference_number,''));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payments_autocreate_bundle ON public.payments;
CREATE TRIGGER trg_payments_autocreate_bundle AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.tr_payments_autocreate_bundle();

-- ============== FX Transfers ==============
CREATE TABLE IF NOT EXISTS public.fx_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_date timestamptz NOT NULL DEFAULT now(),
  reference_number text,
  transfer_type text NOT NULL DEFAULT 'same_currency',
  from_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  to_account_id   uuid NOT NULL REFERENCES public.bank_accounts(id),
  from_amount numeric NOT NULL,
  from_currency text NOT NULL,
  to_amount numeric NOT NULL,
  to_currency text NOT NULL,
  exchange_rate numeric,
  from_nis numeric,
  to_nis numeric,
  fx_variance_nis numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fx_transfer_type_chk CHECK (transfer_type IN ('same_currency','fx'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_transfers TO authenticated;
GRANT ALL ON public.fx_transfers TO service_role;
ALTER TABLE public.fx_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read fx_transfers" ON public.fx_transfers;
CREATE POLICY "Authenticated can read fx_transfers" ON public.fx_transfers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can write fx_transfers" ON public.fx_transfers;
CREATE POLICY "Authenticated can write fx_transfers" ON public.fx_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.record_internal_transfer(
  p_from_account uuid, p_to_account uuid, p_from_amount numeric,
  p_exchange_rate numeric DEFAULT NULL,
  p_reference text DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from public.bank_accounts%ROWTYPE; v_to public.bank_accounts%ROWTYPE;
  v_to_amount numeric; v_type text; v_rate numeric;
  v_from_nis numeric; v_to_nis numeric; v_xfer_id uuid; v_user uuid := auth.uid();
BEGIN
  IF p_from_account = p_to_account THEN RAISE EXCEPTION 'from and to accounts must differ'; END IF;
  IF p_from_amount IS NULL OR p_from_amount <= 0 THEN RAISE EXCEPTION 'from_amount must be > 0'; END IF;

  SELECT * INTO v_from FROM public.bank_accounts WHERE id = p_from_account;
  SELECT * INTO v_to   FROM public.bank_accounts WHERE id = p_to_account;
  IF v_from.id IS NULL OR v_to.id IS NULL THEN RAISE EXCEPTION 'invalid account ids'; END IF;

  IF v_from.currency = v_to.currency THEN
    v_type := 'same_currency'; v_to_amount := p_from_amount; v_rate := 1;
  ELSE
    v_type := 'fx';
    IF p_exchange_rate IS NULL OR p_exchange_rate <= 0 THEN
      RAISE EXCEPTION 'exchange_rate is required for cross-currency transfers';
    END IF;
    v_rate := p_exchange_rate;
    v_to_amount := ROUND(p_from_amount * v_rate, 2);
  END IF;

  v_from_nis := p_from_amount * public.get_exchange_rate(v_from.currency, 'NIS');
  v_to_nis   := v_to_amount  * public.get_exchange_rate(v_to.currency,   'NIS');

  INSERT INTO public.fx_transfers (
    transfer_type, reference_number, from_account_id, to_account_id,
    from_amount, from_currency, to_amount, to_currency,
    exchange_rate, from_nis, to_nis, fx_variance_nis, notes, created_by
  ) VALUES (
    v_type, p_reference, p_from_account, p_to_account,
    p_from_amount, v_from.currency, v_to_amount, v_to.currency,
    v_rate, ROUND(v_from_nis,2), ROUND(v_to_nis,2), ROUND(v_to_nis - v_from_nis, 2),
    p_notes, v_user
  ) RETURNING id INTO v_xfer_id;

  INSERT INTO public.bank_ledger (
    bank_account_id, transaction_type, amount, currency, nis_value,
    description, date, reference_number, reference_type, reference_id, created_by
  ) VALUES (
    p_from_account, 'OUT', p_from_amount, v_from.currency, ROUND(v_from_nis,2),
    'Internal transfer to ' || COALESCE(v_to.name, v_to.account_name, 'account'),
    CURRENT_DATE, p_reference, 'internal_transfer_out', v_xfer_id, v_user
  );

  INSERT INTO public.bank_ledger (
    bank_account_id, transaction_type, amount, currency, nis_value,
    description, date, reference_number, reference_type, reference_id, created_by
  ) VALUES (
    p_to_account, 'IN', v_to_amount, v_to.currency, ROUND(v_to_nis,2),
    'Internal transfer from ' || COALESCE(v_from.name, v_from.account_name, 'account'),
    CURRENT_DATE, p_reference, 'internal_transfer_in', v_xfer_id, v_user
  );

  RETURN v_xfer_id;
END $$;
GRANT EXECUTE ON FUNCTION public.record_internal_transfer(uuid,uuid,numeric,numeric,text,text) TO authenticated, service_role;

-- ============== Bank position ==============
CREATE OR REPLACE FUNCTION public.get_bank_position()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_accounts jsonb; v_total numeric;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ba.id,
    'bank_name', ba.bank_name,
    'account_name', COALESCE(ba.account_name, ba.name),
    'nickname', ba.name,
    'currency', ba.currency,
    'native_balance', ROUND(COALESCE(ba.current_balance,0), 2),
    'nis_equivalent', ROUND(COALESCE(ba.current_balance,0) * public.get_exchange_rate(ba.currency,'NIS'), 2)
  ) ORDER BY ba.bank_name NULLS LAST, ba.currency), '[]'::jsonb),
  COALESCE(SUM(COALESCE(ba.current_balance,0) * public.get_exchange_rate(ba.currency,'NIS')), 0)
  INTO v_accounts, v_total
  FROM public.bank_accounts ba WHERE COALESCE(ba.is_active, true);
  RETURN jsonb_build_object('accounts', v_accounts, 'grand_total_nis', ROUND(v_total, 2));
END $$;
GRANT EXECUTE ON FUNCTION public.get_bank_position() TO authenticated, service_role;

-- ============== Cash bundle API helpers ==============
CREATE OR REPLACE FUNCTION public.get_open_cash_bundles()
RETURNS TABLE(id uuid, reference_number text, opened_date timestamptz, original_amount numeric, remaining numeric, currency text, status text, source_type text, source_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cb.id, cb.reference_number, cb.opened_date, cb.original_amount,
         public.get_bundle_remaining(cb.id), cb.currency, cb.status, cb.source_type, cb.source_id
  FROM public.cash_bundles cb
  WHERE cb.status IN ('open','partially_spent')
  ORDER BY cb.opened_date DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_open_cash_bundles() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_cash_summary()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'open_bundle_count', (SELECT COUNT(*) FROM public.cash_bundles WHERE status IN ('open','partially_spent')),
    'undeposited_total_nis', COALESCE((
      SELECT SUM(public.get_bundle_remaining(id))
      FROM public.cash_bundles WHERE status IN ('open','partially_spent')
    ), 0)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_cash_summary() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.spend_from_bundle(
  p_bundle_id uuid, p_amount numeric,
  p_category text DEFAULT 'misc', p_description text DEFAULT 'Cash bundle spend', p_vendor text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_remaining numeric; v_expense_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'amount must be > 0'; END IF;
  v_remaining := public.get_bundle_remaining(p_bundle_id);
  IF v_remaining IS NULL THEN RAISE EXCEPTION 'bundle not found'; END IF;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'amount exceeds bundle remaining (%)', v_remaining; END IF;
  INSERT INTO public.expenses (description, amount, currency, category, expense_date, status, cash_bundle_id, vendor, created_by)
  VALUES (p_description, p_amount, 'NIS', p_category, now(), 'approved', p_bundle_id, p_vendor, auth.uid())
  RETURNING id INTO v_expense_id;
  RETURN v_expense_id;
END $$;
GRANT EXECUTE ON FUNCTION public.spend_from_bundle(uuid,numeric,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.deposit_cash_bundle(
  p_bundle_id uuid, p_bank_account_id uuid, p_deposited_amount numeric,
  p_variance_reason text DEFAULT NULL, p_deposit_reference text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_remaining numeric; v_batch_id uuid; v_user uuid := auth.uid();
BEGIN
  v_remaining := public.get_bundle_remaining(p_bundle_id);
  IF v_remaining IS NULL THEN RAISE EXCEPTION 'bundle not found'; END IF;
  IF p_deposited_amount <> v_remaining AND (p_variance_reason IS NULL OR length(trim(p_variance_reason)) = 0) THEN
    RAISE EXCEPTION 'variance_reason required when deposit differs from remaining %', v_remaining;
  END IF;

  INSERT INTO public.deposit_batches (
    batch_number, start_date, end_date, total_sales_amount, cash_spent,
    deposited_amount, remaining_to_deposit, status, bank_account_id,
    deposit_reference, notes, deposit_date, created_by
  ) VALUES (
    'DEP-' || to_char(now(),'YYYYMMDD-HH24MISS'),
    now(), now(), v_remaining, GREATEST(v_remaining - p_deposited_amount, 0),
    p_deposited_amount, 0, 'deposited', p_bank_account_id,
    p_deposit_reference, COALESCE(p_variance_reason, 'Bundle deposit'),
    now(), v_user
  ) RETURNING id INTO v_batch_id;

  INSERT INTO public.bank_ledger (
    bank_account_id, transaction_type, amount, currency, nis_value,
    description, date, reference_number, reference_type, reference_id, created_by
  ) VALUES (
    p_bank_account_id, 'IN', p_deposited_amount, 'NIS', p_deposited_amount,
    'Cash bundle deposit', CURRENT_DATE, p_deposit_reference, 'cash_bundle_deposit', p_bundle_id, v_user
  );

  UPDATE public.cash_bundles
    SET status='closed', deposit_batch_id=v_batch_id, closed_date=now(), updated_at=now()
    WHERE id = p_bundle_id;

  RETURN v_batch_id;
END $$;
GRANT EXECUTE ON FUNCTION public.deposit_cash_bundle(uuid,uuid,numeric,text,text) TO authenticated, service_role;

-- ============== Seed bank accounts ==============
INSERT INTO public.bank_accounts (name, account_name, bank_name, currency, opening_balance, current_balance, is_active)
SELECT v.name, v.account_name, v.bank_name, v.currency, 0, 0, true
FROM (VALUES
  ('Arab Bank ILS',          'Arab Bank ILS',          'Arab Bank',         'NIS'),
  ('Arab Bank USD',          'Arab Bank USD',          'Arab Bank',         'USD'),
  ('Arab Bank JOD',          'Arab Bank JOD',          'Arab Bank',         'JOD'),
  ('Bank of Palestine ILS',  'Bank of Palestine ILS',  'Bank of Palestine', 'NIS'),
  ('Bank of Palestine USD',  'Bank of Palestine USD',  'Bank of Palestine', 'USD'),
  ('Bank of Palestine JOD',  'Bank of Palestine JOD',  'Bank of Palestine', 'JOD'),
  ('Cash Drawer NIS',        'Cash Drawer NIS',        'Cash Drawer',       'NIS')
) AS v(name, account_name, bank_name, currency)
WHERE NOT EXISTS (SELECT 1 FROM public.bank_accounts ba WHERE ba.name = v.name);
