// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Target,
  Bug,
  Download,
  RefreshCw
} from "lucide-react";
import { useRealTestResultsIntegration } from "@/hooks/useRealTestResultsIntegration";

interface TestFailure {
  id: string;
  testName: string;
  suiteName: string;
  module: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  errors: string[];
  details: any;
  duration: number;
  timestamp: Date;
  failureCount: number;
}

const TestFailuresDashboard: React.FC = () => {
  const { isLoading, getFormattedFailures, getFailureStats, loadTestData } = useRealTestResultsIntegration();
  const failures = getFormattedFailures();
  const [selectedFailure, setSelectedFailure] = useState<TestFailure | null>(null);

  // Optionally allow manual refresh
  useEffect(() => {
    // Ensure data is loaded on mount (hook already loads, this is a no-op if loaded)
    loadTestData();
  }, [loadTestData]);

  const criticalFailures = failures.filter(f => f.priority === 'critical');
  const highPriorityFailures = failures.filter(f => f.priority === 'high');
  const recentFailures = failures.filter(f => Date.now() - f.timestamp.getTime() < 3600000); // Last hour
  const frequentFailures = failures.filter(f => f.failureCount >= 3);

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-black',
      'low': 'bg-green-500 text-white'
    };
    return colorMap[priority] || 'bg-gray-500 text-white';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'products': 'bg-blue-100 text-blue-800',
      'staff': 'bg-purple-100 text-purple-800',
      'payments': 'bg-red-100 text-red-800',
      'sales': 'bg-orange-100 text-orange-800',
      'purchasing': 'bg-pink-100 text-pink-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  };

  const getFixSuggestion = (failure: TestFailure): string => {
    const suggestions: Record<string, string> = {
      'Product Creation Form Validation': 'Add form validation rules in the product creation component. Check cost_price > 0 and SKU uniqueness constraints.',
      'Staff Role Assignment': 'Staff management system appears broken. Check staff creation workflow and database permissions.',
      'Payment Recording Test': 'Payment dialog is not connected to payment processing. Fix PaymentDialog component integration.',
      'Complete Sales Workflow': 'Sales workflow missing prerequisites. Ensure customers and active sales reps exist.',
      'Purchase Order Workflow': 'PO workflow is too complex. Simplify the interface and reduce unnecessary steps.'
    };
    return suggestions[failure.testName] || 'Review test details and error messages for specific fix guidance.';
  };

  const exportFailureReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFailures: failures.length,
        criticalFailures: criticalFailures.length,
        highPriorityFailures: highPriorityFailures.length,
        recentFailures: recentFailures.length
      },
      failures: failures.map(f => ({
        testName: f.testName,
        module: f.module,
        priority: f.priority,
        message: f.message,
        errors: f.errors,
        failureCount: f.failureCount,
        fixSuggestion: getFixSuggestion(f)
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-failures-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Failure Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{criticalFailures.length}</div>
                <div className="text-sm text-muted-foreground">Critical Failures</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{highPriorityFailures.length}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{recentFailures.length}</div>
                <div className="text-sm text-muted-foreground">Recent (1h)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold text-purple-600">{frequentFailures.length}</div>
                <div className="text-sm text-muted-foreground">Frequent (3+)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alert */}
      {criticalFailures.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalFailures.length} critical system failures detected!</strong> 
            These issues prevent core business functions from working properly and require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={exportFailureReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Failure Report
        </Button>
        <Button onClick={() => loadTestData()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Failure Categories */}
      <Tabs defaultValue="critical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="critical">Critical ({criticalFailures.length})</TabsTrigger>
          <TabsTrigger value="high">High Priority ({highPriorityFailures.length})</TabsTrigger>
          <TabsTrigger value="frequent">Frequent ({frequentFailures.length})</TabsTrigger>
          <TabsTrigger value="all">All Failures ({failures.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="critical">
          <FailureList failures={criticalFailures} title="Critical System Failures" />
        </TabsContent>

        <TabsContent value="high">
          <FailureList failures={highPriorityFailures} title="High Priority Failures" />
        </TabsContent>

        <TabsContent value="frequent">
          <FailureList failures={frequentFailures} title="Frequently Failing Tests" />
        </TabsContent>

        <TabsContent value="all">
          <FailureList failures={failures} title="All Test Failures" />
        </TabsContent>
      </Tabs>

      {/* Detailed Failure Analysis */}
      {selectedFailure && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Detailed Analysis: {selectedFailure.testName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Module:</strong> {selectedFailure.module}
                </div>
                <div>
                  <strong>Priority:</strong> 
                  <Badge className={`ml-2 ${getPriorityColor(selectedFailure.priority)}`}>
                    {selectedFailure.priority.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <strong>Failure Count:</strong> {selectedFailure.failureCount} times
                </div>
                <div>
                  <strong>Duration:</strong> {selectedFailure.duration}ms
                </div>
              </div>

              <div>
                <strong>Error Message:</strong>
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                  {selectedFailure.message}
                </div>
              </div>

              <div>
                <strong>Specific Errors:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {selectedFailure.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong>Fix Suggestion:</strong>
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-2">
                  {getFixSuggestion(selectedFailure)}
                </div>
              </div>

              <div>
                <strong>Technical Details:</strong>
                <pre className="bg-gray-50 border rounded p-3 mt-2 text-sm overflow-x-auto">
                  {JSON.stringify(selectedFailure.details, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const FailureList: React.FC<{ failures: TestFailure[], title: string }> = ({ failures, title }) => {
  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-black',
      'low': 'bg-green-500 text-white'
    };
    return colorMap[priority] || 'bg-gray-500 text-white';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'products': 'bg-blue-100 text-blue-800',
      'staff': 'bg-purple-100 text-purple-800',
      'payments': 'bg-red-100 text-red-800',
      'sales': 'bg-orange-100 text-orange-800',
      'purchasing': 'bg-pink-100 text-pink-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {failures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No failures in this category
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {failures.map((failure) => (
                <div key={failure.id} className="border rounded-lg p-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{failure.testName}</h4>
                        <Badge className={getPriorityColor(failure.priority)}>
                          {failure.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={getCategoryColor(failure.category)}>
                          {failure.category}
                        </Badge>
                        {failure.failureCount > 1 && (
                          <Badge variant="destructive">
                            {failure.failureCount}x failed
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {failure.suiteName} • {failure.module}
                      </div>
                      <div className="text-sm text-red-600 mb-2">
                        {failure.message}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Failed {new Date(failure.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // In real implementation, this would show detailed analysis
                          console.log('Analyzing failure:', failure);
                        }}
                      >
                        Analyze
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          // In real implementation, this would navigate to fix the issue
                          console.log('Fixing failure:', failure);
                        }}
                      >
                        Fix Now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default TestFailuresDashboard;