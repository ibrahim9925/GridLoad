
-- =============== Overdue RPCs ===============
CREATE OR REPLACE FUNCTION public.get_overdue_invoices()
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_phone text,
  sale_id uuid,
  invoice_number text,
  invoice_date timestamptz,
  due_date date,
  original_amount_nis numeric,
  paid_amount_nis numeric,
  outstanding_nis numeric,
  days_overdue integer,
  payment_terms_days integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH sale_paid AS (
    SELECT p.sale_id, SUM(COALESCE(NULLIF(p.nis_equivalent,0), p.amount)) AS paid_nis
    FROM public.payments p
    WHERE COALESCE(p.status,'completed') = 'completed'
    GROUP BY p.sale_id
  )
  SELECT
    c.id,
    COALESCE(c.contact_person, c.company_name, '—'),
    c.phone,
    s.id,
    COALESCE(s.sale_number, s.invoice_number, LEFT(s.id::text, 8)),
    s.sale_date,
    (s.sale_date::date + (c.payment_terms_days || ' days')::interval)::date,
    ROUND(public.sale_nis_amount(s.total_amount, s.currency, s.amount_nis, s.sale_date), 2),
    ROUND(COALESCE(sp.paid_nis, 0), 2),
    ROUND(public.sale_nis_amount(s.total_amount, s.currency, s.amount_nis, s.sale_date) - COALESCE(sp.paid_nis, 0), 2),
    GREATEST(0, (CURRENT_DATE - s.sale_date::date) - c.payment_terms_days)::integer,
    c.payment_terms_days
  FROM public.sales s
  JOIN public.customers c ON c.id = s.customer_id
  LEFT JOIN sale_paid sp ON sp.sale_id = s.id
  WHERE COALESCE(s.status,'active') <> 'cancelled'
    AND c.payment_terms_days IS NOT NULL
    AND (CURRENT_DATE - s.sale_date::date) > c.payment_terms_days
    AND public.sale_nis_amount(s.total_amount, s.currency, s.amount_nis, s.sale_date) - COALESCE(sp.paid_nis, 0) > 0
  ORDER BY GREATEST(0, (CURRENT_DATE - s.sale_date::date) - c.payment_terms_days) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_overdue_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_overdue_count', COALESCE(COUNT(DISTINCT customer_id), 0),
    'total_overdue_amount_nis', ROUND(COALESCE(SUM(outstanding_nis), 0), 2),
    'oldest_overdue_days', COALESCE(MAX(days_overdue), 0)
  )
  FROM public.get_overdue_invoices();
$$;

-- =============== Dashboard KPI helper ===============
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_receivables numeric;
  v_overdue jsonb;
  v_cash numeric;
  v_sales_mtd numeric;
BEGIN
  SELECT COALESCE(SUM(
    public.sale_nis_amount(s.total_amount, s.currency, s.amount_nis, s.sale_date)
    - COALESCE(p.paid_nis, 0)
  ), 0)
  INTO v_receivables
  FROM public.sales s
  LEFT JOIN (
    SELECT sale_id, SUM(COALESCE(NULLIF(nis_equivalent,0), amount)) AS paid_nis
    FROM public.payments WHERE COALESCE(status,'completed') = 'completed'
    GROUP BY sale_id
  ) p ON p.sale_id = s.id
  WHERE COALESCE(s.status,'active') <> 'cancelled';

  v_overdue := public.get_overdue_summary();

  SELECT COALESCE(SUM(COALESCE(current_balance,0) * public.get_exchange_rate(currency,'NIS')), 0)
  INTO v_cash
  FROM public.bank_accounts WHERE COALESCE(is_active, true);

  SELECT COALESCE(SUM(public.sale_nis_amount(total_amount, currency, amount_nis, sale_date)), 0)
  INTO v_sales_mtd
  FROM public.sales
  WHERE COALESCE(status,'active') <> 'cancelled'
    AND sale_date >= date_trunc('month', CURRENT_DATE);

  RETURN jsonb_build_object(
    'total_receivables_nis', ROUND(v_receivables, 2),
    'total_overdue_nis', (v_overdue->>'total_overdue_amount_nis')::numeric,
    'overdue_count', (v_overdue->>'total_overdue_count')::int,
    'cash_position_nis', ROUND(v_cash, 2),
    'sales_this_month_nis', ROUND(v_sales_mtd, 2)
  );
END $$;

-- =============== Reminders table ===============
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_admin_all" ON public.reminders;
CREATE POLICY "reminders_admin_all" ON public.reminders
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'sales_rep'))
  WITH CHECK (public.is_admin() OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'sales_rep'));

DROP TRIGGER IF EXISTS trg_reminders_updated ON public.reminders;
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_reminders_pending
  ON public.reminders (scheduled_for) WHERE status = 'pending';

-- =============== Performance indexes ===============
CREATE INDEX IF NOT EXISTS idx_sales_customer_date
  ON public.sales (customer_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date
  ON public.sales (sale_date DESC) WHERE COALESCE(status,'active') <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_payments_sale
  ON public.payments (sale_id) WHERE COALESCE(status,'completed') = 'completed';
CREATE INDEX IF NOT EXISTS idx_payments_customer_date
  ON public.payments (customer_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_ledger_date
  ON public.bank_ledger (date DESC);
CREATE INDEX IF NOT EXISTS idx_customers_payment_terms
  ON public.customers (payment_terms_days) WHERE payment_terms_days IS NOT NULL;
