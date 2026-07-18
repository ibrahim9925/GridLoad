-- Create test_executions table if not exists
CREATE TABLE IF NOT EXISTS public.test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_tests INTEGER DEFAULT 0,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_results table if not exists
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.test_executions(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_category TEXT,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on test tables
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_executions
DROP POLICY IF EXISTS "Admins can manage test executions" ON public.test_executions;
DROP POLICY IF EXISTS "Users can view test executions" ON public.test_executions;
DROP POLICY IF EXISTS "Service can insert test executions" ON public.test_executions;

CREATE POLICY "Admins can manage test executions" ON public.test_executions
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view test executions" ON public.test_executions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert test executions" ON public.test_executions
  FOR INSERT WITH CHECK (true);

-- RLS Policies for test_results
DROP POLICY IF EXISTS "Admins can manage test results" ON public.test_results;
DROP POLICY IF EXISTS "Users can view test results" ON public.test_results;
DROP POLICY IF EXISTS "Service can insert test results" ON public.test_results;

CREATE POLICY "Admins can manage test results" ON public.test_results
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view test results" ON public.test_results
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert test results" ON public.test_results
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON public.test_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON public.test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON public.test_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON public.test_results(created_at DESC);

-- Create or replace qa_remediation_atomic function
CREATE OR REPLACE FUNCTION public.qa_remediation_atomic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correlation_id TEXT;
  total_changes INTEGER := 0;
  orphaned_sales_fixed INTEGER := 0;
  invalid_products_fixed INTEGER := 0;
  staff_created INTEGER := 0;
  admin_count INTEGER;
  accountant_count INTEGER;
  sales_rep_count INTEGER;
  active_sales_rep_id UUID;
  orphaned_sale RECORD;
  invalid_product RECORD;
BEGIN
  -- Generate correlation ID
  correlation_id := 'qa_' || EXTRACT(EPOCH FROM now()) || '_' || substr(md5(random()::text), 1, 8);
  
  -- PHASE 1: Ensure minimum staff infrastructure
  
  -- Check existing staff counts
  SELECT COUNT(*) INTO admin_count FROM public.staff WHERE role = 'admin' AND is_active = true;
  SELECT COUNT(*) INTO accountant_count FROM public.staff WHERE role = 'accountant' AND is_active = true;
  SELECT COUNT(*) INTO sales_rep_count FROM public.staff WHERE role = 'sales_rep' AND is_active = true AND commission_rate > 0;
  
  -- Create admin if none exists
  IF admin_count = 0 THEN
    INSERT INTO public.staff (email, full_name, role, is_active, commission_rate)
    VALUES ('admin@system.generated', 'System Admin', 'admin', true, 0)
    ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'admin';
    staff_created := staff_created + 1;
  END IF;
  
  -- Create accountant if none exists
  IF accountant_count = 0 THEN
    INSERT INTO public.staff (email, full_name, role, is_active, commission_rate)
    VALUES ('accountant@system.generated', 'System Accountant', 'accountant', true, 0)
    ON CONFLICT (email) DO UPDATE SET is_active = true, role = 'accountant';
    staff_created := staff_created + 1;
  END IF;
  
  -- Ensure at least 2 active sales reps with commission rates
  IF sales_rep_count < 2 THEN
    INSERT INTO public.staff (email, full_name, role, is_active, commission_rate)
    VALUES 
      ('salesrep1@system.generated', 'Sales Rep 1', 'sales_rep', true, 5.0),
      ('salesrep2@system.generated', 'Sales Rep 2', 'sales_rep', true, 7.5)
    ON CONFLICT (email) DO UPDATE SET 
      is_active = true, 
      role = 'sales_rep',
      commission_rate = CASE 
        WHEN EXCLUDED.email = 'salesrep1@system.generated' THEN 5.0
        ELSE 7.5
      END;
    staff_created := staff_created + (2 - sales_rep_count);
  END IF;
  
  total_changes := total_changes + staff_created;
  
  -- PHASE 2: Fix orphaned sales (sales without valid sales_rep_id)
  
  -- Get an active sales rep for assignment
  SELECT id INTO active_sales_rep_id 
  FROM public.staff 
  WHERE role = 'sales_rep' AND is_active = true AND commission_rate > 0
  LIMIT 1;
  
  -- Fix orphaned sales
  FOR orphaned_sale IN 
    SELECT s.id 
    FROM public.sales s
    LEFT JOIN public.staff st ON s.sales_rep_id = st.id AND st.is_active = true
    WHERE st.id IS NULL OR s.sales_rep_id IS NULL
  LOOP
    UPDATE public.sales 
    SET sales_rep_id = active_sales_rep_id,
        updated_at = now()
    WHERE id = orphaned_sale.id;
    
    orphaned_sales_fixed := orphaned_sales_fixed + 1;
  END LOOP;
  
  total_changes := total_changes + orphaned_sales_fixed;
  
  -- PHASE 3: Fix invalid product pricing
  
  FOR invalid_product IN
    SELECT p.id, p.cost_price
    FROM public.products p
    WHERE p.is_active = true 
    AND (p.standard_selling_price IS NULL 
         OR p.standard_selling_price <= 0 
         OR p.standard_selling_price <= COALESCE(p.cost_price, 0))
  LOOP
    -- Set reasonable selling prices based on cost
    UPDATE public.products 
    SET 
      standard_selling_price = GREATEST(COALESCE(invalid_product.cost_price, 10) * 1.3, 15),
      min_selling_price = GREATEST(COALESCE(invalid_product.cost_price, 10) * 1.1, 12),
      max_selling_price = GREATEST(COALESCE(invalid_product.cost_price, 10) * 1.5, 20),
      updated_at = now()
    WHERE id = invalid_product.id;
    
    invalid_products_fixed := invalid_products_fixed + 1;
  END LOOP;
  
  total_changes := total_changes + invalid_products_fixed;
  
  -- PHASE 4: Recalculate commissions for sales
  UPDATE public.sales s
  SET commission_amount = s.total_amount * (st.commission_rate / 100),
      updated_at = now()
  FROM public.staff st
  WHERE s.sales_rep_id = st.id 
  AND st.is_active = true 
  AND (s.commission_amount IS NULL OR s.commission_amount = 0);
  
  -- PHASE 5: Ensure realtime subscriptions
  -- Add tables to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_executions;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_results;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already exists
  END;
  
  -- Return success result
  RETURN jsonb_build_object(
    'status', 'success',
    'timestamp', now(),
    'correlation_id', correlation_id,
    'statistics', jsonb_build_object(
      'total_changes', total_changes,
      'orphaned_sales_fixed', orphaned_sales_fixed,
      'invalid_products_fixed', invalid_products_fixed,
      'staff_created', staff_created
    ),
    'phases_completed', ARRAY[
      'Staff Infrastructure Creation',
      'Sales FK Integrity Repair',
      'Product Pricing Correction',
      'Commission Recalculation',
      'Real-time Subscriptions'
    ],
    'realtime_enabled', true
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'failed',
    'timestamp', now(),
    'correlation_id', correlation_id,
    'error_message', SQLERRM,
    'error_detail', SQLSTATE,
    'statistics', jsonb_build_object(
      'total_changes', total_changes,
      'orphaned_sales_fixed', orphaned_sales_fixed,
      'invalid_products_fixed', invalid_products_fixed,
      'staff_created', staff_created
    )
  );
END;
$$;

-- Create or replace validate_test_infrastructure function
CREATE OR REPLACE FUNCTION public.validate_test_infrastructure()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_count INTEGER;
  product_count INTEGER;
  sales_count INTEGER;
  staff_count INTEGER;
  valid_products_count INTEGER;
  sales_with_reps INTEGER;
  commission_rates TEXT[];
  validation_score INTEGER := 0;
  max_score INTEGER := 100;
  recommendations TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get basic counts
  SELECT COUNT(*) INTO customer_count FROM public.customers;
  SELECT COUNT(*) INTO product_count FROM public.products WHERE is_active = true;
  SELECT COUNT(*) INTO sales_count FROM public.sales;
  SELECT COUNT(*) INTO staff_count FROM public.staff WHERE is_active = true;
  
  -- Get data quality metrics
  SELECT COUNT(*) INTO valid_products_count 
  FROM public.products 
  WHERE is_active = true 
  AND standard_selling_price > 0 
  AND standard_selling_price > COALESCE(cost_price, 0);
  
  SELECT COUNT(*) INTO sales_with_reps
  FROM public.sales s
  JOIN public.staff st ON s.sales_rep_id = st.id
  WHERE st.is_active = true;
  
  -- Get commission rates
  SELECT ARRAY_AGG(DISTINCT commission_rate::TEXT || '%') 
  INTO commission_rates
  FROM public.staff 
  WHERE role = 'sales_rep' AND is_active = true AND commission_rate > 0;
  
  -- Calculate validation score
  IF customer_count > 0 THEN validation_score := validation_score + 20; END IF;
  IF product_count > 0 THEN validation_score := validation_score + 20; END IF;
  IF sales_count > 0 THEN validation_score := validation_score + 20; END IF;
  IF staff_count >= 3 THEN validation_score := validation_score + 20; END IF; -- admin, accountant, sales_rep
  
  -- Data quality scoring
  IF product_count > 0 AND valid_products_count = product_count THEN 
    validation_score := validation_score + 10; 
  END IF;
  
  IF sales_count > 0 AND sales_with_reps = sales_count THEN 
    validation_score := validation_score + 10; 
  END IF;
  
  -- Generate recommendations
  IF customer_count = 0 THEN 
    recommendations := array_append(recommendations, 'Add customer data for testing');
  END IF;
  
  IF product_count = 0 THEN 
    recommendations := array_append(recommendations, 'Add product data for testing');
  END IF;
  
  IF valid_products_count < product_count THEN 
    recommendations := array_append(recommendations, 'Fix product pricing integrity');
  END IF;
  
  IF sales_with_reps < sales_count THEN 
    recommendations := array_append(recommendations, 'Assign sales representatives to all sales');
  END IF;
  
  IF array_length(commission_rates, 1) IS NULL THEN 
    recommendations := array_append(recommendations, 'Set commission rates for sales representatives');
  END IF;
  
  IF array_length(recommendations, 1) IS NULL THEN 
    recommendations := array_append(recommendations, 'Infrastructure validation passed');
  END IF;
  
  RETURN jsonb_build_object(
    'status', CASE WHEN validation_score >= 80 THEN 'healthy' ELSE 'needs_attention' END,
    'validation_score', validation_score,
    'max_score', max_score,
    'timestamp', now(),
    'counts', jsonb_build_object(
      'customers', customer_count,
      'products', product_count,
      'sales', sales_count,
      'staff', staff_count
    ),
    'infrastructure_checks', jsonb_build_object(
      'customers_available', customer_count > 0,
      'products_available', product_count > 0,
      'sales_data_present', sales_count > 0,
      'staff_available', staff_count >= 3
    ),
    'data_quality', jsonb_build_object(
      'valid_products_count', valid_products_count,
      'sales_with_reps', sales_with_reps,
      'commission_rates_detected', commission_rates
    ),
    'recommendations', recommendations
  );
END;
$$;