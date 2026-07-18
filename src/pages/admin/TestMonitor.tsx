// @ts-nocheck
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

import { useRealTestExecution } from '@/hooks/useRealTestExecution';
import { TestProgressIndicator } from '@/components/admin/testing/TestProgressIndicator';
import ComprehensiveBusinessTestRunner from '@/components/admin/testing/ComprehensiveBusinessTestRunner';
import TestFailuresDashboard from '@/components/admin/testing/TestFailuresDashboard';
import { TestResultsTimeline } from '@/components/admin/testing/TestResultsTimeline';
import { TestPerformanceCharts } from '@/components/admin/testing/TestPerformanceCharts';
import { QARemediationRunner } from '@/components/admin/testing/QARemediationRunner';
import { QuickValidationRunner } from '@/components/admin/testing/QuickValidationRunner';
import { SupplyChainIntelligenceTests } from '@/components/admin/testing/SupplyChainIntelligenceTests';
import { EndToEndWorkflowTests } from '@/components/admin/testing/EndToEndWorkflowTests';
import { AdvancedPerformanceTests } from '@/components/admin/testing/AdvancedPerformanceTests';
import { ComprehensiveSupplyChainTests } from '@/components/admin/testing/ComprehensiveSupplyChainTests';

const TestMonitor = () => {
  const {
    testExecutions,
    testResults,
    isLoading,
    isConnected,
    connectionStatus,
    runIndividualTest,
    runTestSuite
  } = useRealTestExecution();

  const runningExecutions = testExecutions.filter(exec => exec.status === 'running');
  const completedExecutions = testExecutions.filter(exec => exec.status === 'completed');
  const failedExecutions = testExecutions.filter(exec => exec.status === 'failed');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading comprehensive test suite...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Business Test Suite</h1>
          <p className="text-muted-foreground">
            Complete validation of all business processes, CRUD operations, and user workflows
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-success" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          <Badge variant={isConnected ? "outline" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      <TestProgressIndicator
        isConnected={isConnected}
        totalExecutions={testExecutions.length}
        runningExecutions={runningExecutions.length}
        completedExecutions={completedExecutions.length}
        failedExecutions={failedExecutions.length}
        connectionStatus={connectionStatus}
      />

      {!isConnected && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Real-time connection lost. Test results may not update automatically.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="qa-remediation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="qa-remediation">QA</TabsTrigger>
          <TabsTrigger value="business-tests">Business</TabsTrigger>
          <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
          <TabsTrigger value="comprehensive-supply">Comprehensive SC</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="performance-advanced">Performance</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="qa-remediation" className="space-y-6">
          <QARemediationRunner 
            onComplete={(results) => {
              console.log('QA Remediation completed:', results);
              // Optionally trigger a test run after successful remediation
            }}
          />
          
          <QuickValidationRunner />
        </TabsContent>

        <TabsContent value="business-tests" className="space-y-6">
          <ComprehensiveBusinessTestRunner />
        </TabsContent>

        <TabsContent value="supply-chain" className="space-y-6">
          <SupplyChainIntelligenceTests />
        </TabsContent>

        <TabsContent value="comprehensive-supply" className="space-y-6">
          <ComprehensiveSupplyChainTests />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <EndToEndWorkflowTests />
        </TabsContent>

        <TabsContent value="performance-advanced" className="space-y-6">
          <AdvancedPerformanceTests />
        </TabsContent>

        <TabsContent value="failures" className="space-y-6">
          <TestFailuresDashboard />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <TestResultsTimeline
            testResults={testResults}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <TestPerformanceCharts
            testResults={testResults}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestMonitor;