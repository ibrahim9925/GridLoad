-- PHASE 1: CRITICAL SECURITY HARDENING
-- Fix all RLS policies to secure sensitive data access

-- 1. Secure Customer Data - Only admin, accountant, and assigned sales reps can access
DROP POLICY IF EXISTS "customers_view_all" ON public.customers;
DROP POLICY IF EXISTS "customers_manage_all" ON public.customers;

CREATE POLICY "customers_restricted_view" ON public.customers
FOR SELECT USING (
  is_admin() OR 
  is_accountant() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.customer_id = customers.id AND s.sales_rep_id = auth.uid()
  ))
);

CREATE POLICY "customers_restricted_manage" ON public.customers
FOR ALL USING (
  is_admin() OR 
  is_accountant() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.customer_id = customers.id AND s.sales_rep_id = auth.uid()
  ))
)
WITH CHECK (
  is_admin() OR is_accountant()
);

-- 2. Secure Staff Data - Only admin and self-access
DROP POLICY IF EXISTS "staff_view_all" ON public.staff;
DROP POLICY IF EXISTS "staff_manage_all" ON public.staff;

CREATE POLICY "staff_restricted_view" ON public.staff
FOR SELECT USING (
  is_admin() OR auth.uid() = id
);

CREATE POLICY "staff_admin_manage" ON public.staff
FOR ALL USING (
  is_admin()
)
WITH CHECK (
  is_admin()
);

CREATE POLICY "staff_self_update" ON public.staff
FOR UPDATE USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- 3. Secure Leads Data - Enhanced protection for sales competition
DROP POLICY IF EXISTS "leads_restricted_access" ON public.leads;

CREATE POLICY "leads_secure_access" ON public.leads
FOR SELECT USING (
  is_admin() OR 
  (is_sales_rep() AND (assigned_to = auth.uid() OR assigned_to IS NULL))
);

CREATE POLICY "leads_secure_manage" ON public.leads
FOR ALL USING (
  is_admin() OR 
  (is_sales_rep() AND (assigned_to = auth.uid() OR assigned_to IS NULL))
)
WITH CHECK (
  is_admin() OR is_sales_rep()
);

-- 4. Secure Financial Data - Admin and accountant only
DROP POLICY IF EXISTS "payments_financial_only" ON public.payments;
DROP POLICY IF EXISTS "payments_salesrep_own_sales" ON public.payments;

CREATE POLICY "payments_financial_strict" ON public.payments
FOR ALL USING (
  is_admin() OR is_accountant()
)
WITH CHECK (
  is_admin() OR is_accountant()
);

CREATE POLICY "commission_payments_financial_strict" ON public.commission_payments
FOR ALL USING (
  is_admin() OR is_accountant() OR 
  (is_sales_rep() AND sales_rep_id = auth.uid())
)
WITH CHECK (
  is_admin() OR is_accountant()
);

-- 5. Secure Supplier Data - Warehouse and admin only
DROP POLICY IF EXISTS "Restricted supplier access" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse and admin can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse and admin can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse staff can manage suppliers" ON public.suppliers;

CREATE POLICY "suppliers_warehouse_admin_only" ON public.suppliers
FOR ALL USING (
  is_admin() OR is_warehouse()
)
WITH CHECK (
  is_admin() OR is_warehouse()
);

-- Create missing staff table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.staff (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'sales_rep'::user_role,
    is_active boolean NOT NULL DEFAULT true,
    full_name text,
    phone text,
    commission_rate numeric DEFAULT 5.00,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on staff table
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Insert admin user if not exists
INSERT INTO public.staff (id, email, role, is_active, full_name)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@gridload.com' LIMIT 1),
    'admin@gridload.com',
    'admin'::user_role,
    true,
    'System Administrator'
) ON CONFLICT (email) DO NOTHING;