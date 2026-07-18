CREATE OR REPLACE FUNCTION public.admin_list_public_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY t.table_name;
$$;

REVOKE ALL ON FUNCTION public.admin_list_public_tables() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_public_tables() TO authenticated, service_role;