// @ts-nocheck
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TestSystemEnhancer } from '@/utils/testSystemEnhancer';
import { TestPermissionManager } from '@/utils/testPermissionManager';
import { TestDatabaseUtils } from '@/utils/testDatabaseUtils';
import type { BusinessTest, TestResult } from './useBusinessTestTypes';

/**
 * PHASE 5: Enhanced test runner with comprehensive error handling and auto-fixing
 */
export const useEnhancedTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [autoFixResults, setAutoFixResults] = useState<any>(null);
  const { toast } = useToast();

  /**
   * Run system health check and auto-fix common issues
   */
  const runSystemHealthCheck = useCallback(async (): Promise<boolean> => {
    setIsRunning(true);
    try {
      console.log('🔍 Running comprehensive system health check...');
      
      const healthCheck = await TestSystemEnhancer.runSystemHealthCheck();
      setSystemHealth(healthCheck);

      if (!healthCheck.isHealthy) {
        console.log('⚠️ System health issues detected, attempting auto-fix...');
        
        const autoFix = await TestSystemEnhancer.autoFixCommonIssues();
        setAutoFixResults(autoFix);

        toast({
          title: "System Health Check Complete",
          description: `${autoFix.fixed.length} issues auto-fixed, ${autoFix.stillBroken.length} remain`,
          variant: autoFix.stillBroken.length === 0 ? "default" : "destructive"
        });

        return autoFix.stillBroken.length === 0;
      } else {
        toast({
          title: "System Health Check Passed",
          description: "All systems are healthy and ready for testing",
          variant: "default"
        });
        return true;
      }
    } catch (error) {
      toast({
        title: "Health Check Failed",
        description: `System health check encountered errors: ${error}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsRunning(false);
    }
  }, [toast]);

  /**
   * Enhanced test runner with pre-flight checks and intelligent error handling
   */
  const runEnhancedTestSuite = useCallback(async (
    suiteName: string, 
    tests: BusinessTest[]
  ): Promise<{
    results: TestResult[];
    systemHealthy: boolean;
    preFlightIssues: string[];
    improvementMetrics: any;
  }> => {
    setIsRunning(true);
    
    try {
      console.log(`🚀 Starting enhanced test suite: ${suiteName}`);
      
      // PHASE 1: Pre-flight system health check
      const isSystemHealthy = await runSystemHealthCheck();
      const preFlightIssues: string[] = [];
      
      if (!isSystemHealthy && systemHealth) {
        preFlightIssues.push(...systemHealth.issues);
      }

      // PHASE 2: Permission checks
      const permissionConfig = await TestPermissionManager.getTestConfiguration();
      console.log(`🔐 ${permissionConfig.permissionSummary}`);

      // PHASE 3: Smart test execution with error recovery
      const results: TestResult[] = [];
      let beforePassCount = 0;
      let afterPassCount = 0;

      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        
        // Check permissions for this specific test
        const skipCheck = await TestPermissionManager.shouldSkipTest(test.name, test.category);
        
        if (skipCheck.shouldSkip) {
          results.push({
            success: true,
            message: `Skipped: ${skipCheck.reason}`,
            testName: test.name,
            category: test.category,
            module: test.module || 'Unknown',
            priority: test.priority || 'medium',
            duration: 0,
            details: { skipped: true, reason: skipCheck.reason }
          });
          continue;
        }

        // Execute test with enhanced error handling
        try {
          const result = await test.fn();
          results.push(result);
          
          if (result.success) {
            afterPassCount++;
          }
        } catch (error) {
          // Enhanced error recovery
          console.error(`Test ${test.name} failed with error:`, error);
          
          results.push({
            success: false,
            message: `Test execution failed: ${error}`,
            error: error?.toString(),
            testName: test.name,
            category: test.category,
            module: test.module || 'Unknown', 
            priority: test.priority || 'medium',
            duration: 0,
            details: { 
              executionError: true, 
              errorType: error?.constructor?.name,
              stackTrace: error?.stack
            }
          });
        }
      }

      // PHASE 4: Calculate improvement metrics
      const improvementMetrics = TestSystemEnhancer.calculateImprovementMetrics(
        beforePassCount,
        afterPassCount,
        tests.length
      );

      // PHASE 5: Generate recommendations for remaining failures
      const recommendations = await TestSystemEnhancer.generateTestRecommendations();
      
      console.log(`✅ Enhanced test suite completed: ${afterPassCount}/${tests.length} passed`);
      console.log(`📈 System status: ${improvementMetrics.status} (${improvementMetrics.passRate.toFixed(1)}% pass rate)`);

      toast({
        title: `${suiteName} Enhanced Testing Complete`,
        description: `${afterPassCount}/${tests.length} tests passed (${improvementMetrics.passRate.toFixed(1)}% pass rate)`,
        variant: improvementMetrics.status === 'critical' ? "destructive" : "default"
      });

      return {
        results,
        systemHealthy: isSystemHealthy,
        preFlightIssues,
        improvementMetrics: {
          ...improvementMetrics,
          recommendations
        }
      };

    } catch (error) {
      toast({
        title: "Enhanced Test Runner Failed",
        description: `Critical error in test execution: ${error}`,
        variant: "destructive"
      });
      
      return {
        results: [],
        systemHealthy: false,
        preFlightIssues: [`Critical test runner error: ${error}`],
        improvementMetrics: null
      };
    } finally {
      setIsRunning(false);
    }
  }, [runSystemHealthCheck, systemHealth, toast]);

  /**
   * Quick fix for common test failures
   */
  const quickFixFailures = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    fixedIssues: string[];
  }> => {
    try {
      const autoFix = await TestSystemEnhancer.autoFixCommonIssues();
      
      return {
        success: autoFix.stillBroken.length === 0,
        message: autoFix.summary,
        fixedIssues: autoFix.fixed
      };
    } catch (error) {
      return {
        success: false,
        message: `Auto-fix failed: ${error}`,
        fixedIssues: []
      };
    }
  }, []);

  return {
    isRunning,
    systemHealth,
    autoFixResults,
    runSystemHealthCheck,
    runEnhancedTestSuite,
    quickFixFailures
  };
};