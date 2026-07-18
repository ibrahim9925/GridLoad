// @ts-nocheck
import { useComprehensiveBusinessTests } from "@/hooks/useComprehensiveBusinessTests";
import type { BusinessTest, TestResult } from "@/hooks/useBusinessTestTypes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Play, PlayCircle, CheckCircle, XCircle, Users, ShoppingCart, Package, Briefcase, CreditCard, Truck, Wrench, BarChart3, AlertCircle, Clock, Zap, Building, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ComprehensiveBusinessTestRunner() {
  const { getAllTestSuites, runIndividualTest, runTestSuite, isRunning, testProgress } = useComprehensiveBusinessTests();
  const { toast } = useToast();
  const testSuites = getAllTestSuites;
  
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const handleRunSingleTest = async (test: BusinessTest, suiteName: string) => {
    setRunningTest(`${suiteName}-${test.name}`);
    const result = await runIndividualTest(test);
    
    setTestResults(prev => ({
      ...prev,
      [suiteName]: [
        ...(prev[suiteName] || []).filter(r => r.testName !== test.name),
        result
      ]
    }));
    setRunningTest(null);
  };

  const handleRunTestSuite = async (suiteName: string) => {
    const suite = testSuites[suiteName] as BusinessTest[];
    if (!suite || suite.length === 0) {
      toast({
        title: "No Tests Found", 
        description: `No tests found for suite: ${suiteName}`,
        variant: "destructive"
      });
      return;
    }

    setRunningTest(suiteName);
    const results = await runTestSuite(suiteName, suite);
    
    setTestResults(prev => ({
      ...prev,
      [suiteName]: results
    }));
    setRunningTest(null);
  };

  const handleRunAllTests = async () => {
    setRunningTest("all");
    
    for (const [suiteName, tests] of Object.entries(testSuites)) {
      const results = await runTestSuite(suiteName, tests as BusinessTest[]);
      setTestResults(prev => ({
        ...prev,
        [suiteName]: results
      }));
    }
    
    setRunningTest(null);
    toast({
      title: "All Tests Complete",
      description: "All test suites have been executed",
    });
  };

  const handleClearResults = () => {
    setTestResults({});
    toast({
      title: "Results Cleared",
      description: "All test results have been cleared",
    });
  };

  const toggleSuiteExpansion = (suiteName: string) => {
    setExpandedSuites(prev => ({
      ...prev,
      [suiteName]: !prev[suiteName]
    }));
  };

  // Helper functions for icons and colors
  const getSuiteIcon = (suiteName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'Product Management': Package,
      'Staff Management': Users,
      'Customer Management': Building,
      'Sales Workflows': ShoppingCart,
      'Payment Systems': CreditCard,
      'Purchase Orders': Briefcase,
      'Installation Management': Wrench,
      'Inventory': BarChart3
    };
    const IconComponent = iconMap[suiteName] || Target;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTestStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-blue-100 text-blue-800'
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Product Management': 'bg-purple-100 text-purple-800',
      'Staff Management': 'bg-blue-100 text-blue-800',
      'Customer Management': 'bg-green-100 text-green-800',
      'Sales Workflows': 'bg-orange-100 text-orange-800',
      'Payment Systems': 'bg-red-100 text-red-800',
      'Purchase Orders': 'bg-indigo-100 text-indigo-800',
      'Installation Management': 'bg-yellow-100 text-yellow-800',
      'Inventory': 'bg-pink-100 text-pink-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  };

  const allResults = Object.values(testResults).flat();
  const stats = {
    total: Object.values(testSuites).reduce((acc, suite) => acc + (suite as BusinessTest[]).length, 0),
    passed: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => !r.success).length,
    runtime: allResults.reduce((acc, r) => acc + (r.duration || 0), 0)
  };
  
  const current = allResults.length;
  const progress = stats.total > 0 ? (current / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comprehensive Business Test Suite</h2>
          <p className="text-muted-foreground">
            Run comprehensive tests across all business modules to validate functionality
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Run All Tests
          </Button>
          <Button 
            onClick={handleClearResults}
            variant="outline"
            disabled={isRunning || Object.keys(testResults).length === 0}
          >
            Clear Results
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      {Object.keys(testResults).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.runtime}ms</div>
                <div className="text-sm text-muted-foreground">Total Runtime</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Indicator */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <div>Progress: {current}/{stats.total} tests completed</div>
                <div>{Math.round(progress)}%</div>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Suites */}
      <div className="space-y-4">
        {Object.entries(testSuites).length > 0 ? (
          Object.entries(testSuites).map(([suiteName, tests]) => {
            const testsArray = tests as BusinessTest[];
            const suiteResults = testResults[suiteName] || [];
            const isExpanded = expandedSuites[suiteName];
            const isSuiteRunning = runningTest === suiteName;
            
            const suiteProgress = testsArray.length > 0 
              ? (suiteResults.length / testsArray.length) * 100 
              : 0;
            
            const passedTests = suiteResults.filter(r => r.success).length;
            const failedTests = suiteResults.filter(r => !r.success).length;

            return (
              <Card key={suiteName} className="w-full">
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleSuiteExpansion(suiteName)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {getSuiteIcon(suiteName)}
                          <div className="text-left">
                            <CardTitle className="text-lg">{suiteName}</CardTitle>
                            <CardDescription>
                              {testsArray.length} tests • {passedTests} passed • {failedTests} failed
                            </CardDescription>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{testsArray.length} tests</Badge>
                          {suiteResults.length > 0 && (
                            <Badge 
                              variant={failedTests > 0 ? "destructive" : "default"}
                            >
                              {Math.round((passedTests / suiteResults.length) * 100)}% pass rate
                            </Badge>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunTestSuite(suiteName);
                            }}
                            disabled={isRunning}
                            size="sm"
                            variant="outline"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run Suite
                          </Button>
                        </div>
                      </div>
                      
                      {suiteProgress > 0 && (
                        <Progress value={suiteProgress} className="w-full mt-2" />
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {testsArray.map((test, testIndex) => {
                      const testResult = suiteResults.find(r => r.testName === test.name);
                      const isTestRunning = runningTest === `${suiteName}-${test.name}`;

                      return (
                        <div key={testIndex} className="border-t p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {testResult && getTestStatusIcon(testResult.success)}
                                <h4 className="font-medium">{test.name}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className={getPriorityColor(test.priority)}
                                >
                                  {test.priority}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={getCategoryColor(test.category)}
                                >
                                  {test.category}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">
                                {test.description}
                              </p>
                              
                              {testResult && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline">
                                      {testResult.duration}ms
                                    </Badge>
                                    <span className={
                                      testResult.success 
                                        ? "text-green-600" 
                                        : "text-red-600"
                                    }>
                                      {testResult.message}
                                    </span>
                                  </div>
                                  
                                  {testResult.error && (
                                    <Alert variant="destructive">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertDescription>
                                        {testResult.error}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  
                                  {testResult.details && (
                                    <details className="text-sm">
                                      <summary className="cursor-pointer text-muted-foreground">
                                        View Details
                                      </summary>
                                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                                        {JSON.stringify(testResult.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <Button
                              onClick={() => handleRunSingleTest(test, suiteName)}
                              disabled={isRunning}
                              size="sm"
                              variant="outline"
                            >
                              {isTestRunning ? (
                                <>
                                  <Zap className="h-4 w-4 mr-1 animate-spin" />
                                  Running
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Run
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Test Suites Available</h3>
              <p className="text-muted-foreground">
                No test suites have been configured yet. Please check your test configuration.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ComprehensiveBusinessTestRunner;