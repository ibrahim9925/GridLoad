-- Fix database constraints for comprehensive testing infrastructure (part 2)
-- Handle existing policies and constraints properly

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

-- Drop flexible constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'flexible_test_suites') THEN
        ALTER TABLE test_executions DROP CONSTRAINT flexible_test_suites;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints 
               WHERE constraint_name = 'flexible_test_categories') THEN
        ALTER TABLE test_results DROP CONSTRAINT flexible_test_categories;
    END IF;
END $$;

-- Add new flexible constraints that allow both real business tests and sample data
ALTER TABLE test_executions ADD CONSTRAINT flexible_test_suites 
CHECK (test_suite ~ '^(Database Tests|Sales Tests|Customer Tests|Inventory Tests|Warranty Tests|Staff Tests|Financial Tests|Security Tests|Performance Tests|Integration Tests|Unit Tests|E2E Tests|.*Individual).*$');

-- Add flexible test categories  
ALTER TABLE test_results ADD CONSTRAINT flexible_test_categories 
CHECK (test_category IN ('database', 'security', 'workflow', 'inventory', 'system', 'sales', 'customer', 'warranty', 'staff', 'financial', 'performance', 'integration', 'unit', 'e2e', 'business_logic', 'infrastructure'));

COMMENT ON TABLE test_executions IS 'Comprehensive business logic test executions - supports 300+ test scenarios';
COMMENT ON TABLE test_results IS 'Real business logic test results - flexible categories for all modules';