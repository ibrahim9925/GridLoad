// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { databaseService } from "@/services/DatabaseService";
import { PlayCircle, StopCircle, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'running';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  status: 'idle' | 'running' | 'completed';
  progress: number;
}

const DatabaseTester = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const tables = ['products', 'customers', 'sales', 'leads', 'staff', 'expenses'] as const;

  const runConnectionTest = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const health = await databaseService.checkConnection();
      return {
        name: 'Connection Health',
        status: health.isConnected ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: health
      };
    } catch (error: any) {
      return {
        name: 'Connection Health',
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  };

  const runTableTest = async (table: string): Promise<TestResult[]> => {
    const tests: TestResult[] = [];

    // Test basic read operation
    try {
      const startTime = Date.now();
      const { data, error } = await databaseService.query(
        table as any,
        (query) => query.select('*').limit(1),
        { retries: 1 }
      );
      
      tests.push({
        name: `${table} - Read Test`,
        status: error ? 'failed' : 'passed',
        duration: Date.now() - startTime,
        error: error?.message,
        details: { recordCount: data?.length || 0 }
      });
    } catch (error: any) {
      tests.push({
        name: `${table} - Read Test`,
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }

    // Test count operation with proper type handling
    try {
      const startTime = Date.now();
      const { data, error } = await databaseService.query(
        table as any,
        (query) => query.select('*', { count: 'exact', head: true }),
        { retries: 1 }
      );
      
      tests.push({
        name: `${table} - Count Test`,
        status: error ? 'failed' : 'passed',
        duration: Date.now() - startTime,
        error: error?.message,
        details: { available: true }
      });
    } catch (error: any) {
      tests.push({
        name: `${table} - Count Test`,
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }

    return tests;
  };

  const runPerformanceTest = async (): Promise<TestResult[]> => {
    const tests: TestResult[] = [];
    
    // Test multiple concurrent queries
    try {
      const startTime = Date.now();
      const promises = tables.slice(0, 3).map(table =>
        databaseService.query(
          table,
          (query) => query.select('*').limit(5),
          { retries: 1 }
        )
      );
      
      await Promise.all(promises);
      
      tests.push({
        name: 'Concurrent Queries',
        status: 'passed',
        duration: Date.now() - startTime,
        details: { queryCount: promises.length }
      });
    } catch (error: any) {
      tests.push({
        name: 'Concurrent Queries',
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }

    // Test cache performance
    try {
      const startTime = Date.now();
      
      // First query (should hit database)
      await databaseService.query(
        'products',
        (query) => query.select('*').limit(1),
        { useCache: true, retries: 1 }
      );
      
      // Second query (should hit cache)
      await databaseService.query(
        'products',
        (query) => query.select('*').limit(1),
        { useCache: true, retries: 1 }
      );
      
      tests.push({
        name: 'Cache Performance',
        status: 'passed',
        duration: Date.now() - startTime,
        details: databaseService.getCacheStats()
      });
    } catch (error: any) {
      tests.push({
        name: 'Cache Performance',
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }

    return tests;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallProgress(0);
    setTestSuites([]);

    const suites: TestSuite[] = [
      { name: 'Connection Tests', tests: [], status: 'idle', progress: 0 },
      { name: 'Table Tests', tests: [], status: 'idle', progress: 0 },
      { name: 'Performance Tests', tests: [], status: 'idle', progress: 0 }
    ];

    setTestSuites([...suites]);

    try {
      // Run connection tests
      suites[0].status = 'running';
      setTestSuites([...suites]);
      
      const connectionTest = await runConnectionTest();
      suites[0].tests = [connectionTest];
      suites[0].status = 'completed';
      suites[0].progress = 100;
      setOverallProgress(33);
      setTestSuites([...suites]);

      // Run table tests
      suites[1].status = 'running';
      setTestSuites([...suites]);
      
      const allTableTests: TestResult[] = [];
      for (let i = 0; i < tables.length; i++) {
        const tableTests = await runTableTest(tables[i]);
        allTableTests.push(...tableTests);
        suites[1].progress = ((i + 1) / tables.length) * 100;
        setTestSuites([...suites]);
      }
      
      suites[1].tests = allTableTests;
      suites[1].status = 'completed';
      setOverallProgress(66);
      setTestSuites([...suites]);

      // Run performance tests
      suites[2].status = 'running';
      setTestSuites([...suites]);
      
      const performanceTests = await runPerformanceTest();
      suites[2].tests = performanceTests;
      suites[2].status = 'completed';
      suites[2].progress = 100;
      setOverallProgress(100);
      setTestSuites([...suites]);

    } catch (error) {
      console.error('Test suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Database Testing Suite</CardTitle>
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <StopCircle className="h-4 w-4" />
                Running Tests...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
        
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="w-full" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {testSuites.map((suite, suiteIndex) => (
          <div key={suite.name} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{suite.name}</h3>
              <Badge className={getStatusColor(suite.status)}>
                {suite.status}
              </Badge>
            </div>
            
            {suite.status === 'running' && (
              <Progress value={suite.progress} className="w-full" />
            )}
            
            <div className="space-y-2">
              {suite.tests.map((test, testIndex) => (
                <div key={`${suiteIndex}-${testIndex}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTestIcon(test.status)}
                    <div>
                      <p className="font-medium">{test.name}</p>
                      {test.error && (
                        <p className="text-sm text-red-600">{test.error}</p>
                      )}
                      {test.details && (
                        <p className="text-sm text-muted-foreground">
                          {JSON.stringify(test.details)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(test.status)}>
                      {test.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {test.duration}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {testSuites.length === 0 && !isRunning && (
          <Alert>
            <AlertDescription>
              Click "Run All Tests" to start comprehensive database testing including connection health, table operations, and performance benchmarks.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseTester;
