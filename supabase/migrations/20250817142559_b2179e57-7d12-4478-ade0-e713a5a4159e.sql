-- Fix function search path security warning
DROP FUNCTION IF EXISTS public.get_user_role_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role_safe(user_id uuid DEFAULT auth.uid())
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val 
  FROM public.staff 
  WHERE id = user_id AND is_active = true;
  
  RETURN COALESCE(user_role_val, 'sales_rep'::user_role);
END;
$$;