-- Create test_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.test_executions(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  test_category VARCHAR(100) NOT NULL DEFAULT 'general',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create test_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.test_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on test_results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Enable RLS on test_metrics  
ALTER TABLE public.test_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for test_results
CREATE POLICY "Admin can manage test results" ON public.test_results
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create RLS policies for test_metrics
CREATE POLICY "Admin can manage test metrics" ON public.test_metrics
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON public.test_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON public.test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON public.test_results(created_at);

CREATE INDEX IF NOT EXISTS idx_test_metrics_test_result_id ON public.test_metrics(test_result_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_name ON public.test_metrics(metric_name);

-- Create function to update test_results updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_test_results_updated_at_trigger
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_test_results_updated_at();

-- Add to realtime publication for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_metrics;