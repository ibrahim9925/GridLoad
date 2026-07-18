// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Database,
  Users
} from "lucide-react";
import { useRealBusinessTests } from "@/hooks/useRealBusinessTests";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
  duration?: number;
  testName?: string;
}

const RealTestRunner: React.FC = () => {
  const { getAllTestSuites, runIndividualTest, runTestSuite, isRunning } = useRealBusinessTests();
  const { toast } = useToast();
  
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    executionTime: 0
  });

  const testSuites = getAllTestSuites();

  useEffect(() => {
    // Calculate overall statistics
    const allResults = Object.values(testResults).flat();
    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const executionTime = allResults.reduce((sum, r) => sum + (r.duration || 0), 0);

    setOverallStats({ totalTests, passedTests, failedTests, executionTime });
  }, [testResults]);

  const handleRunSingleTest = async (suiteName: string, test: any) => {
    const testKey = `${suiteName}-${test.name}`;
    setRunningTest(testKey);

    try {
      const result = await runIndividualTest(test);
      
      setTestResults(prev => ({
        ...prev,
        [suiteName]: [
          ...(prev[suiteName] || []).filter(r => r.testName !== test.name),
          { ...result, testName: test.name }
        ]
      }));

      toast({
        title: result.success ? "Test Passed" : "Test Failed",
        description: `${test.name}: ${result.message}`,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Test Error",
        description: `${test.name}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setRunningTest(null);
    }
  };

  const handleRunTestSuite = async (suiteName: string) => {
    const tests = testSuites[suiteName];
    if (!tests) return;

    setRunningTest(suiteName);
    
    try {
      const results = await runTestSuite(suiteName, tests);
      setTestResults(prev => ({
        ...prev,
        [suiteName]: results
      }));
    } catch (error: any) {
      toast({
        title: "Suite Error",
        description: `${suiteName}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setRunningTest(null);
    }
  };

  const handleRunAllTests = async () => {
    setRunningTest('ALL');
    setTestResults({});

    try {
      const allResults: Record<string, TestResult[]> = {};
      
      for (const [suiteName, tests] of Object.entries(testSuites)) {
        const results = await runTestSuite(suiteName, tests);
        allResults[suiteName] = results;
      }
      
      setTestResults(allResults);
      
      const totalTests = Object.values(allResults).flat().length;
      const passed = Object.values(allResults).flat().filter(r => r.success).length;
      
      toast({
        title: "All Tests Complete",
        description: `${passed}/${totalTests} tests passed`,
        variant: passed === totalTests ? "default" : "destructive"
      });
    } finally {
      setRunningTest(null);
    }
  };

  const toggleSuiteExpansion = (suiteName: string) => {
    setExpandedSuites(prev => ({
      ...prev,
      [suiteName]: !prev[suiteName]
    }));
  };

  const getSuiteIcon = (suiteName: string) => {
    switch (suiteName) {
      case 'Critical Infrastructure': return <Database className="h-4 w-4" />;
      case 'Product Management': return <Target className="h-4 w-4" />;
      case 'Customer Management': return <Users className="h-4 w-4" />;
      case 'Staff Management': return <Users className="h-4 w-4" />;
      case 'Sales Workflows': return <Zap className="h-4 w-4" />;
      case 'Payment Systems': return <AlertTriangle className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  const getTestStatusIcon = (result?: TestResult) => {
    if (!result) return <Clock className="h-4 w-4 text-gray-400" />;
    return result.success 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800'; 
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Real Business Logic Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{overallStats.totalTests}</div>
              <div className="text-sm text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallStats.passedTests}</div>
              <div className="text-sm text-muted-foreground">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallStats.failedTests}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(overallStats.executionTime / 1000).toFixed(2)}s</div>
              <div className="text-sm text-muted-foreground">Runtime</div>
            </div>
          </div>
          
          {overallStats.totalTests > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {overallStats.passedTests}/{overallStats.totalTests}</span>
                <span>{((overallStats.passedTests / overallStats.totalTests) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(overallStats.passedTests / overallStats.totalTests) * 100} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handleRunAllTests} 
              disabled={isRunning || runningTest === 'ALL'}
              className="flex-1"
            >
              {runningTest === 'ALL' ? 'Running All Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setTestResults({})}
              disabled={isRunning}
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Suites */}
      <div className="space-y-4">
        {Object.entries(testSuites).map(([suiteName, tests]) => {
          const suiteResults = testResults[suiteName] || [];
          const passed = suiteResults.filter(r => r.success).length;
          const total = tests.length;
          const executed = suiteResults.length;
          
          return (
            <Card key={suiteName}>
              <Collapsible
                open={expandedSuites[suiteName]}
                onOpenChange={() => toggleSuiteExpansion(suiteName)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getSuiteIcon(suiteName)}
                        <div>
                          <CardTitle className="text-lg">{suiteName}</CardTitle>
                          <div className="text-sm text-muted-foreground">
                            {executed > 0 ? `${passed}/${executed} passed` : `${total} tests available`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunTestSuite(suiteName);
                          }}
                          disabled={isRunning || runningTest === suiteName}
                        >
                          {runningTest === suiteName ? 'Running...' : 'Run Suite'}
                        </Button>
                        {expandedSuites[suiteName] ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {tests.map((test, index) => {
                          const result = suiteResults.find(r => r.testName === test.name);
                          const testKey = `${suiteName}-${test.name}`;
                          const isTestRunning = runningTest === testKey;
                          
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {getTestStatusIcon(result)}
                                <div className="flex-1">
                                  <div className="font-medium">{test.name}</div>
                                  <div className="text-sm text-muted-foreground">{test.description}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={getPriorityColor(test.priority)}>
                                      {test.priority}
                                    </Badge>
                                    <Badge variant="outline">{test.category}</Badge>
                                    {result && (
                                      <span className="text-xs text-muted-foreground">
                                        {result.duration ? `${result.duration}ms` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRunSingleTest(suiteName, test)}
                                  disabled={isRunning || isTestRunning}
                                >
                                  {isTestRunning ? 'Running...' : 'Run'}
                                </Button>
                                
                                {result && (
                                  <div className="text-right max-w-xs">
                                    <div className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                      {result.message}
                                    </div>
                                    {result.errors && result.errors.length > 0 && (
                                      <div className="text-xs text-red-500 mt-1">
                                        {result.errors.join(', ')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RealTestRunner;