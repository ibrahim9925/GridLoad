-- Fix critical authentication permissions and functions
-- Grant proper permissions to authentication functions

-- 1. Grant execute permissions on get_current_user_role to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO anon;

-- 2. Grant execute permissions on all auth helper functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO anon;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO anon;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO anon;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_installer() TO anon;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO anon;

-- 3. Fix the get_current_user_role function to be more robust
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
  
  -- Log authentication attempt for debugging
  RAISE LOG 'get_current_user_role called with auth.uid(): %', auth_uid_val;
  
  IF auth_uid_val IS NULL THEN
    RAISE LOG 'auth.uid() is NULL - no authenticated session';
    RETURN NULL;
  END IF;
  
  -- Direct email check for admin users to avoid recursion
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth_uid_val 
    AND email IN ('admin@gridload.com', 'ibrahim@gridload.com', 'ibrahimimseeh@outlook.com')
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
$function$;

-- 4. Create a simple authentication test function
CREATE OR REPLACE FUNCTION public.test_auth_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  auth_uid_result uuid;
  staff_record record;
  result jsonb := '{}';
BEGIN
  -- Get current auth.uid()
  auth_uid_result := auth.uid();
  result := jsonb_set(result, '{auth_uid}', to_jsonb(auth_uid_result));
  
  -- Check if we have a session
  result := jsonb_set(result, '{has_session}', to_jsonb(auth_uid_result IS NOT NULL));
  
  -- Check staff table if we have auth
  IF auth_uid_result IS NOT NULL THEN
    SELECT id, email, role, is_active INTO staff_record
    FROM public.staff 
    WHERE id = auth_uid_result;
    
    result := jsonb_set(result, '{staff_record}', to_jsonb(staff_record));
  END IF;
  
  -- Add timestamp
  result := jsonb_set(result, '{timestamp}', to_jsonb(now()));
  
  RETURN result;
END;
$function$;

-- Grant execute permissions on the test function
GRANT EXECUTE ON FUNCTION public.test_auth_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_auth_status() TO anon;