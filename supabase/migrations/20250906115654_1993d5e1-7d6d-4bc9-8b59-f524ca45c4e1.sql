-- Critical Security Fix: Phase 1 - Data Protection
-- Fix overly permissive RLS policies to prevent data exposure

-- 1. Fix Customer Data Access
DROP POLICY IF EXISTS "customers_full_access" ON public.customers;

CREATE POLICY "customers_admin_full_access" 
ON public.customers 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "customers_sales_assigned_only" 
ON public.customers 
FOR SELECT 
USING (
  is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.customer_id = customers.id 
    AND sales.sales_rep_id = auth.uid()
  )
);

-- 2. Fix Lead Management Security
DROP POLICY IF EXISTS "leads_full_access" ON public.leads;

CREATE POLICY "leads_admin_full_access" 
ON public.leads 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "leads_assigned_sales_rep" 
ON public.leads 
FOR ALL 
USING (is_sales_rep() AND assigned_to = auth.uid())
WITH CHECK (is_sales_rep() AND assigned_to = auth.uid());

CREATE POLICY "leads_sales_create" 
ON public.leads 
FOR INSERT 
WITH CHECK (is_sales_rep());

-- 3. Secure Staff/Employee Data
DROP POLICY IF EXISTS "staff_admin_full_access" ON public.staff;
DROP POLICY IF EXISTS "staff_own_view_only" ON public.staff;

CREATE POLICY "staff_admin_manage_all" 
ON public.staff 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "staff_view_own_profile" 
ON public.staff 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "staff_update_own_basic_info" 
ON public.staff 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND 
  -- Prevent modification of sensitive fields
  OLD.role = NEW.role AND 
  OLD.commission_rate = NEW.commission_rate AND
  OLD.is_active = NEW.is_active
);

-- 4. Secure Quotations - Only creator and admin access
DROP POLICY IF EXISTS "quotation_items_staff_access" ON public.quotation_items;
DROP POLICY IF EXISTS "quotations_staff_access" ON public.quotations;

CREATE POLICY "quotations_admin_access" 
ON public.quotations 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "quotations_creator_access" 
ON public.quotations 
FOR ALL 
USING (is_sales_rep() AND created_by = auth.uid())
WITH CHECK (is_sales_rep() AND created_by = auth.uid());

CREATE POLICY "quotation_items_admin_access" 
ON public.quotation_items 
FOR ALL 
USING (is_admin());

CREATE POLICY "quotation_items_creator_access" 
ON public.quotation_items 
FOR ALL 
USING (
  is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.quotations 
    WHERE quotations.id = quotation_items.quotation_id 
    AND quotations.created_by = auth.uid()
  )
);

-- 5. Secure Profile Data
DROP POLICY IF EXISTS "profiles_admin_full_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;

CREATE POLICY "profiles_admin_manage_all" 
ON public.profiles 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "profiles_view_own" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "profiles_update_own_basic" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND 
  -- Prevent modification of sensitive fields
  OLD.role = NEW.role AND 
  OLD.is_active = NEW.is_active
);

-- 6. Enhanced Payment Security
DROP POLICY IF EXISTS "payments_full_access" ON public.payments;

CREATE POLICY "payments_admin_accountant_access" 
ON public.payments 
FOR ALL 
USING (is_admin() OR is_accountant())
WITH CHECK (is_admin() OR is_accountant());

CREATE POLICY "payments_sales_view_own" 
ON public.payments 
FOR SELECT 
USING (
  is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = payments.sale_id 
    AND sales.sales_rep_id = auth.uid()
  )
);

-- Log this critical security fix
INSERT INTO public.security_audit_logs (
  user_id, action_type, resource_type, details, success, risk_level
) VALUES (
  auth.uid(), 'security_fix_phase1', 'rls_policies', 
  jsonb_build_object(
    'action', 'critical_rls_policy_fixes',
    'tables_secured', ARRAY['customers', 'leads', 'staff', 'quotations', 'profiles', 'payments'],
    'security_level', 'enhanced'
  ), 
  true, 'high'
);