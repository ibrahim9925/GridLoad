-- COMPREHENSIVE Policy Cleanup and Consolidation
-- Drop ALL existing policies first, then create clean consolidated ones

-- ========== DROP ALL EXISTING POLICIES ==========

-- Drop ALL policies on customers table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT pol.policyname
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' AND pol.tablename = 'customers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.customers', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on leads table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT pol.policyname
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' AND pol.tablename = 'leads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on staff table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT pol.policyname
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' AND pol.tablename = 'staff'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on suppliers table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT pol.policyname
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' AND pol.tablename = 'suppliers'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.suppliers', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on profiles table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT pol.policyname
        FROM pg_policies pol
        WHERE pol.schemaname = 'public' AND pol.tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_name);
    END LOOP;
END $$;

-- ========== CREATE CLEAN CONSOLIDATED POLICIES ==========

-- CUSTOMERS TABLE - Single consolidated policy
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

-- LEADS TABLE - Single consolidated policy
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

-- STAFF TABLE - Use security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
  user_email text;
BEGIN
  -- Get the current user's email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- Check if user is admin by email first (for bootstrap)
  IF user_email IN ('admin@gridload.com', 'ibrahim@gridload.com', 'ibrahimimseeh@outlook.com') THEN
    RETURN 'admin'::user_role;
  END IF;
  
  -- Then check staff table
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = auth.uid() AND is_active = true;
  
  RETURN COALESCE(user_role_val, 'sales_rep'::user_role);
END;
$$;

-- STAFF TABLE - Admin full access policy
CREATE POLICY "staff_admin_full_access" ON public.staff
FOR ALL TO authenticated
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);

-- STAFF TABLE - Own view policy
CREATE POLICY "staff_own_view_only" ON public.staff
FOR SELECT TO authenticated
USING (id = auth.uid() AND is_active = true);

-- SUPPLIERS TABLE - Single consolidated policy
CREATE POLICY "suppliers_role_based_access" ON public.suppliers
FOR ALL TO authenticated
USING (public.get_current_user_role() IN ('admin', 'warehouse'))
WITH CHECK (public.get_current_user_role() IN ('admin', 'warehouse'));

-- PROFILES TABLE - Admin full access
CREATE POLICY "profiles_admin_full_access" ON public.profiles
FOR ALL TO authenticated
USING (public.get_current_user_role() = 'admin'::user_role)
WITH CHECK (public.get_current_user_role() = 'admin'::user_role);

-- PROFILES TABLE - Own access
CREATE POLICY "profiles_own_access" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- PROFILES TABLE - Own update
CREATE POLICY "profiles_own_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========== REVOKE PUBLIC ACCESS ==========
REVOKE ALL ON public.customers FROM public;
REVOKE ALL ON public.leads FROM public;
REVOKE ALL ON public.staff FROM public;
REVOKE ALL ON public.suppliers FROM public;
REVOKE ALL ON public.profiles FROM public;
REVOKE ALL ON public.sales FROM public;
REVOKE ALL ON public.payments FROM public;

-- Grant only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;