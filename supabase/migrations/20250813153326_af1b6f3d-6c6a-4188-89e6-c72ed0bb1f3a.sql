-- Fix Critical RLS Policy Issues - Phase 1.1 Security Patches (Fixed)

-- 1. Fix Customer Data Protection (HIGH PRIORITY)
-- Remove overly permissive customer access policy
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- 2. Fix Staff Data Security (HIGH PRIORITY)  
-- Remove overly broad staff viewing policy
DROP POLICY IF EXISTS "Staff can view staff" ON public.staff;

-- Add more restrictive staff viewing policy
CREATE POLICY "Staff can view limited staff info" 
ON public.staff 
FOR SELECT 
USING (
  is_admin() OR 
  (id = auth.uid()) OR 
  (is_sales_rep() AND role IN ('sales_rep', 'installer'))
);

-- 3. Fix Financial Data Lockdown (CRITICAL PRIORITY)
-- Remove overly permissive sales viewing policies
DROP POLICY IF EXISTS "Users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view expenses" ON public.expenses;

-- 4. Fix Installation and Warranty Data Access
DROP POLICY IF EXISTS "Users can view installations" ON public.installations;
DROP POLICY IF EXISTS "Users can view installation reports" ON public.installation_reports;

-- 5. Fix Product Data Access
DROP POLICY IF EXISTS "Users can view products" ON public.products;

-- Create more restrictive product viewing policy
CREATE POLICY "Authenticated users can view active products" 
ON public.products 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  is_active = true AND
  (is_admin() OR is_sales_rep() OR is_warehouse())
);

-- 6. Fix Stock Movement Access
DROP POLICY IF EXISTS "Users can view stock movements" ON public.stock_movements;

-- 7. Add Enhanced Data Access Functions
CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean AS $$
BEGIN
  RETURN is_admin() OR is_accountant();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. Create Enhanced Security Monitoring
CREATE OR REPLACE FUNCTION public.log_data_access_attempt(
  p_table_name text,
  p_operation text,
  p_resource_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  PERFORM log_security_event(
    CONCAT('data_access_', p_operation),
    p_table_name,
    p_resource_id,
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'user_role', get_current_user_role()
    ),
    NULL,
    NULL,
    NULL,
    true,
    CASE 
      WHEN p_table_name IN ('sales', 'payments', 'commission_payments') THEN 'high'
      WHEN p_table_name IN ('customers', 'staff') THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add Enhanced Commission and Payment Policies
CREATE POLICY "Restricted commission payment access" 
ON public.commission_payments 
FOR SELECT 
USING (
  can_access_financial_data() OR 
  (is_sales_rep() AND sales_rep_id = auth.uid())
);

CREATE POLICY "Strict payment data access" 
ON public.payments 
FOR SELECT 
USING (
  can_access_financial_data() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = payments.sale_id 
    AND s.sales_rep_id = auth.uid()
  ))
);

-- Log this security hardening action
SELECT log_security_event(
  'rls_policies_hardened',
  'database_security',
  NULL,
  jsonb_build_object(
    'phase', '1.1_critical_fixes',
    'policies_removed', 8,
    'policies_added', 4,
    'security_level', 'hardened'
  ),
  NULL,
  'system',
  NULL,
  true,
  'high'
);