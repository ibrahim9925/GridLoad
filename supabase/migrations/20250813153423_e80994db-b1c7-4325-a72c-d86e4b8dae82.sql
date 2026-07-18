-- Fix Security Linter Warnings - Update Functions with Proper Search Path

-- Fix Function Search Path Mutable warnings
-- Update the two new functions created in the previous migration

-- 1. Fix can_access_financial_data function
CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN is_admin() OR is_accountant();
END;
$$;

-- 2. Fix log_data_access_attempt function  
CREATE OR REPLACE FUNCTION public.log_data_access_attempt(
  p_table_name text,
  p_operation text,
  p_resource_id uuid DEFAULT NULL
) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM log_security_event(
    CONCAT('data_access_', p_operation),
    p_table_name,
    p_resource_id,
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'user_role', get_current_user_role()
    ),
    NULL,
    NULL,
    NULL,
    true,
    CASE 
      WHEN p_table_name IN ('sales', 'payments', 'commission_payments') THEN 'high'
      WHEN p_table_name IN ('customers', 'staff') THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$;

-- Log this security function update
SELECT log_security_event(
  'security_functions_updated',
  'database_security', 
  NULL,
  jsonb_build_object(
    'functions_updated', 2,
    'search_path_fixed', true,
    'security_level', 'hardened'
  ),
  NULL,
  'system',
  NULL,
  true,
  'medium'
);