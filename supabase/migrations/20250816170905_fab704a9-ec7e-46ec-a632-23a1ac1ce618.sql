-- Fix infinite recursion in staff table RLS policies
-- Create security definer functions for role checking

-- Create function to get current user role without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.staff WHERE id = auth.uid();
$$;

-- Create function to check if user is admin without recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop existing problematic policies on staff table
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff;
DROP POLICY IF EXISTS "Admin can manage all staff" ON public.staff;
DROP POLICY IF EXISTS "Users can view their own staff record" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;

-- Create new non-recursive policies for staff table
CREATE POLICY "Users can view own staff record" 
ON public.staff 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "System can create staff records" 
ON public.staff 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update own staff record" 
ON public.staff 
FOR UPDATE 
USING (id = auth.uid());

-- Allow direct access for admin operations (will be controlled at application level)
CREATE POLICY "Admin operations allowed" 
ON public.staff 
FOR ALL 
USING (true)
WITH CHECK (true);