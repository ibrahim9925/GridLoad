-- Phase 1: Enable Real-time Infrastructure
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.stock_alerts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;

-- Phase 2: Enhanced Commission Trigger
CREATE OR REPLACE FUNCTION public.update_commission_on_sale_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  commission_rate NUMERIC;
BEGIN
  -- Get the sales rep's commission rate with proper null handling
  SELECT COALESCE(s.commission_rate, 0) INTO commission_rate
  FROM public.staff s
  WHERE s.id = NEW.sales_rep_id AND s.is_active = true;
  
  -- Calculate and update commission amount
  NEW.commission_amount := COALESCE(NEW.total_amount, 0) * (COALESCE(commission_rate, 0) / 100);
  
  RETURN NEW;
END;
$function$;

-- Replace existing trigger
DROP TRIGGER IF EXISTS update_commission_on_sale ON public.sales;
CREATE TRIGGER update_commission_on_sale
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_on_sale_enhanced();

-- Phase 3: Atomic QA Remediation Function
CREATE OR REPLACE FUNCTION public.qa_remediation_atomic()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  orphaned_sales_count INTEGER := 0;
  invalid_products_count INTEGER := 0;
  active_reps RECORD;
  sales_record RECORD;
  product_record RECORD;
  rep_counter INTEGER := 0;
  result jsonb := '{}'::jsonb;
  audit_results jsonb := '{}'::jsonb;
BEGIN
  -- Start transaction log
  result := jsonb_set(result, '{started_at}', to_jsonb(now()));
  
  -- Step 1: Count and fix orphaned sales
  SELECT COUNT(*) INTO orphaned_sales_count
  FROM public.sales 
  WHERE sales_rep_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = sales.sales_rep_id AND s.is_active = true
  );
  
  result := jsonb_set(result, '{orphaned_sales_found}', to_jsonb(orphaned_sales_count));
  
  -- Get active sales reps for assignment
  FOR active_reps IN 
    SELECT id, email, commission_rate 
    FROM public.staff 
    WHERE role = 'sales_rep' AND is_active = true 
    ORDER BY email
  LOOP
    -- Assign orphaned sales in round-robin fashion
    FOR sales_record IN 
      SELECT id, total_amount
      FROM public.sales 
      WHERE sales_rep_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.staff s 
        WHERE s.id = sales.sales_rep_id AND s.is_active = true
      )
      ORDER BY created_at
    LOOP
      -- Use modulo for alternating assignment
      IF rep_counter % 2 = 0 THEN
        UPDATE public.sales 
        SET 
          sales_rep_id = active_reps.id,
          commission_amount = COALESCE(total_amount, 0) * (COALESCE(active_reps.commission_rate, 0) / 100),
          updated_at = now()
        WHERE id = sales_record.id;
      END IF;
      
      rep_counter := rep_counter + 1;
      
      -- Exit after processing if we've assigned this batch
      IF rep_counter > orphaned_sales_count THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Reset counter for next rep
    rep_counter := 0;
  END LOOP;
  
  -- Step 2: Fix invalid product pricing
  SELECT COUNT(*) INTO invalid_products_count
  FROM public.products 
  WHERE standard_selling_price <= cost_price OR standard_selling_price = 0;
  
  result := jsonb_set(result, '{invalid_products_found}', to_jsonb(invalid_products_count));
  
  -- Fix each invalid product
  FOR product_record IN 
    SELECT id, name, cost_price, standard_selling_price
    FROM public.products 
    WHERE standard_selling_price <= cost_price OR standard_selling_price = 0
  LOOP
    UPDATE public.products 
    SET 
      standard_selling_price = GREATEST(cost_price * 1.4, 1.0),
      min_selling_price = GREATEST(cost_price * 1.2, 1.0),
      max_selling_price = GREATEST(cost_price * 2.0, 1.0),
      updated_at = now()
    WHERE id = product_record.id;
  END LOOP;
  
  -- Step 3: Seed additional sales data for testing (2-3 sales per active rep)
  FOR active_reps IN 
    SELECT id, email FROM public.staff 
    WHERE role = 'sales_rep' AND is_active = true 
    LIMIT 2
  LOOP
    -- Create 2 test sales per rep
    FOR i IN 1..2 LOOP
      INSERT INTO public.sales (
        customer_id, sales_rep_id, total_amount, sale_date, 
        payment_status, fulfillment_status, invoice_number
      ) 
      SELECT 
        c.id,
        active_reps.id,
        250.00 + (i * 100), -- Varying amounts
        CURRENT_DATE - (i || ' days')::interval,
        'partial_paid',
        'pending',
        'TEST-' || active_reps.email || '-' || i
      FROM public.customers c 
      LIMIT 1;
    END LOOP;
  END LOOP;
  
  -- Step 4: Post-remediation audit
  SELECT jsonb_build_object(
    'orphaned_sales_remaining', (
      SELECT COUNT(*) FROM public.sales 
      WHERE sales_rep_id IS NULL
    ),
    'invalid_products_remaining', (
      SELECT COUNT(*) FROM public.products 
      WHERE standard_selling_price <= cost_price
    ),
    'active_sales_reps', (
      SELECT COUNT(*) FROM public.staff 
      WHERE role = 'sales_rep' AND is_active = true
    ),
    'total_sales', (
      SELECT COUNT(*) FROM public.sales
    ),
    'total_products', (
      SELECT COUNT(*) FROM public.products WHERE is_active = true
    )
  ) INTO audit_results;
  
  result := jsonb_set(result, '{audit_results}', audit_results);
  result := jsonb_set(result, '{completed_at}', to_jsonb(now()));
  result := jsonb_set(result, '{status}', to_jsonb('success'));
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  result := jsonb_set(result, '{status}', to_jsonb('error'));
  result := jsonb_set(result, '{error_message}', to_jsonb(SQLERRM));
  result := jsonb_set(result, '{completed_at}', to_jsonb(now()));
  RETURN result;
END;
$function$;

-- Phase 4: Quick validation function for test detection
CREATE OR REPLACE FUNCTION public.validate_test_infrastructure()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
BEGIN
  SELECT jsonb_build_object(
    'commission_rates_detected', (
      SELECT jsonb_agg(jsonb_build_object(
        'staff_id', id,
        'email', email,
        'commission_rate', commission_rate
      ))
      FROM public.staff 
      WHERE role = 'sales_rep' AND is_active = true AND commission_rate > 0
    ),
    'valid_products_count', (
      SELECT COUNT(*) 
      FROM public.products 
      WHERE is_active = true AND standard_selling_price > cost_price
    ),
    'sales_with_reps', (
      SELECT COUNT(*) 
      FROM public.sales s 
      JOIN public.staff st ON st.id = s.sales_rep_id 
      WHERE st.is_active = true
    ),
    'realtime_tables', (
      SELECT array_agg(tablename) 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;