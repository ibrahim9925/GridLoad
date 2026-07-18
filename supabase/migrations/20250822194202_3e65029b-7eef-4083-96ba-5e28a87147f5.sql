-- Fix the security linter warnings for search_path on newly created functions
-- Add search_path to debug and enhanced auth functions

-- Fix debug_auth_status function
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

-- Fix is_admin_enhanced function
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