-- Fix infinite recursion in staff table RLS policies
-- This addresses the "infinite recursion detected in policy for relation staff" error

-- First, drop all existing RLS policies on staff table that might cause recursion
DROP POLICY IF EXISTS "staff_admin_only" ON public.staff;
DROP POLICY IF EXISTS "staff_own_data" ON public.staff;
DROP POLICY IF EXISTS "staff_view_policy" ON public.staff;
DROP POLICY IF EXISTS "staff_manage_policy" ON public.staff;

-- Create a safe admin check function that doesn't reference staff table
CREATE OR REPLACE FUNCTION public.is_staff_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use direct auth check with email-based admin verification to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email IN ('admin@gridload.com', 'ibrahim@gridload.com')
  );
END;
$$;

-- Create safe RLS policies for staff table that don't cause recursion
CREATE POLICY "staff_admin_access_safe" ON public.staff
FOR ALL USING (
  public.is_staff_admin_safe() OR id = auth.uid()
);

-- Update get_current_user_role to be safer and avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
  auth_uid_val uuid;
BEGIN
  auth_uid_val := auth.uid();
  
  -- Log authentication attempt
  RAISE LOG 'get_current_user_role called with auth.uid(): %', auth_uid_val;
  
  IF auth_uid_val IS NULL THEN
    RAISE LOG 'auth.uid() is NULL - no authenticated session';
    RETURN NULL;
  END IF;
  
  -- Direct email check for admin users to avoid recursion
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth_uid_val 
    AND email IN ('admin@gridload.com', 'ibrahim@gridload.com')
  ) THEN
    RAISE LOG 'Found admin role via email check';
    RETURN 'admin'::user_role;
  END IF;
  
  -- Try staff table with careful query to avoid recursion
  BEGIN
    SELECT role INTO user_role_val 
    FROM public.staff 
    WHERE id = auth_uid_val AND is_active = true;
    
    IF user_role_val IS NOT NULL THEN
      RAISE LOG 'Found role in staff table: %', user_role_val;
      RETURN user_role_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error querying staff table: %', SQLERRM;
  END;
  
  -- Fallback to profiles table
  BEGIN
    SELECT role INTO user_role_val 
    FROM public.profiles 
    WHERE id = auth_uid_val AND is_active = true;
    
    IF user_role_val IS NOT NULL THEN
      RAISE LOG 'Found role in profiles table: %', user_role_val;
      RETURN user_role_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error querying profiles table: %', SQLERRM;
  END;
  
  RAISE LOG 'No role found for user: %', auth_uid_val;
  RETURN NULL;
END;
$$;

-- Update is_admin function to use safe approach
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_staff_admin_safe() OR public.get_current_user_role() = 'admin'::user_role;
$$;