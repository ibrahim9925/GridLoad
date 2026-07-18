-- Add function to bulk delete test bank accounts
CREATE OR REPLACE FUNCTION public.bulk_delete_test_accounts(account_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer := 0;
  account_id uuid;
BEGIN
  -- Only allow deletion of accounts with 'test' or 'sample' in the name for safety
  FOR account_id IN SELECT unnest(account_ids)
  LOOP
    UPDATE public.bank_accounts 
    SET is_active = false, 
        updated_at = now()
    WHERE id = account_id 
      AND (name ILIKE '%test%' OR name ILIKE '%sample%')
      AND is_active = true;
    
    IF FOUND THEN
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;
  
  RETURN deleted_count;
END;
$function$;

-- Add RLS policy for bulk delete function
CREATE POLICY "Admins can bulk delete test accounts" ON public.bank_accounts
  FOR UPDATE USING (is_admin() AND (name ILIKE '%test%' OR name ILIKE '%sample%'));

-- Function to get real banking capital summary for supply chain
CREATE OR REPLACE FUNCTION public.get_banking_capital_summary()
RETURNS TABLE(
  total_capital_usd numeric,
  total_capital_nis numeric,
  total_capital_eur numeric,
  available_capital_usd numeric,
  available_capital_nis numeric,
  available_capital_eur numeric,
  frozen_capital numeric,
  utilization_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  usd_total numeric := 0;
  nis_total numeric := 0;
  eur_total numeric := 0;
  frozen_amount numeric := 0;
BEGIN
  -- Get totals by currency from active bank accounts
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIS' THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'EUR' THEN current_balance ELSE 0 END), 0)
  INTO usd_total, nis_total, eur_total
  FROM public.bank_accounts
  WHERE is_active = true;
  
  -- Calculate frozen capital from pending purchase orders
  SELECT COALESCE(SUM(total_amount), 0) INTO frozen_amount
  FROM public.purchase_orders
  WHERE status IN ('ordered', 'confirmed', 'shipped', 'in_transit');
  
  RETURN QUERY SELECT 
    usd_total as total_capital_usd,
    nis_total as total_capital_nis,
    eur_total as total_capital_eur,
    GREATEST(usd_total - (frozen_amount * 0.3), 0) as available_capital_usd, -- Assume 30% USD allocation
    GREATEST(nis_total - (frozen_amount * 0.7), 0) as available_capital_nis, -- Assume 70% NIS allocation  
    eur_total as available_capital_eur, -- EUR typically not used for procurement
    frozen_amount,
    CASE 
      WHEN (usd_total + nis_total + eur_total) > 0 
      THEN (frozen_amount / (usd_total + nis_total + eur_total)) * 100
      ELSE 0 
    END as utilization_rate;
END;
$function$;