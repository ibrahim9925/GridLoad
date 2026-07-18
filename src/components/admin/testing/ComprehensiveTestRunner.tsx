// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Square, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ComprehensiveTestRunnerProps {
  availableTests: Record<string, any[]>;
  onRunTest: (testSuite: string, testName: string) => void;
  onRunTestSuite: (testSuite: string) => void;
  testResults: any[];
}

export const ComprehensiveTestRunner: React.FC<ComprehensiveTestRunnerProps> = ({
  availableTests,
  onRunTest,
  onRunTestSuite,
  testResults
}) => {
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const { toast } = useToast();

  const totalTests = Object.values(availableTests).reduce((sum, tests) => sum + tests.length, 0);

  const runAllTests = async () => {
    setIsRunningAll(true);
    const testSuites = Object.keys(availableTests);
    
    try {
      for (const suite of testSuites) {
        await onRunTestSuite(suite);
      }
      
      toast({
        title: "All Tests Complete",
        description: `Executed ${totalTests} tests across ${testSuites.length} suites`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Test Execution Error",
        description: "Some tests failed to complete",
        variant: "destructive",
      });
    } finally {
      setIsRunningAll(false);
    }
  };

  const runCriticalTests = async () => {
    const criticalTests = Object.entries(availableTests).flatMap(([suite, tests]) =>
      tests.filter(test => test.priority === 'critical').map(test => ({ suite, test }))
    );

    setIsRunningAll(true);
    try {
      for (const { suite, test } of criticalTests) {
        await onRunTest(suite, test.name);
      }
      
      toast({
        title: "Critical Tests Complete",
        description: `Executed ${criticalTests.length} critical tests`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Critical Test Error",
        description: "Some critical tests failed",
        variant: "destructive",
      });
    } finally {
      setIsRunningAll(false);
    }
  };

  const getTestSuiteProgress = (suiteName: string) => {
    const suiteTests = availableTests[suiteName] || [];
    const suiteResults = testResults.filter(result => 
      suiteTests.some(test => test.name === result.test_name)
    );
    
    if (suiteResults.length === 0) return 0;
    return Math.round((suiteResults.length / suiteTests.length) * 100);
  };

  const getSuitePassRate = (suiteName: string) => {
    const suiteTests = availableTests[suiteName] || [];
    const suiteResults = testResults.filter(result => 
      suiteTests.some(test => test.name === result.test_name)
    );
    
    if (suiteResults.length === 0) return 0;
    const passed = suiteResults.filter(r => r.status === 'passed').length;
    return Math.round((passed / suiteResults.length) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Comprehensive Test Runner</span>
          <Badge variant="outline">{totalTests} Tests Available</Badge>
        </CardTitle>
        <CardDescription>
          Execute the complete test suite with {totalTests} tests across {Object.keys(availableTests).length} categories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={runAllTests}
            disabled={isRunningAll}
            className="flex items-center gap-2"
          >
            {isRunningAll ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isRunningAll ? 'Running...' : `Run All ${totalTests} Tests`}
          </Button>
          
          <Button 
            variant="outline"
            onClick={runCriticalTests}
            disabled={isRunningAll}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Run Critical Tests Only
          </Button>
        </div>

        {/* Test Suite Overview */}
        <div className="space-y-4">
          <h4 className="font-semibold">Test Suites</h4>
          <div className="grid gap-4">
            {Object.entries(availableTests).map(([suiteName, tests]) => (
              <div key={suiteName} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">{suiteName}</h5>
                    <p className="text-sm text-muted-foreground">{tests.length} tests</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getSuitePassRate(suiteName)}% Pass Rate</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRunTestSuite(suiteName)}
                      disabled={runningTests.has(suiteName)}
                    >
                      {runningTests.has(suiteName) ? 'Running...' : 'Run Suite'}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getTestSuiteProgress(suiteName)}%</span>
                  </div>
                  <Progress value={getTestSuiteProgress(suiteName)} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};