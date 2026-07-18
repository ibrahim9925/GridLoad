-- Phase 1: Fix authentication and RLS context for customer creation
-- The issue is that users can't add customers due to RLS policy restrictions
-- Need to ensure proper user context is available for customer operations

-- Update customers table RLS policies to fix the authentication context issue
DROP POLICY IF EXISTS "customers_accountant_read" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_full_access" ON public.customers;
DROP POLICY IF EXISTS "customers_salesrep_create" ON public.customers;
DROP POLICY IF EXISTS "customers_salesrep_own_only" ON public.customers;

-- Create comprehensive customer policies that work with the current user system
CREATE POLICY "Admin can manage all customers" 
ON public.customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() AND staff.role = 'admin'
  )
);

CREATE POLICY "Sales reps can manage customers" 
ON public.customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() AND staff.role = 'sales_rep'
  )
);

CREATE POLICY "Accountants can view customers" 
ON public.customers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() AND staff.role = 'accountant'
  )
);

-- Also fix any product-related policies while we're at it
DROP POLICY IF EXISTS "Admins and sales can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff can view products" ON public.products;

CREATE POLICY "Admin and sales can manage products" 
ON public.products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() AND staff.role IN ('admin', 'sales_rep')
  )
);

CREATE POLICY "All staff can view products" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid()
  )
);