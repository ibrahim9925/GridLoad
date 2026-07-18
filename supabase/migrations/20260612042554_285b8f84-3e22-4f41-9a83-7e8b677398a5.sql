
CREATE OR REPLACE FUNCTION public.recompute_bank_account_balance(p_account_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_opening numeric; v_sum numeric;
BEGIN
  IF p_account_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(opening_balance, 0) INTO v_opening
  FROM public.bank_accounts WHERE id = p_account_id;

  SELECT COALESCE(SUM(
    CASE
      WHEN UPPER(transaction_type) IN ('IN','CREDIT','DEPOSIT')      THEN  COALESCE(amount, NULLIF(nis_value,0), 0)
      WHEN UPPER(transaction_type) IN ('OUT','DEBIT','WITHDRAWAL')   THEN -COALESCE(amount, NULLIF(nis_value,0), 0)
      ELSE 0
    END
  ), 0) INTO v_sum
  FROM public.bank_ledger
  WHERE bank_account_id = p_account_id;

  UPDATE public.bank_accounts
  SET current_balance = ROUND(v_opening + v_sum, 2), updated_at = now()
  WHERE id = p_account_id;
END $$;

-- Re-run recompute for the two test accounts so their balances reflect the fix
SELECT public.recompute_bank_account_balance(id)
FROM public.bank_accounts WHERE name IN ('Arab Bank USD','Arab Bank ILS','Cash Drawer NIS');
