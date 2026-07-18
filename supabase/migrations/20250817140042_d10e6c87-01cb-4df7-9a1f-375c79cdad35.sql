-- Grant execute permissions on security definer functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated;