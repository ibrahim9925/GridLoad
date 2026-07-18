-- Complete authentication system repair
-- Fix all remaining authentication and permission issues

-- 1. Grant comprehensive permissions to all authentication functions
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.test_auth_status() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.test_auth_status() TO authenticated, anon, service_role;

-- Grant permissions on all helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated, anon, service_role;

-- 2. Create a comprehensive authentication diagnosis function
CREATE OR REPLACE FUNCTION public.debug_auth_comprehensive()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  auth_uid_val uuid;
  user_record record;
  staff_record record;
  current_role_name text;
BEGIN
  -- Get auth context
  auth_uid_val := auth.uid();
  SELECT current_user INTO current_role_name;
  
  -- Build comprehensive debug info
  result := jsonb_build_object(
    'auth_uid', auth_uid_val,
    'current_user', current_role_name,
    'current_role', current_setting('role'),
    'session_exists', auth_uid_val IS NOT NULL,
    'timestamp', now()
  );
  
  -- If we have auth, get user details
  IF auth_uid_val IS NOT NULL THEN
    -- Get from auth.users
    SELECT id, email, created_at, last_sign_in_at INTO user_record
    FROM auth.users 
    WHERE id = auth_uid_val;
    
    result := jsonb_set(result, '{user_details}', to_jsonb(user_record));
    
    -- Get from staff table
    SELECT id, email, role, is_active, full_name INTO staff_record
    FROM public.staff 
    WHERE id = auth_uid_val;
    
    result := jsonb_set(result, '{staff_details}', to_jsonb(staff_record));
  END IF;
  
  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.debug_auth_comprehensive() TO authenticated, anon, service_role;

-- 3. Create emergency admin login function for testing
CREATE OR REPLACE FUNCTION public.emergency_create_admin_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_id uuid := 'e1b71d86-0364-4195-b3d0-fefbe8a5ff1f';
  result jsonb := '{}';
BEGIN
  -- Make sure staff record exists with correct permissions
  INSERT INTO public.staff (id, email, role, is_active, full_name)
  VALUES (
    user_id, 
    'ibrahimimseeh@outlook.com',
    'admin',
    true,
    'Ibrahim Imseeh'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    email = 'ibrahimimseeh@outlook.com',
    full_name = 'Ibrahim Imseeh';
  
  -- Also ensure profiles record exists
  INSERT INTO public.profiles (id, email, role, is_active, full_name)
  VALUES (
    user_id,
    'ibrahimimseeh@outlook.com', 
    'admin',
    true,
    'Ibrahim Imseeh'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    email = 'ibrahimimseeh@outlook.com',
    full_name = 'Ibrahim Imseeh';
  
  result := jsonb_build_object(
    'user_id', user_id,
    'staff_created', true,
    'profile_created', true,
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.emergency_create_admin_user() TO authenticated, anon, service_role;

-- 4. Update get_current_user_role with better error handling and logging
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role_val user_role;
  auth_uid_val uuid;
BEGIN
  auth_uid_val := auth.uid();
  
  -- Enhanced logging for debugging
  RAISE LOG 'get_current_user_role: auth.uid() = %, current_user = %', auth_uid_val, current_user;
  
  IF auth_uid_val IS NULL THEN
    RAISE LOG 'get_current_user_role: No authenticated session (auth.uid() is NULL)';
    RETURN NULL;
  END IF;
  
  -- Check if this is a known admin user by email
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth_uid_val 
    AND email IN ('admin@gridload.com', 'ibrahim@gridload.com', 'ibrahimimseeh@outlook.com')
  ) THEN
    RAISE LOG 'get_current_user_role: Admin user confirmed by email';
    RETURN 'admin'::user_role;
  END IF;
  
  -- Check staff table
  BEGIN
    SELECT role INTO user_role_val 
    FROM public.staff 
    WHERE id = auth_uid_val AND is_active = true;
    
    IF user_role_val IS NOT NULL THEN
      RAISE LOG 'get_current_user_role: Found role in staff table: %', user_role_val;
      RETURN user_role_val;
    ELSE
      RAISE LOG 'get_current_user_role: No active staff record found for user %', auth_uid_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'get_current_user_role: Error querying staff table: %', SQLERRM;
  END;
  
  -- Fallback to profiles table
  BEGIN
    SELECT role INTO user_role_val 
    FROM public.profiles 
    WHERE id = auth_uid_val AND is_active = true;
    
    IF user_role_val IS NOT NULL THEN
      RAISE LOG 'get_current_user_role: Found role in profiles table: %', user_role_val;
      RETURN user_role_val;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'get_current_user_role: Error querying profiles table: %', SQLERRM;
  END;
  
  RAISE LOG 'get_current_user_role: No role found for authenticated user %', auth_uid_val;
  RETURN NULL;
END;
$function$;