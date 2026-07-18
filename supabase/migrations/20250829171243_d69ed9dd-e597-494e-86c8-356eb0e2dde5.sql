-- Fix security function permissions to resolve CRUD operation failures
-- Grant execute permissions on security functions to authenticated users

-- Grant execute permissions to all authenticated users for security functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Update the get_current_user_role function to be more reliable
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  -- First check staff table
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = auth.uid() AND is_active = true;
  
  -- If not found in staff, check profiles table
  IF user_role_val IS NULL THEN
    SELECT role::user_role INTO user_role_val 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true;
  END IF;
  
  -- Default to sales_rep if nothing found
  RETURN COALESCE(user_role_val, 'sales_rep'::user_role);
END;
$$;

-- Update is_admin function to be more reliable
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check both staff and profiles tables
  RETURN EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role 
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role 
    AND is_active = true
  );
END;
$$;

-- Simplify customer RLS policies to fix CRUD operations
DROP POLICY IF EXISTS "customers_role_based_access" ON public.customers;
DROP POLICY IF EXISTS "Admins and sales can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;

CREATE POLICY "customers_full_access" 
ON public.customers 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = 'admin'::user_role OR
  get_current_user_role() = 'sales_rep'::user_role
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = 'admin'::user_role OR
  get_current_user_role() = 'sales_rep'::user_role
);

-- Simplify products RLS policies
DROP POLICY IF EXISTS "products_role_based_access" ON public.products;
DROP POLICY IF EXISTS "Staff can view products" ON public.products;
DROP POLICY IF EXISTS "Admins and warehouse can manage products" ON public.products;

CREATE POLICY "products_full_access" 
ON public.products 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'warehouse'::user_role, 'sales_rep'::user_role])
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'warehouse'::user_role])
);

-- Grant execute permission to the updated functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;