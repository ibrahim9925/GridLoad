-- Fix Critical RLS Policy Issues - Phase 1.1 Security Patches

-- 1. Fix Customer Data Protection (HIGH PRIORITY)
-- Remove overly permissive customer access policy
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

-- Keep only restricted customer access policies
-- "Staff can view customers" and "Admins and sales can manage customers" are already secure

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

-- Remove overly permissive viewing policies from other financial tables
DROP POLICY IF EXISTS "Users can view sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view expenses" ON public.expenses;

-- Keep only the secure, role-based policies for financial data
-- The existing policies like "Staff can view relevant sales", "Financial staff can manage payments" etc. are already secure

-- 4. Fix Installation and Warranty Data Access
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Users can view installations" ON public.installations;
DROP POLICY IF EXISTS "Users can view installation reports" ON public.installation_reports;

-- Keep only role-based access for installations and warranties
-- The existing "Staff can view installations" and role-specific policies are secure

-- 5. Fix Product Data Access (if needed)
-- Remove overly permissive product viewing
DROP POLICY IF EXISTS "Users can view products" ON public.products;

-- Create more restrictive product viewing policy for authenticated users
CREATE POLICY "Authenticated users can view active products" 
ON public.products 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  is_active = true AND
  (is_admin() OR is_sales_rep() OR is_warehouse())
);

-- 6. Fix Stock Movement Access
-- Remove overly permissive stock movement viewing
DROP POLICY IF EXISTS "Users can view stock movements" ON public.stock_movements;

-- Keep only role-based stock movement access
-- The existing "Staff can view stock movements" policy is already secure

-- 7. Add Enhanced Audit Logging for Critical Data Access
-- Create function to log data access attempts
CREATE OR REPLACE FUNCTION public.log_data_access_attempt(
  p_table_name text,
  p_operation text,
  p_resource_id uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Log the data access attempt
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

-- 8. Create Enhanced Security Monitoring Triggers
-- Trigger for sensitive table access logging
CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
RETURNS trigger AS $$
BEGIN
  -- Log access to sensitive financial data
  IF TG_TABLE_NAME IN ('sales', 'payments', 'commission_payments', 'expenses') THEN
    PERFORM log_data_access_attempt(TG_TABLE_NAME, TG_OP, 
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END
    );
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply logging triggers to critical tables
DROP TRIGGER IF EXISTS log_sales_access ON public.sales;
CREATE TRIGGER log_sales_access
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_table_access();

DROP TRIGGER IF EXISTS log_payments_access ON public.payments;
CREATE TRIGGER log_payments_access
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_table_access();

DROP TRIGGER IF EXISTS log_commission_access ON public.commission_payments;
CREATE TRIGGER log_commission_access
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION log_commission_access();

-- 9. Add Data Classification and Access Control
-- Create function to check data access permissions
CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean AS $$
BEGIN
  RETURN is_admin() OR is_accountant();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 10. Update Commission and Payment Policies for Extra Security
-- Ensure commission data is only accessible to authorized roles
CREATE POLICY "Restricted commission payment access" 
ON public.commission_payments 
FOR SELECT 
USING (
  can_access_financial_data() OR 
  (is_sales_rep() AND sales_rep_id = auth.uid())
);

-- Ensure payment data is strictly controlled
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
    'policies_updated', 10,
    'triggers_added', 3
  ),
  NULL,
  'system',
  NULL,
  true,
  'high'
);