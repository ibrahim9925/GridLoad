-- Fix the security function search path warning
CREATE OR REPLACE FUNCTION public.get_current_user_staff_info()
RETURNS TABLE(user_id uuid, role user_role, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'auth'
AS $$
  SELECT 
    staff.id as user_id,
    staff.role,
    staff.is_active
  FROM public.staff 
  WHERE staff.id = auth.uid() 
  AND staff.is_active = true;
$$;