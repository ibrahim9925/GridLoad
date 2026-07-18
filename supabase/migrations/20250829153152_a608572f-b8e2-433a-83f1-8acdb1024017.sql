-- Create core security functions for RLS policies and authentication

-- Get current user's role from staff table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = auth.uid() AND is_active = true;
  
  RETURN COALESCE(user_role_val, 'sales_rep'::user_role);
END;
$$;

-- Core role checking functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'warehouse'::user_role 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'sales_rep'::user_role 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'accountant'::user_role 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_installer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'installer'::user_role 
    AND is_active = true
  );
$$;

-- Enhanced security functions
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin or system admin via email
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email IN ('admin@gridload.com', 'ibrahim@gridload.com')
  ) OR EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role 
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin'::user_role, 'accountant'::user_role) 
    AND is_active = true
  );
$$;

-- Debug function for comprehensive authentication status
CREATE OR REPLACE FUNCTION public.debug_auth_comprehensive()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_uid_result uuid;
  staff_record record;
  profile_record record;
  result jsonb := '{}'::jsonb;
BEGIN
  -- Get current auth.uid()
  auth_uid_result := auth.uid();
  result := jsonb_set(result, '{auth_uid}', to_jsonb(auth_uid_result));
  result := jsonb_set(result, '{timestamp}', to_jsonb(now()));
  
  IF auth_uid_result IS NULL THEN
    result := jsonb_set(result, '{status}', '"no_auth"'::jsonb);
    RETURN result;
  END IF;
  
  -- Check staff table
  SELECT id, email, role, is_active INTO staff_record
  FROM public.staff 
  WHERE id = auth_uid_result;
  
  result := jsonb_set(result, '{staff_record}', to_jsonb(staff_record));
  
  -- Check profiles table  
  SELECT id, email, role, is_active INTO profile_record
  FROM public.profiles 
  WHERE id = auth_uid_result;
  
  result := jsonb_set(result, '{profile_record}', to_jsonb(profile_record));
  
  -- Add role checks
  result := jsonb_set(result, '{is_admin}', to_jsonb(is_admin()));
  result := jsonb_set(result, '{is_warehouse}', to_jsonb(is_warehouse()));
  result := jsonb_set(result, '{is_sales_rep}', to_jsonb(is_sales_rep()));
  result := jsonb_set(result, '{is_accountant}', to_jsonb(is_accountant()));
  result := jsonb_set(result, '{is_installer}', to_jsonb(is_installer()));
  result := jsonb_set(result, '{current_role}', to_jsonb(get_current_user_role()));
  
  RETURN result;
END;
$$;