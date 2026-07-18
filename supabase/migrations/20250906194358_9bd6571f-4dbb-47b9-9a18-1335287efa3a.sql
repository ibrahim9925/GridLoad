-- Clean up legacy test data and add performance indexes
-- This removes fake/sample data while preserving the table structure

-- Clean up legacy fake test data
DELETE FROM test_results WHERE test_name IN (
  'Authentication System', 'Inventory Management', 'Sales Workflow', 
  'Database Connection', 'User Interface Rendering', 'API Response Time',
  'Memory Usage', 'Login Flow', 'Data Validation'
);

DELETE FROM test_executions WHERE test_suite IN (
  'Unit Tests', 'Integration Tests', 'Performance Tests', 
  'E2E Tests', 'Security Tests'
);

DELETE FROM test_metrics;

-- Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_test_executions_suite_status ON test_executions(test_suite, status);
CREATE INDEX IF NOT EXISTS idx_test_results_execution_status ON test_results(execution_id, status);
CREATE INDEX IF NOT EXISTS idx_test_results_name_category ON test_results(test_name, test_category);

-- Add a check constraint to ensure only valid test suite names (business logic focused)
ALTER TABLE test_executions ADD CONSTRAINT valid_business_test_suites 
CHECK (test_suite ~ '^(Database Tests|Sales Workflow Tests|System Health Tests|.*Individual).*$');

-- Add validation for test categories to match real business logic
ALTER TABLE test_results ADD CONSTRAINT valid_test_categories 
CHECK (test_category IN ('database', 'security', 'workflow', 'inventory', 'system'));

-- Clean up any remaining orphaned records
DELETE FROM test_results WHERE execution_id NOT IN (SELECT id FROM test_executions);

COMMENT ON TABLE test_executions IS 'Real business logic test executions - no fake data';
COMMENT ON TABLE test_results IS 'Real business logic test results - validated categories only';