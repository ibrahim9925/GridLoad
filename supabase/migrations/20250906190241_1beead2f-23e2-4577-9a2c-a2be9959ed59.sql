-- Clean up stale test data and enable realtime
DELETE FROM test_results WHERE execution_id IN (
  SELECT id FROM test_executions WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'
);

DELETE FROM test_executions WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- Ensure tables have proper replica identity for realtime
ALTER TABLE test_executions REPLICA IDENTITY FULL;
ALTER TABLE test_results REPLICA IDENTITY FULL;
ALTER TABLE test_metrics REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE test_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE test_results;
ALTER PUBLICATION supabase_realtime ADD TABLE test_metrics;