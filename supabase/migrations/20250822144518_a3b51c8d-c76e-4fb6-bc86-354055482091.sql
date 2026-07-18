-- Fix RLS Policy Infinite Recursion on Staff Table
-- Drop all conflicting and duplicate policies that cause infinite recursion

DROP POLICY IF EXISTS "Admin can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Admin operations allowed" ON public.staff;
DROP POLICY IF EXISTS "Allow system signup" ON public.staff;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own profile only" ON public.staff;
DROP POLICY IF EXISTS "Staff can view own profile only" ON public.staff;
DROP POLICY IF EXISTS "Users can view own staff record" ON public.staff;
DROP POLICY IF EXISTS "admin_only_staff_management" ON public.staff;
DROP POLICY IF EXISTS "staff_self_read_only" ON public.staff;

-- Create a security definer function to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Use a direct auth check with email-based admin verification to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email IN ('admin@gridload.com', 'ibrahim@gridload.com')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create clean, non-recursive RLS policies for staff table
CREATE POLICY "Staff can view own record"
ON public.staff
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Staff can update own record"
ON public.staff
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all staff"
ON public.staff
FOR SELECT
TO authenticated
USING (public.is_staff_admin());

CREATE POLICY "Admins can manage all staff"
ON public.staff
FOR ALL
TO authenticated
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

CREATE POLICY "System can insert staff on signup"
ON public.staff
FOR INSERT
TO public
WITH CHECK (true);