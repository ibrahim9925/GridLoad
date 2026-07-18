-- Fix database constraints for comprehensive testing infrastructure
-- Remove problematic constraints and update validation

-- Drop the existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'valid_business_test_suites') THEN
        ALTER TABLE test_executions DROP CONSTRAINT valid_business_test_suites;
    END IF;
END $$;

-- Drop the test categories constraint if it exists  
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'valid_test_categories') THEN
        ALTER TABLE test_results DROP CONSTRAINT valid_test_categories;
    END IF;
END $$;

-- Add new flexible constraints that allow both real business tests and sample data
ALTER TABLE test_executions ADD CONSTRAINT flexible_test_suites 
CHECK (test_suite ~ '^(Database Tests|Sales Tests|Customer Tests|Inventory Tests|Warranty Tests|Staff Tests|Financial Tests|Security Tests|Performance Tests|Integration Tests|Unit Tests|E2E Tests|.*Individual).*$');

-- Add flexible test categories  
ALTER TABLE test_results ADD CONSTRAINT flexible_test_categories 
CHECK (test_category IN ('database', 'security', 'workflow', 'inventory', 'system', 'sales', 'customer', 'warranty', 'staff', 'financial', 'performance', 'integration', 'unit', 'e2e', 'business_logic', 'infrastructure'));

-- Add test metrics table for performance tracking
CREATE TABLE IF NOT EXISTS test_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id uuid REFERENCES test_executions(id) ON DELETE CASCADE,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on test_metrics
ALTER TABLE test_metrics ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage test metrics
CREATE POLICY "Admin can manage test metrics" ON test_metrics
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_metrics_execution_id ON test_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_name ON test_metrics(metric_name);

-- Add test schedule table for automated testing
CREATE TABLE IF NOT EXISTS test_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_suite text NOT NULL,
    schedule_pattern text NOT NULL, -- cron pattern
    is_active boolean DEFAULT true,
    last_run_at timestamptz,
    next_run_at timestamptz,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on test_schedules
ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage test schedules
CREATE POLICY "Admin can manage test schedules" ON test_schedules
    FOR ALL USING (is_admin()) WITH CHECK (is_admin());

COMMENT ON TABLE test_executions IS 'Comprehensive business logic test executions - supports 300+ test scenarios';
COMMENT ON TABLE test_results IS 'Real business logic test results - flexible categories for all modules';
COMMENT ON TABLE test_metrics IS 'Performance metrics and measurements from test executions';
COMMENT ON TABLE test_schedules IS 'Automated test scheduling configuration';