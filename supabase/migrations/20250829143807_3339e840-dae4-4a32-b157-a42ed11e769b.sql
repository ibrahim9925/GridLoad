-- STEP 1: Policy Cleanup and Consolidation
-- Remove all duplicate and conflicting RLS policies and implement strict role-based access

-- ========== CUSTOMERS TABLE CLEANUP ==========
-- Drop all existing policies
DROP POLICY IF EXISTS "customers_admin_access" ON public.customers;
DROP POLICY IF EXISTS "customers_own_access" ON public.customers;
DROP POLICY IF EXISTS "customers_salesrep_assigned" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "customers_restricted_access" ON public.customers;

-- Create single, consolidated policy for customers
CREATE POLICY "customers_role_based_access" ON public.customers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role IN ('admin', 'accountant')
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = 'sales_rep'
    AND EXISTS (
      SELECT 1 FROM public.sales 
      WHERE sales.customer_id = customers.id 
      AND sales.sales_rep_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role IN ('admin', 'sales_rep')
  )
);

-- ========== LEADS TABLE CLEANUP ==========
-- Drop all existing policies
DROP POLICY IF EXISTS "leads_admin_access" ON public.leads;
DROP POLICY IF EXISTS "leads_assigned_sales_access" ON public.leads;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;

-- Create single, consolidated policy for leads
CREATE POLICY "leads_role_based_access" ON public.leads
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = 'admin'
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = 'sales_rep'
    AND (leads.assigned_to = auth.uid() OR leads.assigned_to IS NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role IN ('admin', 'sales_rep')
  )
);

-- ========== STAFF TABLE CLEANUP ==========
-- Drop all existing policies
DROP POLICY IF EXISTS "staff_admin_access" ON public.staff;
DROP POLICY IF EXISTS "staff_own_access" ON public.staff;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.staff;

-- Create consolidated policies for staff
CREATE POLICY "staff_admin_full_access" ON public.staff
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = auth.uid() 
    AND s.is_active = true 
    AND s.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = auth.uid() 
    AND s.is_active = true 
    AND s.role = 'admin'
  )
);

CREATE POLICY "staff_own_view_only" ON public.staff
FOR SELECT TO authenticated
USING (id = auth.uid() AND is_active = true);

-- ========== SUPPLIERS TABLE CLEANUP ==========
-- Drop all existing policies
DROP POLICY IF EXISTS "suppliers_restricted_access" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.suppliers;

-- Create single, consolidated policy for suppliers
CREATE POLICY "suppliers_role_based_access" ON public.suppliers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role IN ('admin', 'warehouse')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role IN ('admin', 'warehouse')
  )
);

-- ========== PROFILES TABLE CLEANUP ==========
-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_admin_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Create consolidated policies for profiles
CREATE POLICY "profiles_admin_full_access" ON public.profiles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = 'admin'
  )
);

CREATE POLICY "profiles_own_access" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_own_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========== ADDITIONAL SECURITY HARDENING ==========
-- Ensure no public access to any sensitive tables
REVOKE ALL ON public.customers FROM public;
REVOKE ALL ON public.leads FROM public;
REVOKE ALL ON public.staff FROM public;
REVOKE ALL ON public.suppliers FROM public;
REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.sales FROM public;
REVOKE ALL ON public.payments FROM public;

-- Grant appropriate access only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;