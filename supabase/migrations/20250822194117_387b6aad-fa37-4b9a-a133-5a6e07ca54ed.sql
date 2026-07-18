-- Fix RLS policies to be more consistent and debug-friendly
-- Add better error handling and logging for authentication issues

-- Create enhanced authentication testing function
CREATE OR REPLACE FUNCTION public.debug_auth_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_uid_result uuid;
  staff_record record;
  profile_record record;
  result jsonb := '{}';
BEGIN
  -- Get current auth.uid()
  auth_uid_result := auth.uid();
  result := jsonb_set(result, '{auth_uid}', to_jsonb(auth_uid_result));
  
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
  
  -- Add session info
  result := jsonb_set(result, '{timestamp}', to_jsonb(now()));
  
  RETURN result;
END;
$$;

-- Enhance existing functions with better error handling
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
  
  -- Try staff table first (primary source)
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = auth_uid_val AND is_active = true;
  
  IF user_role_val IS NOT NULL THEN
    RAISE LOG 'Found role in staff table: %', user_role_val;
    RETURN user_role_val;
  END IF;
  
  -- Fallback to profiles table
  SELECT role INTO user_role_val 
  FROM public.profiles 
  WHERE id = auth_uid_val AND is_active = true;
  
  IF user_role_val IS NOT NULL THEN
    RAISE LOG 'Found role in profiles table: %', user_role_val;
    RETURN user_role_val;
  END IF;
  
  RAISE LOG 'No role found for user: %', auth_uid_val;
  RETURN NULL;
END;
$$;

-- Create enhanced admin check function
CREATE OR REPLACE FUNCTION public.is_admin_enhanced()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_uid_val uuid;
  is_admin_result boolean := false;
BEGIN
  auth_uid_val := auth.uid();
  
  IF auth_uid_val IS NULL THEN
    RAISE LOG 'is_admin_enhanced: auth.uid() is NULL';
    RETURN false;
  END IF;
  
  -- Check staff table first
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth_uid_val 
    AND role = 'admin' 
    AND is_active = true
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    RETURN true;
  END IF;
  
  -- Check profiles table as fallback
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth_uid_val 
    AND role = 'admin' 
    AND is_active = true
  ) INTO is_admin_result;
  
  RETURN is_admin_result;
END;
$$;