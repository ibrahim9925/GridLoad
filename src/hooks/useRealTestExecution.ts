// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useComprehensiveBusinessTests } from "./useComprehensiveBusinessTests";

interface TestExecution {
  id: string;
  test_suite: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string;
  end_time?: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  error_message?: string;
  created_by?: string;
  created_at: string;
}

interface TestResult {
  id: string;
  execution_id: string;
  test_name: string;
  test_category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  created_at: string;
}

interface IndividualTest {
  name: string;
  category: string;
  description: string;
  fn: () => Promise<{ success: boolean; message: string; details?: any }>;
}

export const useRealTestExecution = () => {
  const [testExecutions, setTestExecutions] = useState<TestExecution[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const { toast } = useToast();
  
  // Use comprehensive business test suite (145+ tests)
  const { getAllTestSuites } = useComprehensiveBusinessTests();

  // Get all available tests organized by suite  
  const availableTests = getAllTestSuites;

  // Real-time subscription setup with better error handling
  useEffect(() => {
    let executionChannel: any;
    let resultChannel: any;
    let retryCount = 0;
    const maxRetries = 3;

    const setupRealTimeSubscriptions = () => {
      try {
        console.log('🔄 Setting up real-time test subscriptions...');
        
        // Subscribe to test executions
        executionChannel = supabase
          .channel(`test-executions-${Date.now()}`, {
            config: {
              broadcast: { self: false },
              presence: { key: 'test-monitor' }
            }
          })
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'test_executions' },
            (payload) => {
              console.log('✅ New test execution:', payload.new);
              setTestExecutions(prev => [payload.new as TestExecution, ...prev]);
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'test_executions' },
            (payload) => {
              console.log('🔄 Updated test execution:', payload.new);
              setTestExecutions(prev => 
                prev.map(exec => exec.id === payload.new.id ? payload.new as TestExecution : exec)
              );
            }
          )
          .subscribe((status) => {
            console.log('📡 Test executions subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              retryCount = 0;
            } else if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
              console.log('⚠️ Retrying subscription...');
              retryCount++;
              setTimeout(setupRealTimeSubscriptions, 1000 * retryCount);
            } else {
              setIsConnected(false);
            }
          });

        // Subscribe to test results
        resultChannel = supabase
          .channel(`test-results-${Date.now()}`)
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'test_results' },
            (payload) => {
              console.log('✅ New test result:', payload.new);
              setTestResults(prev => [payload.new as TestResult, ...prev]);
            }
          )
          .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'test_results' },
            (payload) => {
              console.log('🔄 Updated test result:', payload.new);
              setTestResults(prev => 
                prev.map(result => result.id === payload.new.id ? payload.new as TestResult : result)
              );
            }
          )
          .subscribe((status) => {
            console.log('📡 Test results subscription status:', status);
          });
      } catch (error) {
        console.error('❌ Error setting up real-time subscriptions:', error);
        setIsConnected(false);
      }
    };

    setupRealTimeSubscriptions();

    return () => {
      if (executionChannel) supabase.removeChannel(executionChannel);
      if (resultChannel) supabase.removeChannel(resultChannel);
    };
  }, []);

  // Load initial data with validation
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        console.log('📊 Loading initial test data...');
        
        const [executionsResponse, resultsResponse] = await Promise.all([
          supabase.from('test_executions').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('test_results').select('*').order('created_at', { ascending: false }).limit(200)
        ]);

        if (executionsResponse.error) {
          console.error('❌ Error loading executions:', executionsResponse.error);
          throw executionsResponse.error;
        }

        if (resultsResponse.error) {
          console.error('❌ Error loading results:', resultsResponse.error);
          throw resultsResponse.error;
        }

        // Load all executions and results without filtering to display real, complete data
        const allExecutions = executionsResponse.data || [];
        const allResults = resultsResponse.data || [];

        console.log(`✅ Loaded ${allExecutions.length} executions, ${allResults.length} results`);
        setTestExecutions(allExecutions as TestExecution[]);
        setTestResults(allResults as TestResult[]);

      } catch (error) {
        console.error('❌ Error loading test data:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load test data. Please refresh.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  // Connection status for UI
  const connectionStatus = isConnected ? 'connected' : 'disconnected';

  // Run individual test
  const runIndividualTest = useCallback(async (testSuite: string, testName: string) => {
    const tests = availableTests[testSuite];
    const test = tests?.find(t => t.name === testName);
    
    if (!test) {
      toast({
        title: "Test Not Found",
        description: `Cannot find test: ${testName}`,
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`🚀 Running individual test: ${testSuite} > ${testName}`);
      
      // Create execution record
      const { data: execution } = await supabase
        .from('test_executions')
        .insert({
          test_suite: `${testSuite} - Individual`,
          status: 'running',
          total_tests: 1,
          passed_tests: 0,
          failed_tests: 0
        })
        .select()
        .single();

      if (!execution) throw new Error('Failed to create test execution');

      // Create test result record
      const { data: testResult } = await supabase
        .from('test_results')
        .insert({
          execution_id: execution.id,
          test_name: test.name,
          test_category: test.category,
          status: 'running'
        })
        .select()
        .single();

      const startTime = Date.now();
      
      try {
        const result = await test.fn();
        const duration = Date.now() - startTime;
        
        // Update test result
        await supabase.from('test_results').update({
          status: result.success ? 'passed' : 'failed',
          duration_ms: duration,
          error_message: result.success ? undefined : result.message
        }).eq('id', testResult.id);
        
        // Update execution
        await supabase.from('test_executions').update({
          status: result.success ? 'completed' : 'failed',
          end_time: new Date().toISOString(),
          passed_tests: result.success ? 1 : 0,
          failed_tests: result.success ? 0 : 1,
          error_message: result.success ? undefined : result.message
        }).eq('id', execution.id);

        toast({
          title: result.success ? "Test Passed" : "Test Failed",
          description: result.message,
          variant: result.success ? "default" : "destructive",
        });
        
      } catch (error: any) {
        const duration = Date.now() - startTime;
        
        await supabase.from('test_results').update({
          status: 'failed',
          duration_ms: duration,
          error_message: error.message,
          stack_trace: error.stack
        }).eq('id', testResult.id);
        
        await supabase.from('test_executions').update({
          status: 'failed',
          end_time: new Date().toISOString(),
          passed_tests: 0,
          failed_tests: 1,
          error_message: error.message
        }).eq('id', execution.id);

        toast({
          title: "Test Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error running individual test:', error);
      toast({
        title: "Test Execution Error",
        description: "Failed to execute test. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, availableTests]);

  // Run full test suite
  const runTestSuite = useCallback(async (testSuite: string) => {
    const tests = availableTests[testSuite];
    if (!tests) {
      toast({
        title: "Test Suite Not Found",
        description: `Cannot find test suite: ${testSuite}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Create execution record
      const { data: execution } = await supabase
        .from('test_executions')
        .insert({
          test_suite: testSuite,
          status: 'running',
          total_tests: tests.length,
          passed_tests: 0,
          failed_tests: 0
        })
        .select()
        .single();

      if (!execution) throw new Error('Failed to create test execution');

      let passedTests = 0;
      let failedTests = 0;

      // Run all tests sequentially
      for (const test of tests) {
        const { data: testResult } = await supabase
          .from('test_results')
          .insert({
            execution_id: execution.id,
            test_name: test.name,
            test_category: test.category,
            status: 'running'
          })
          .select()
          .single();

        const startTime = Date.now();
        
        try {
          const result = await test.fn();
          const duration = Date.now() - startTime;
          
          await supabase.from('test_results').update({
            status: result.success ? 'passed' : 'failed',
            duration_ms: duration,
            error_message: result.success ? undefined : result.message
          }).eq('id', testResult.id);
          
          if (result.success) {
            passedTests++;
          } else {
            failedTests++;
          }
        } catch (error: any) {
          const duration = Date.now() - startTime;
          
          await supabase.from('test_results').update({
            status: 'failed',
            duration_ms: duration,
            error_message: error.message,
            stack_trace: error.stack
          }).eq('id', testResult.id);
          
          failedTests++;
        }
      }

      // Update execution with final results
      await supabase.from('test_executions').update({
        status: failedTests === 0 ? 'completed' : 'failed',
        end_time: new Date().toISOString(),
        passed_tests: passedTests,
        failed_tests: failedTests
      }).eq('id', execution.id);

      toast({
        title: "Test Suite Complete",
        description: `${passedTests}/${tests.length} tests passed`,
        variant: failedTests === 0 ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('Error running test suite:', error);
      toast({
        title: "Test Suite Error",
        description: "Failed to execute test suite. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, availableTests]);

  return {
    testExecutions,
    testResults,
    isLoading,
    isConnected,
    connectionStatus: isConnected ? 'connected' : 'disconnected',
    availableTests,
    runIndividualTest,
    runTestSuite
  };
};