-- Fix critical security vulnerabilities by implementing proper RLS policies

-- 1. Fix customers table - Only admins, accountants, and sales reps can access
DROP POLICY IF EXISTS "customers_policy" ON public.customers;
CREATE POLICY "customers_restricted_access"
ON public.customers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin', 'accountant', 'sales_rep')
    AND staff.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin', 'accountant', 'sales_rep') 
    AND staff.is_active = true
  )
);

-- 2. Fix leads table - Sales reps can only see their assigned leads, admins see all
DROP POLICY IF EXISTS "Admins and sales can manage leads" ON public.leads;
DROP POLICY IF EXISTS "Sales staff can create leads" ON public.leads;
DROP POLICY IF EXISTS "Sales staff can update their leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can view leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can view relevant leads" ON public.leads;

CREATE POLICY "leads_restricted_access"
ON public.leads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND (
      staff.role = 'admin' 
      OR (staff.role = 'sales_rep' AND (leads.assigned_to = auth.uid() OR leads.assigned_to IS NULL))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin', 'sales_rep')
    AND staff.is_active = true
  )
);

-- 3. Fix staff table - Only admins can manage staff data
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
CREATE POLICY "staff_admin_only"
ON public.staff
FOR ALL
TO authenticated
USING (
  auth.uid() = staff.id OR -- Users can see their own record
  EXISTS (
    SELECT 1 FROM public.staff s2
    WHERE s2.id = auth.uid() 
    AND s2.role = 'admin' 
    AND s2.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin' 
    AND staff.is_active = true
  )
);

-- 4. Fix suppliers table - Only admins and warehouse can access
-- (This is already properly restricted)

-- 5. Fix profiles table - Users can only access their own profile, admins can access all
-- (This is already properly restricted)