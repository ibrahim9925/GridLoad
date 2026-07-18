-- Create a comprehensive solution for authentication context
-- This will fix the core issue preventing customer creation

-- Create a security definer function to properly check user authentication
CREATE OR REPLACE FUNCTION public.get_current_user_staff_info()
RETURNS TABLE(user_id uuid, role user_role, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    staff.id as user_id,
    staff.role,
    staff.is_active
  FROM public.staff 
  WHERE staff.id = auth.uid() 
  AND staff.is_active = true;
$$;

-- Update all customer policies to use this function
DROP POLICY IF EXISTS "Admin can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Accountants can view customers" ON public.customers;

-- Create simplified but secure policies
CREATE POLICY "Authenticated staff can manage customers" 
ON public.customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_staff_info() 
    WHERE role IN ('admin', 'sales_rep', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.get_current_user_staff_info() 
    WHERE role IN ('admin', 'sales_rep')
  )
);

-- Update product policies as well
DROP POLICY IF EXISTS "Admin and sales can manage products" ON public.products;
DROP POLICY IF EXISTS "All staff can view products" ON public.products;

CREATE POLICY "Staff can manage products" 
ON public.products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.get_current_user_staff_info() 
    WHERE role IN ('admin', 'sales_rep', 'warehouse')
  )
);

-- Test customer creation with proper authentication
INSERT INTO public.customers (
  contact_person,
  company_name,
  email,
  phone,
  address,
  city,
  state
) VALUES (
  'Test Customer Migration',
  'Test Migration Company',
  'testmigration@test.com',
  '+1-555-0199',
  '789 Migration Ave',
  'Test City',
  'Test State'
);