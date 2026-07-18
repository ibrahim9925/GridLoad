// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BusinessTest, TestResult } from './useBusinessTestTypes';

interface TestExecution {
  id: string;
  test_suite: string;
  start_time: string;
  end_time?: string;
  status: string; // Make this flexible to handle any status from DB
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  duration_ms?: number;
  created_at: string;
  created_by: string;
  error_message?: string;
}

interface TestResultRecord {
  id: string;
  execution_id: string;
  test_name: string;
  test_category: string;
  status: string;
  duration_ms: number;
  error_message?: string;
  stack_trace?: string;
  created_at: string;
}

/**
 * PHASE 3: Real test results integration - connects mock test dashboard to actual test runs
 */
export const useRealTestResultsIntegration = () => {
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [results, setResults] = useState<TestResultRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load real test data from database
  const loadTestData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [executionsResult, resultsResult] = await Promise.all([
        supabase
          .from('test_executions')
          .select('*')
          .order('start_time', { ascending: false })
          .limit(50),
        supabase
          .from('test_results')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200)
      ]);

      if (executionsResult.data) {
        setExecutions(executionsResult.data);
      }

      if (resultsResult.data) {
        setResults(resultsResult.data);
      }
    } catch (error) {
      console.error('Failed to load test data:', error);
      toast({
        title: "Failed to load test data",
        description: "Using mock data instead",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Store test execution results
  const storeTestExecution = useCallback(async (
    testSuite: string, 
    tests: BusinessTest[], 
    results: TestResult[]
  ): Promise<string | null> => {
    try {
      const passedTests = results.filter(r => r.success).length;
      const failedTests = results.length - passedTests;
      const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

      const { data: execution, error: executionError } = await supabase
        .from('test_executions')
        .insert({
          test_suite: testSuite,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: failedTests > 0 ? 'failed' : 'completed',
          total_tests: results.length,
          passed_tests: passedTests,
          failed_tests: failedTests,
          created_by: null // Allow null for system-generated tests
        })
        .select()
        .single();

      if (executionError) throw executionError;

      // Store individual test results
      const testResultRecords = results.map(result => ({
        execution_id: execution.id,
        test_name: result.testName || 'Unknown Test',
        test_category: result.category || 'General',
        status: result.success ? 'passed' : 'failed',
        duration_ms: result.duration || 0,
        error_message: result.error || null
      }));

      const { error: resultsError } = await supabase
        .from('test_results')
        .insert(testResultRecords);

      if (resultsError) throw resultsError;

      // Refresh local data
      await loadTestData();

      return execution.id;
    } catch (error) {
      console.error('Failed to store test execution:', error);
      toast({
        title: "Failed to store test results",
        description: "Test results were not saved to database",
        variant: "destructive"
      });
      return null;
    }
  }, [loadTestData, toast]);

  // Get failure statistics for dashboard
  const getFailureStats = useCallback(() => {
    const recentResults = results.filter(r => {
      const resultDate = new Date(r.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return resultDate > oneDayAgo;
    });

    const failures = recentResults.filter(r => r.status === 'failed');
    
    return {
      totalFailures: failures.length,
      criticalFailures: 0, // Would need to store priority in DB
      highPriorityFailures: 0, // Would need to store priority in DB  
      recentFailures: failures.filter(f => {
        const resultDate = new Date(f.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return resultDate > oneHourAgo;
      }).length,
      frequentFailures: failures.reduce((acc, failure) => {
        acc[failure.test_name] = (acc[failure.test_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [results]);

  // Convert database results to dashboard format
  const getFormattedFailures = useCallback(() => {
    return results
      .filter(r => r.status === 'failed')
      .map(r => ({
        id: r.id,
        testName: r.test_name,
        suiteName: r.test_category,
        module: r.test_category,
        category: r.test_category.toLowerCase(),
        priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
        message: r.error_message || 'Test failed',
        errors: r.error_message ? [r.error_message] : [],
        details: {},
        duration: r.duration_ms,
        timestamp: new Date(r.created_at),
        failureCount: 1
      }));
  }, [results]);

  // Initialize data on mount
  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  return {
    executions,
    results,
    isLoading,
    loadTestData,
    storeTestExecution,
    getFailureStats,
    getFormattedFailures
  };
};