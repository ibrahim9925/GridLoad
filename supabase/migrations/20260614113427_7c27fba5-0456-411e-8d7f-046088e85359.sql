
-- ============== CONTRA ACCOUNTS ==============
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS contra_group_id uuid;
ALTER TABLE public.po_payments_out ADD COLUMN IF NOT EXISTS contra_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_payments_contra_group ON public.payments(contra_group_id);
CREATE INDEX IF NOT EXISTS idx_po_payments_out_contra_group ON public.po_payments_out(contra_group_id);

-- Find a supplier matching this customer by exact phone or email
CREATE OR REPLACE FUNCTION public.find_supplier_for_customer(p_customer_id uuid)
RETURNS TABLE(supplier_id uuid, supplier_name text, match_field text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH c AS (SELECT id, NULLIF(TRIM(phone),'') AS phone, NULLIF(LOWER(TRIM(email)),'') AS email FROM public.customers WHERE id = p_customer_id)
  SELECT s.id, s.name,
         CASE WHEN s.email IS NOT NULL AND LOWER(TRIM(s.email)) = (SELECT email FROM c) THEN 'email'
              WHEN s.phone IS NOT NULL AND TRIM(s.phone) = (SELECT phone FROM c) THEN 'phone' END
  FROM public.suppliers s, c
  WHERE COALESCE(s.is_active,true)
    AND ( (c.email IS NOT NULL AND LOWER(TRIM(s.email)) = c.email)
       OR (c.phone IS NOT NULL AND TRIM(s.phone) = c.phone) )
  LIMIT 1;
$$;

-- Net balance: customer outstanding (positive = they owe us) minus supplier outstanding (positive = we owe them)
CREATE OR REPLACE FUNCTION public.get_contra_balance(p_customer_id uuid, p_supplier_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cust numeric; v_sup numeric; v_offset numeric;
BEGIN
  v_cust := COALESCE((public.get_customer_balance(p_customer_id) ->> 'outstanding_nis')::numeric, 0);
  v_sup  := COALESCE((public.get_supplier_balance(p_supplier_id) ->> 'outstanding_nis')::numeric, 0);
  v_offset := LEAST(GREATEST(v_cust,0), GREATEST(v_sup,0));
  RETURN jsonb_build_object(
    'customer_outstanding_nis', ROUND(v_cust,2),
    'supplier_outstanding_nis', ROUND(v_sup,2),
    'net_balance_nis', ROUND(v_cust - v_sup, 2),
    'max_contra_offset_nis', ROUND(v_offset, 2)
  );
END $$;

-- Create a paired contra journal entry
CREATE OR REPLACE FUNCTION public.create_contra_entry(
  p_customer_id uuid, p_supplier_id uuid, p_amount_nis numeric, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_group uuid := gen_random_uuid(); v_po uuid; v_user uuid := auth.uid();
BEGIN
  IF NOT public.has_any_role(ARRAY['admin','accountant']::app_role[]) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  IF p_amount_nis IS NULL OR p_amount_nis <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  -- Pick the oldest open PO for this supplier (any will do for the AP credit)
  SELECT id INTO v_po FROM public.purchase_orders
    WHERE supplier_id = p_supplier_id AND COALESCE(status,'') <> 'cancelled'
    ORDER BY order_date ASC LIMIT 1;
  IF v_po IS NULL THEN RAISE EXCEPTION 'no purchase order found for supplier'; END IF;

  -- Credit customer AR (incoming payment, contra)
  INSERT INTO public.payments (
    customer_id, amount, original_amount, original_currency, exchange_rate_to_nis,
    nis_equivalent, payment_method, payment_date, reference_number, notes,
    status, created_by, contra_group_id
  ) VALUES (
    p_customer_id, p_amount_nis, p_amount_nis, 'NIS', 1, p_amount_nis,
    'contra', CURRENT_DATE, 'CONTRA-' || LEFT(v_group::text,8),
    COALESCE(p_notes,'Contra offset against supplier balance'),
    'completed', v_user, v_group
  );

  -- Debit supplier AP (outgoing payment, contra)
  INSERT INTO public.po_payments_out (
    purchase_order_id, amount, original_currency, exchange_rate_to_nis, nis_equivalent,
    payment_date, payment_method, notes, created_by, contra_group_id, needs_reconciliation
  ) VALUES (
    v_po, p_amount_nis, 'NIS', 1, p_amount_nis,
    CURRENT_DATE, 'contra',
    COALESCE(p_notes,'Contra offset against customer balance'),
    v_user, v_group, false
  );

  RETURN jsonb_build_object('contra_group_id', v_group, 'amount_nis', p_amount_nis);
END $$;

-- ============== WARRANTY FAULT LOG: REPLACEMENT + LOAN ==============
ALTER TABLE public.warranty_fault_log
  ADD COLUMN IF NOT EXISTS resolution_type text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS replacement_serial_id uuid REFERENCES public.product_serial_numbers(id),
  ADD COLUMN IF NOT EXISTS new_warranty_id uuid REFERENCES public.warranties(id),
  ADD COLUMN IF NOT EXISTS loan_serial_id uuid REFERENCES public.product_serial_numbers(id),
  ADD COLUMN IF NOT EXISTS loan_given_date date,
  ADD COLUMN IF NOT EXISTS loan_expected_return_date date,
  ADD COLUMN IF NOT EXISTS loan_returned_date date,
  ADD COLUMN IF NOT EXISTS loan_status text;

CREATE OR REPLACE FUNCTION public.warranty_log_replacement(
  p_fault_id uuid, p_new_serial_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_fault record; v_warranty record; v_old_sn_id uuid; v_new_warranty_id uuid; v_months int;
BEGIN
  SELECT * INTO v_fault FROM public.warranty_fault_log WHERE id = p_fault_id;
  IF v_fault.id IS NULL THEN RAISE EXCEPTION 'fault log not found'; END IF;

  SELECT * INTO v_warranty FROM public.warranties WHERE id = v_fault.warranty_id;
  IF v_warranty.id IS NULL THEN RAISE EXCEPTION 'warranty not found'; END IF;

  -- Mark old SN as faulty
  UPDATE public.product_serial_numbers
    SET status = 'faulty', notes = COALESCE(notes,'') || E'\nMarked faulty via warranty ' || v_warranty.id::text
    WHERE serial_number = v_warranty.serial_number
    RETURNING id INTO v_old_sn_id;

  -- Mark new SN as sold to same sale
  UPDATE public.product_serial_numbers
    SET status = 'sold', sale_id = v_warranty.sale_id, sold_date = now(),
        notes = COALESCE(notes,'') || E'\nReplacement for warranty ' || v_warranty.id::text
    WHERE id = p_new_serial_id;

  -- Clone warranty for new SN
  v_months := COALESCE(v_warranty.warranty_period_months, 12);
  INSERT INTO public.warranties (
    product_id, sale_id, customer_id, serial_number,
    start_date, end_date, status, warranty_type, coverage_details,
    purchase_date, warranty_start_date, warranty_end_date, warranty_period_months, notes
  )
  SELECT v_warranty.product_id, v_warranty.sale_id, v_warranty.customer_id,
         psn.serial_number, now(), now() + (v_months || ' months')::interval,
         'active', v_warranty.warranty_type, v_warranty.coverage_details,
         now(), CURRENT_DATE, (CURRENT_DATE + (v_months || ' months')::interval)::date,
         v_months, 'Replacement for warranty ' || v_warranty.id::text
  FROM public.product_serial_numbers psn WHERE psn.id = p_new_serial_id
  RETURNING id INTO v_new_warranty_id;

  -- Update fault log
  UPDATE public.warranty_fault_log
    SET resolution_type = 'replacement',
        replacement_serial_id = p_new_serial_id,
        new_warranty_id = v_new_warranty_id,
        resolved_at = now()
    WHERE id = p_fault_id;

  RETURN jsonb_build_object('fault_id', p_fault_id, 'new_warranty_id', v_new_warranty_id,
                            'old_serial_id', v_old_sn_id, 'new_serial_id', p_new_serial_id);
END $$;

CREATE OR REPLACE FUNCTION public.warranty_log_loan(
  p_fault_id uuid, p_loan_serial_id uuid, p_expected_return_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF p_loan_serial_id IS NULL OR p_expected_return_date IS NULL THEN
    RAISE EXCEPTION 'loan serial and expected return date are required';
  END IF;

  UPDATE public.product_serial_numbers
    SET status = 'on_loan',
        notes = COALESCE(notes,'') || E'\nLoaned via fault ' || p_fault_id::text
    WHERE id = p_loan_serial_id;

  UPDATE public.warranty_fault_log
    SET resolution_type = 'loan',
        loan_serial_id = p_loan_serial_id,
        loan_given_date = CURRENT_DATE,
        loan_expected_return_date = p_expected_return_date,
        loan_status = 'out',
        resolved_at = now()
    WHERE id = p_fault_id;

  RETURN jsonb_build_object('fault_id', p_fault_id, 'loan_serial_id', p_loan_serial_id);
END $$;

CREATE OR REPLACE FUNCTION public.warranty_confirm_loan_return(p_fault_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_sn uuid;
BEGIN
  SELECT loan_serial_id INTO v_sn FROM public.warranty_fault_log WHERE id = p_fault_id;
  IF v_sn IS NULL THEN RAISE EXCEPTION 'no loan recorded'; END IF;

  UPDATE public.product_serial_numbers
    SET status = 'available',
        notes = COALESCE(notes,'') || E'\nLoan returned via fault ' || p_fault_id::text
    WHERE id = v_sn;

  UPDATE public.warranty_fault_log
    SET loan_returned_date = CURRENT_DATE,
        loan_status = 'returned'
    WHERE id = p_fault_id;

  RETURN jsonb_build_object('fault_id', p_fault_id, 'returned', true);
END $$;

-- ============== BULK PAYMENT AUTO-ALLOCATION ==============
CREATE OR REPLACE FUNCTION public.preview_bulk_allocation(
  p_customer_id uuid, p_amount_nis numeric
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_remaining numeric := p_amount_nis;
  v_allocs jsonb := '[]'::jsonb;
  v_sale record;
  v_due numeric;
  v_take numeric;
BEGIN
  FOR v_sale IN
    SELECT s.id, COALESCE(s.sale_number, s.invoice_number, LEFT(s.id::text,8)) AS ref,
           s.sale_date,
           public.sale_nis_amount(s.total_amount, s.currency, s.amount_nis, s.sale_date) AS total_nis,
           COALESCE((
             SELECT SUM(COALESCE(NULLIF(p.nis_equivalent,0), p.amount))
             FROM public.payments p
             WHERE p.sale_id = s.id AND COALESCE(p.status,'completed') = 'completed'
           ), 0) AS paid_nis
    FROM public.sales s
    WHERE s.customer_id = p_customer_id
      AND COALESCE(s.status,'active') <> 'cancelled'
    ORDER BY s.sale_date ASC
  LOOP
    v_due := ROUND(v_sale.total_nis - v_sale.paid_nis, 2);
    IF v_due <= 0.01 THEN CONTINUE; END IF;
    IF v_remaining <= 0.01 THEN EXIT; END IF;
    v_take := LEAST(v_remaining, v_due);
    v_allocs := v_allocs || jsonb_build_object(
      'sale_id', v_sale.id, 'sale_ref', v_sale.ref, 'sale_date', v_sale.sale_date,
      'outstanding_nis', v_due, 'allocated_nis', ROUND(v_take, 2)
    );
    v_remaining := v_remaining - v_take;
  END LOOP;
  RETURN jsonb_build_object(
    'total_amount_nis', p_amount_nis,
    'allocations', v_allocs,
    'unallocated_credit_nis', ROUND(GREATEST(v_remaining,0), 2)
  );
END $$;

CREATE OR REPLACE FUNCTION public.record_bulk_customer_payment(
  p_customer_id uuid,
  p_amount_nis numeric,
  p_payment_method text,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_bank_account_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_preview jsonb;
  v_alloc jsonb;
  v_pid uuid;
  v_ids jsonb := '[]'::jsonb;
  v_unalloc numeric;
  v_user uuid := auth.uid();
  v_group text := 'BULK-' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  IF p_amount_nis IS NULL OR p_amount_nis <= 0 THEN
    RAISE EXCEPTION 'amount must be > 0';
  END IF;

  v_preview := public.preview_bulk_allocation(p_customer_id, p_amount_nis);

  FOR v_alloc IN SELECT * FROM jsonb_array_elements(v_preview->'allocations') LOOP
    INSERT INTO public.payments (
      sale_id, customer_id, amount, original_amount, original_currency,
      exchange_rate_to_nis, nis_equivalent, payment_method, payment_date,
      reference_number, notes, status, created_by, bank_account_id
    ) VALUES (
      (v_alloc->>'sale_id')::uuid, p_customer_id,
      (v_alloc->>'allocated_nis')::numeric,
      (v_alloc->>'allocated_nis')::numeric, 'NIS', 1,
      (v_alloc->>'allocated_nis')::numeric,
      p_payment_method, p_payment_date,
      COALESCE(p_reference, v_group),
      COALESCE(p_notes,'') || ' [auto-allocated ' || v_group || ']',
      'completed', v_user, p_bank_account_id
    ) RETURNING id INTO v_pid;
    v_ids := v_ids || to_jsonb(v_pid);
  END LOOP;

  v_unalloc := (v_preview->>'unallocated_credit_nis')::numeric;
  IF v_unalloc > 0.01 THEN
    INSERT INTO public.payments (
      customer_id, amount, original_amount, original_currency,
      exchange_rate_to_nis, nis_equivalent, payment_method, payment_date,
      reference_number, notes, status, created_by, bank_account_id
    ) VALUES (
      p_customer_id, v_unalloc, v_unalloc, 'NIS', 1, v_unalloc,
      p_payment_method, p_payment_date,
      COALESCE(p_reference, v_group),
      COALESCE(p_notes,'') || ' [unallocated credit ' || v_group || ']',
      'completed', v_user, p_bank_account_id
    ) RETURNING id INTO v_pid;
    v_ids := v_ids || to_jsonb(v_pid);
  END IF;

  RETURN jsonb_build_object(
    'group_ref', v_group,
    'payment_ids', v_ids,
    'allocations', v_preview->'allocations',
    'unallocated_credit_nis', v_unalloc
  );
END $$;
