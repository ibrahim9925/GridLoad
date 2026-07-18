// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SampleTestData {
  executions: any[];
  results: any[];
  metrics: any[];
}

export const useTestSampleData = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateSampleTestData = useCallback(async (): Promise<SampleTestData> => {
    setIsGenerating(true);
    
    try {
      toast({
        title: "Generating Sample Test Data",
        description: "Creating realistic test execution data for demonstration..."
      });

      const testSuites = [
        'Unit Tests', 
        'Integration Tests', 
        'Performance Tests', 
        'E2E Tests', 
        'Security Tests'
      ];

      const testCategories = [
        'database', 'authentication', 'business_logic', 'api', 'ui', 
        'performance', 'security', 'integration', 'validation'
      ];

      const testNames = [
        'Database Connection Test',
        'User Authentication Flow',
        'Sales Workflow Validation',
        'Inventory Management Test',
        'Payment Processing Test',
        'Product CRUD Operations',
        'Customer Management Test',
        'Role-Based Access Control',
        'Data Validation Rules',
        'API Response Times',
        'Security Policy Enforcement',
        'Cross-Module Integration',
        'Backup and Recovery Test',
        'Performance Load Test',
        'UI Responsiveness Test'
      ];

      const generatedData: SampleTestData = {
        executions: [],
        results: [],
        metrics: []
      };

      // Generate test executions (last 7 days)
      for (let i = 0; i < 25; i++) {
        const suite = testSuites[Math.floor(Math.random() * testSuites.length)];
        const totalTests = Math.floor(Math.random() * 15) + 5; // 5-20 tests
        const passedTests = Math.floor(totalTests * (0.6 + Math.random() * 0.4)); // 60-100% pass rate
        const failedTests = totalTests - passedTests;
        
        const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
        const endTime = new Date(startTime.getTime() + (Math.random() * 300 + 30) * 1000); // 30-330 seconds duration
        
        const status = Math.random() > 0.1 ? 'completed' : Math.random() > 0.5 ? 'failed' : 'running';
        
        const execution = {
          test_suite: suite,
          status: status,
          start_time: startTime.toISOString(),
          end_time: status === 'running' ? null : endTime.toISOString(),
          total_tests: totalTests,
          passed_tests: status === 'running' ? Math.floor(passedTests * 0.6) : passedTests,
          failed_tests: status === 'running' ? 0 : failedTests,
          error_message: status === 'failed' ? 'Test execution failed due to timeout' : null
        };

        const { data: executionData, error: execError } = await supabase
          .from('test_executions')
          .insert(execution)
          .select()
          .single();

        if (execError) throw execError;
        generatedData.executions.push(executionData);

        // Generate individual test results for this execution
        for (let j = 0; j < totalTests; j++) {
          const testName = testNames[Math.floor(Math.random() * testNames.length)];
          const category = testCategories[Math.floor(Math.random() * testCategories.length)];
          const duration = Math.floor(Math.random() * 5000) + 100; // 100-5100ms
          
          let testStatus: string;
          let errorMessage = null;
          let stackTrace = null;

          if (j < passedTests) {
            testStatus = 'passed';
          } else if (status === 'running' && j < passedTests + Math.floor(failedTests * 0.6)) {
            testStatus = 'running';
          } else {
            testStatus = 'failed';
            errorMessage = 'AssertionError: Expected value to be true but got false';
            stackTrace = JSON.stringify([
              'at validateUserPermissions (test/auth.test.ts:45:12)',
              'at Object.runTest (test/runner.ts:120:8)',
              'at TestSuite.execute (test/suite.ts:89:15)'
            ]);
          }

          const testResult = {
            execution_id: executionData.id,
            test_name: testName + ` #${j + 1}`,
            test_category: category,
            status: testStatus,
            duration_ms: testStatus === 'running' ? null : duration,
            error_message: errorMessage,
            stack_trace: stackTrace,
            created_at: new Date(startTime.getTime() + j * 2000).toISOString()
          };

          const { data: resultData, error: resultError } = await supabase
            .from('test_results')
            .insert(testResult)
            .select()
            .single();

          if (resultError) throw resultError;
          generatedData.results.push(resultData);

          // Generate metrics for passed tests
          if (testStatus === 'passed' && Math.random() > 0.3) {
            const metrics = [
              {
                test_result_id: resultData.id,
                metric_name: 'memory_usage',
                metric_value: Math.floor(Math.random() * 50) + 10,
                metric_unit: 'MB'
              },
              {
                test_result_id: resultData.id,
                metric_name: 'cpu_usage',
                metric_value: Math.floor(Math.random() * 80) + 5,
                metric_unit: '%'
              },
              {
                test_result_id: resultData.id,
                metric_name: 'response_time',
                metric_value: Math.floor(Math.random() * 500) + 50,
                metric_unit: 'ms'
              }
            ];

            for (const metric of metrics) {
              const { data: metricData, error: metricError } = await supabase
                .from('test_metrics')
                .insert(metric)
                .select()
                .single();

              if (metricError) throw metricError;
              generatedData.metrics.push(metricData);
            }
          }
        }
      }

      toast({
        title: "Sample Data Generated Successfully",
        description: `Generated ${generatedData.executions.length} test executions with ${generatedData.results.length} test results`
      });

      return generatedData;

    } catch (error: any) {
      console.error('Error generating sample test data:', error);
      toast({
        title: "Failed to Generate Sample Data",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const clearTestData = useCallback(async () => {
    try {
      toast({
        title: "Clearing Test Data",
        description: "Removing all test execution data..."
      });

      // Clear in reverse order due to foreign key constraints
      await supabase.from('test_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('test_executions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({
        title: "Test Data Cleared",
        description: "All test execution data has been removed"
      });

    } catch (error: any) {
      console.error('Error clearing test data:', error);
      toast({
        title: "Failed to Clear Test Data",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  return {
    generateSampleTestData,
    clearTestData,
    isGenerating
  };
};