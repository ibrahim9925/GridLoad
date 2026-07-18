-- Enable realtime functionality for key tables using correct Supabase methods
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.stock_alerts REPLICA IDENTITY FULL;

-- Create function to recalculate all commissions
CREATE OR REPLACE FUNCTION public.recalculate_all_commissions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  sale_record record;
BEGIN
  -- Recalculate commission for all sales with sales reps
  FOR sale_record IN 
    SELECT s.id, s.total_amount, st.commission_rate
    FROM sales s
    JOIN staff st ON st.id = s.sales_rep_id
    WHERE st.role = 'sales_rep' AND st.is_active = true
  LOOP
    UPDATE sales 
    SET commission_amount = sale_record.total_amount * (sale_record.commission_rate / 100)
    WHERE id = sale_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$;

-- Update commission calculation trigger to be more robust
DROP TRIGGER IF EXISTS update_commission_on_sale ON public.sales;

CREATE OR REPLACE FUNCTION public.update_commission_on_sale_robust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_rate NUMERIC := 0;
BEGIN
  -- Only calculate if sales_rep_id is provided
  IF NEW.sales_rep_id IS NOT NULL THEN
    -- Get the sales rep's commission rate
    SELECT COALESCE(s.commission_rate, 0) INTO commission_rate
    FROM public.staff s
    WHERE s.id = NEW.sales_rep_id 
    AND s.role = 'sales_rep' 
    AND s.is_active = true;
    
    -- Calculate and update commission amount
    NEW.commission_amount := COALESCE(NEW.total_amount, 0) * (commission_rate / 100);
  ELSE
    NEW.commission_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_commission_on_sale_robust
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_on_sale_robust();