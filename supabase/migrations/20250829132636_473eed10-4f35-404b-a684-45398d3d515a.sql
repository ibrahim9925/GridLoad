-- PHASE 3: SYSTEM TESTING & VALIDATION IMPROVEMENTS
-- Add enhanced system monitoring and testing capabilities

-- Create comprehensive system health monitoring function
CREATE OR REPLACE FUNCTION public.get_system_health_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    table_counts jsonb := '{}'::jsonb;
    security_issues integer := 0;
    performance_metrics jsonb := '{}'::jsonb;
BEGIN
    -- Get table counts for system overview
    SELECT jsonb_build_object(
        'customers', (SELECT COUNT(*) FROM public.customers),
        'products', (SELECT COUNT(*) FROM public.products),
        'sales', (SELECT COUNT(*) FROM public.sales),
        'leads', (SELECT COUNT(*) FROM public.leads),
        'staff', (SELECT COUNT(*) FROM public.staff),
        'suppliers', (SELECT COUNT(*) FROM public.suppliers)
    ) INTO table_counts;
    
    -- Check for basic security issues
    -- Count tables without RLS enabled
    SELECT COUNT(*) INTO security_issues
    FROM information_schema.tables t
    LEFT JOIN pg_class c ON c.relname = t.table_name
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.schemaname = 'public' 
        AND p.tablename = t.table_name
    );
    
    -- Build comprehensive result
    result := jsonb_build_object(
        'timestamp', now(),
        'database_status', 'healthy',
        'table_counts', table_counts,
        'security_score', CASE 
            WHEN security_issues = 0 THEN 100
            WHEN security_issues <= 2 THEN 80
            WHEN security_issues <= 5 THEN 60
            ELSE 40
        END,
        'tables_without_rls', security_issues,
        'recommendations', CASE 
            WHEN security_issues > 0 THEN ARRAY['Enable RLS on all sensitive tables', 'Review access policies']
            ELSE ARRAY['System security looks good']
        END
    );
    
    RETURN result;
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'timestamp', now(),
        'database_status', 'error',
        'error_message', SQLERRM,
        'security_score', 0
    );
END;
$$;

-- Create function to validate all enum constraints
CREATE OR REPLACE FUNCTION public.validate_all_enum_constraints()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{"issues": [], "valid": true}'::jsonb;
    issue_count integer := 0;
    issues jsonb[] := ARRAY[]::jsonb[];
BEGIN
    -- Check purchase orders status
    IF EXISTS (
        SELECT 1 FROM public.purchase_orders 
        WHERE status NOT IN ('draft', 'pending', 'ordered', 'received', 'completed', 'cancelled')
    ) THEN
        issues := array_append(issues, 
            '{"table": "purchase_orders", "field": "status", "issue": "Invalid status values found"}'::jsonb
        );
        issue_count := issue_count + 1;
    END IF;
    
    -- Check sales fulfillment status
    IF EXISTS (
        SELECT 1 FROM public.sales 
        WHERE fulfillment_status IS NOT NULL 
        AND fulfillment_status::text NOT IN ('pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled')
    ) THEN
        issues := array_append(issues, 
            '{"table": "sales", "field": "fulfillment_status", "issue": "Invalid fulfillment status values found"}'::jsonb
        );
        issue_count := issue_count + 1;
    END IF;
    
    -- Check installation status
    IF EXISTS (
        SELECT 1 FROM public.installations 
        WHERE status::text NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled')
    ) THEN
        issues := array_append(issues, 
            '{"table": "installations", "field": "status", "issue": "Invalid installation status values found"}'::jsonb
        );
        issue_count := issue_count + 1;
    END IF;
    
    result := jsonb_build_object(
        'valid', issue_count = 0,
        'issue_count', issue_count,
        'issues', array_to_json(issues),
        'checked_at', now()
    );
    
    RETURN result;
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'valid', false,
        'error', SQLERRM,
        'checked_at', now()
    );
END;
$$;

-- Create automated system test data cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_system_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cleaned_count integer := 0;
    result jsonb;
BEGIN
    -- Clean test customers
    DELETE FROM public.customers 
    WHERE contact_person LIKE 'Test%' 
    OR email LIKE '%test%@example.com'
    OR notes LIKE '%Created by system test%';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean test suppliers
    DELETE FROM public.suppliers 
    WHERE name LIKE 'Test%' 
    OR email LIKE '%test%@example.com';
    
    -- Clean test products
    DELETE FROM public.products 
    WHERE name LIKE 'Test%';
    
    -- Clean orphaned stock movements
    DELETE FROM public.stock_movements 
    WHERE notes LIKE '%Test%';
    
    result := jsonb_build_object(
        'success', true,
        'customers_cleaned', cleaned_count,
        'cleaned_at', now(),
        'message', 'System test data cleanup completed'
    );
    
    RETURN result;
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'cleaned_at', now()
    );
END;
$$;