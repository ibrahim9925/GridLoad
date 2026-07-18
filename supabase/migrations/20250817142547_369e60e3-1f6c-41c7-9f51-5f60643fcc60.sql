-- Phase 1: Fix RLS policies for products and sales
-- Update products RLS policies to allow sales_rep role to manage products
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff can view products" ON public.products;

CREATE POLICY "Admin and sales can manage products" ON public.products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'warehouse')
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'warehouse')
    AND is_active = true
  )
);

-- Update sale_items RLS to allow proper access
DROP POLICY IF EXISTS "Admins and sales can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Sales staff can manage sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Staff can view sale items" ON public.sale_items;

CREATE POLICY "Staff can manage sale items" ON public.sale_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'accountant', 'warehouse')
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'accountant', 'warehouse')
    AND is_active = true
  )
);

-- Fix staff RLS infinite recursion by removing problematic policies
DROP POLICY IF EXISTS "Staff can view staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can manage staff" ON public.staff;

-- Create simple staff policies without recursive queries
CREATE POLICY "Admin can manage all staff" ON public.staff
FOR ALL
USING (
  id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email IN (
      'admin@gridload.com', 
      'ibrahim@gridload.com'
    )
  )
)
WITH CHECK (
  id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email IN (
      'admin@gridload.com', 
      'ibrahim@gridload.com'
    )
  )
);

-- Allow users to view their own staff record
CREATE POLICY "Users can view own staff record" ON public.staff
FOR SELECT
USING (id = auth.uid());

-- Create enhanced function to get current user info without recursion
CREATE OR REPLACE FUNCTION public.get_user_role_safe(user_id uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = user_id AND is_active = true;
  
  RETURN COALESCE(user_role_val, 'sales_rep'::user_role);
END;
$$;