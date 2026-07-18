-- Phase 1: Fix warranty foreign key issue and clean up RLS policies

-- Fix warranty foreign key relationships issue
-- Drop duplicate foreign key constraint if it exists
ALTER TABLE public.warranties DROP CONSTRAINT IF EXISTS warranties_product_id_fkey;

-- Ensure we have the named constraint for proper relationship embedding
ALTER TABLE public.warranties 
ADD CONSTRAINT fk_warranties_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Clean up duplicate/conflicting RLS policies on products table
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff can view products" ON public.products;

-- Create single comprehensive products policy
CREATE POLICY "Products access policy" ON public.products
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'warehouse', 'accountant') 
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

-- Clean up duplicate/conflicting RLS policies on sales table
DROP POLICY IF EXISTS "Sales staff can create sales" ON public.sales;
DROP POLICY IF EXISTS "Staff can view sales" ON public.sales;
DROP POLICY IF EXISTS "sales_admin_accountant_full" ON public.sales;
DROP POLICY IF EXISTS "sales_rep_own_only" ON public.sales;

-- Create comprehensive sales policies
CREATE POLICY "Sales view policy" ON public.sales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = auth.uid() 
    AND s.is_active = true
    AND (
      s.role = 'admin' 
      OR s.role = 'accountant'
      OR (s.role = 'sales_rep' AND sales.sales_rep_id = auth.uid())
    )
  )
);

CREATE POLICY "Sales modify policy" ON public.sales
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = auth.uid() 
    AND s.is_active = true
    AND (
      s.role = 'admin' 
      OR s.role = 'accountant'
      OR (s.role = 'sales_rep' AND sales.sales_rep_id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.id = auth.uid() 
    AND s.is_active = true
    AND (
      s.role = 'admin' 
      OR (s.role = 'sales_rep' AND sales.sales_rep_id = auth.uid())
    )
  )
);