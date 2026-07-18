-- Test execution tracking tables
CREATE TABLE test_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  total_tests INTEGER,
  passed_tests INTEGER DEFAULT 0,
  failed_tests INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual test results
CREATE TABLE test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES test_executions(id) ON DELETE CASCADE,
  test_name VARCHAR NOT NULL,
  test_category VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance metrics
CREATE TABLE test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
  metric_name VARCHAR NOT NULL,
  metric_value DECIMAL,
  metric_unit VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for test_executions
CREATE POLICY "Admin can manage test executions" ON test_executions
FOR ALL USING (is_admin())
WITH CHECK (is_admin());

-- RLS Policies for test_results
CREATE POLICY "Admin can manage test results" ON test_results
FOR ALL USING (is_admin())
WITH CHECK (is_admin());

-- RLS Policies for test_metrics
CREATE POLICY "Admin can manage test metrics" ON test_metrics
FOR ALL USING (is_admin())
WITH CHECK (is_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE test_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE test_results;
ALTER PUBLICATION supabase_realtime ADD TABLE test_metrics;