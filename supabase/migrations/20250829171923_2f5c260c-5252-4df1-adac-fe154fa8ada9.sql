-- Continue fixing RLS policies for sales and payments to enable CRUD operations

-- Simplify sales RLS policies  
DROP POLICY IF EXISTS "Sales modify policy" ON public.sales;
DROP POLICY IF EXISTS "Sales view policy" ON public.sales;

CREATE POLICY "sales_full_access" 
ON public.sales 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'accountant'::user_role, 'sales_rep'::user_role])
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'sales_rep'::user_role])
);

-- Simplify payments RLS policies
DROP POLICY IF EXISTS "payments_financial_only" ON public.payments;
DROP POLICY IF EXISTS "payments_salesrep_own_sales" ON public.payments;

CREATE POLICY "payments_full_access" 
ON public.payments 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'accountant'::user_role])
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'accountant'::user_role])
);

-- Fix sale_items policy to allow CRUD operations
DROP POLICY IF EXISTS "Staff can manage sale items" ON public.sale_items;

CREATE POLICY "sale_items_full_access" 
ON public.sale_items 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'sales_rep'::user_role, 'warehouse'::user_role])
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'sales_rep'::user_role])
);

-- Update leads policy to be simpler
DROP POLICY IF EXISTS "leads_role_based_access" ON public.leads;

CREATE POLICY "leads_full_access" 
ON public.leads 
FOR ALL 
TO authenticated
USING (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'sales_rep'::user_role])
)
WITH CHECK (
  is_admin() OR 
  get_current_user_role() = ANY(ARRAY['admin'::user_role, 'sales_rep'::user_role])
);