-- Create test_results table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_results') THEN
        CREATE TABLE public.test_results (
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
        
        -- Enable RLS on test_results
        ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy for test_results
        CREATE POLICY "Admin can manage test results" ON public.test_results
          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_metrics') THEN
        CREATE TABLE public.test_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
          metric_name VARCHAR(100) NOT NULL,
          metric_value NUMERIC NOT NULL,
          metric_unit VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Enable RLS on test_metrics  
        ALTER TABLE public.test_metrics ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy for test_metrics
        CREATE POLICY "Admin can manage test metrics" ON public.test_metrics
          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    END IF;
END $$;