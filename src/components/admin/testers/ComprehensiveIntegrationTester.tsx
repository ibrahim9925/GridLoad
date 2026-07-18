// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, Clock, Zap, TrendingUp, Shield, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedWorkflowTesting } from "@/hooks/useEnhancedWorkflowTesting";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const ComprehensiveIntegrationTester = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [regressionResults, setRegressionResults] = useState<any[]>([]);
  const [currentTest, setCurrentTest] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();
  const { 
    runIntegrationTestSuite,
    runRegressionTests,
    performanceMetrics,
    isLoading: workflowLoading
  } = useEnhancedWorkflowTesting();

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults({});
    setRegressionResults([]);
    
    try {
      // Step 1: Authentication verification
      setCurrentTest("Authentication Verification");
      setProgress(10);
      
      if (!isAuthenticated || !user || userRole !== 'admin') {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please ensure you're logged in as an admin to run tests.",
        });
        setIsRunning(false);
        return;
      }

      // Step 2: Ensure test data availability
      setCurrentTest("Test Data Preparation");
      setProgress(20);
      
      await ensureTestData({ 
        customerCount: 5, 
        productCount: 10, 
        staffCount: 3, 
        supplierCount: 3, 
        leadCount: 5 
      });

      // Step 3: Run integration test suite
      setCurrentTest("Integration Test Suite");
      setProgress(30);
      
      const integrationResults = await runIntegrationTestSuite();
      setTestResults(integrationResults);
      setProgress(70);

      // Step 4: Run regression tests
      setCurrentTest("Regression Testing");
      setProgress(80);
      
      const regressionTestResults = await runRegressionTests();
      setRegressionResults(regressionTestResults);
      setProgress(90);

      // Step 5: Complete
      setCurrentTest("Test Completion");
      setProgress(100);

      const totalTests = Object.keys(integrationResults).length + regressionTestResults.length;
      const passedTests = Object.values(integrationResults).filter((r: any) => r.success).length + 
                         regressionTestResults.filter(r => r.success).length;

      toast({
        title: "Comprehensive Testing Complete",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      console.error("Comprehensive testing failed:", error);
      toast({
        variant: "destructive",
        title: "Testing Failed",
        description: error.message || "Unknown error occurred"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest("");
    }
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <Clock className="h-4 w-4 text-gray-400" />;
    return status 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="outline">Pending</Badge>;
    return status
      ? <Badge variant="default" className="bg-green-100 text-green-800">Passed</Badge>
      : <Badge variant="destructive">Failed</Badge>;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "";
    return `${duration}ms`;
  };

  return (
    <div className="space-y-6">
      {/* Main Test Runner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Comprehensive Integration Testing Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{currentTest}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <div className="space-y-2">
            {!(isAuthenticated && userRole === 'admin') && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span>Authentication required for comprehensive testing</span>
              </div>
            )}
            
            <Button 
              onClick={runComprehensiveTests}
              disabled={isRunning || !(isAuthenticated && userRole === 'admin') || workflowLoading}
              className="w-full"
              size="lg"
            >
              {isRunning ? "Running Comprehensive Tests..." : "Run Complete Integration Test Suite"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Test Coverage:</strong> End-to-end workflows, performance benchmarks, regression testing, and cross-module validation</p>
            <p>This comprehensive suite validates the entire system for production readiness.</p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Test Results */}
      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integration Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(testResults).map(([key, result]: [string, any]) => {
                const labels: { [key: string]: string } = {
                  saleToInstallationWorkflow: "Sale → Installation Workflow",
                  saleToWarrantyWorkflow: "Sale → Warranty Workflow", 
                  paymentScheduleAutomation: "Payment Schedule Automation",
                  stockMovementTracking: "Stock Movement Tracking",
                  commissionCalculation: "Commission Calculation",
                  crossModuleConsistency: "Cross-Module Consistency",
                  performanceBenchmarks: "Performance Benchmarks"
                };

                return (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result?.success)}
                      <div className="flex flex-col">
                        <span className="font-medium">{labels[key] || key}</span>
                        {result?.message && (
                          <span className="text-xs text-muted-foreground">{result.message}</span>
                        )}
                        {result?.duration && (
                          <span className="text-xs text-blue-600">{formatDuration(result.duration)}</span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(result?.success)}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">{performanceMetrics.dbQueryTime}ms</div>
                <div className="text-sm text-muted-foreground">DB Query Time</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">{performanceMetrics.workflowExecutionTime}ms</div>
                <div className="text-sm text-muted-foreground">Workflow Execution</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-orange-600">{performanceMetrics.concurrentTransactions}ms</div>
                <div className="text-sm text-muted-foreground">Concurrent Transactions</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-purple-600">{performanceMetrics.memoryUsage}ms</div>
                <div className="text-sm text-muted-foreground">Bulk Operations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regression Test Results */}
      {regressionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Regression Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regressionResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.success)}
                    <div className="flex flex-col">
                      <span className="font-medium">{result.message}</span>
                      {result.errors && result.errors.length > 0 && (
                        <span className="text-xs text-red-600">{result.errors[0]}</span>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(result.success)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Data Status */}
      {testDataStatus.availability && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test Data Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(testDataStatus.availability).map(([key, count]) => (
                <div key={key} className="text-center p-2 border rounded">
                  <div className="text-lg font-semibold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{key}</div>
                </div>
              ))}
            </div>
            {testDataStatus.lastSeeded && (
              <p className="text-xs text-muted-foreground mt-2">
                Last seeded: {new Date(testDataStatus.lastSeeded).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComprehensiveIntegrationTester;