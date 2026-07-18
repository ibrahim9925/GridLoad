-- Revoke and re-grant proper permissions on functions
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sales_rep() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_accountant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_warehouse() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_installer() FROM PUBLIC;

-- Grant specific permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated, anon;

-- Allow the API to access functions
ALTER FUNCTION public.get_current_user_role() SECURITY DEFINER;
ALTER FUNCTION public.is_admin_user() SECURITY DEFINER;

-- Update staff table to allow proper access patterns
DROP POLICY IF EXISTS "Admin operations allowed" ON public.staff;

-- Create a simple policy for staff access
CREATE POLICY "Staff table access" 
ON public.staff 
FOR ALL 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false -- No access for anonymous users
    WHEN id = auth.uid() THEN true -- Users can access their own record
    WHEN EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin') THEN true -- Admins can access all
    ELSE false
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL AND TG_OP = 'INSERT' THEN true -- Allow inserts during signup
    WHEN id = auth.uid() THEN true -- Users can modify their own record
    WHEN EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin') THEN true -- Admins can modify all
    ELSE false
  END
);