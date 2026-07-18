-- Clean up stale test data that's causing accumulating numbers
DELETE FROM public.test_metrics WHERE created_at < NOW() - INTERVAL '1 hour';
DELETE FROM public.test_results WHERE created_at < NOW() - INTERVAL '1 hour';  
DELETE FROM public.test_executions WHERE created_at < NOW() - INTERVAL '1 hour';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_executions_suite_status ON public.test_executions(test_suite, status);
CREATE INDEX IF NOT EXISTS idx_test_results_execution_status ON public.test_results(execution_id, status);
CREATE INDEX IF NOT EXISTS idx_test_metrics_result_name ON public.test_metrics(test_result_id, metric_name);