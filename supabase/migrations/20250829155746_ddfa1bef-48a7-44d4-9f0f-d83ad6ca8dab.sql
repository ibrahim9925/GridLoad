-- Fix missing database function referenced in RLS policies
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is system admin (admin role in staff table or specific admin emails)
  RETURN EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role = 'admin'::user_role 
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email IN ('admin@gridload.com', 'ibrahim@gridload.com')
  );
END;
$$;