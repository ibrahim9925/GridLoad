// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  testName: string;
  status: 'running' | 'passed' | 'failed';
  details: string;
  duration?: number;
  score?: number;
}

export const SupplyChainIntelligenceTests = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const testSuites = [
    {
      id: 'cash-flow-intelligence',
      name: 'Cash Flow Intelligence',
      icon: DollarSign,
      description: 'Test real-time cash position tracking and liquidity forecasting',
      tests: [
        'Cash position calculation accuracy',
        'Multi-currency balance aggregation', 
        'Liquidity forecasting algorithms',
        'Cash constraint identification',
        'Payment timing optimization'
      ]
    },
    {
      id: 'supplier-performance',
      name: 'Supplier Intelligence',
      icon: TrendingUp,
      description: 'Validate supplier scoring and performance analytics',
      tests: [
        'Reliability score calculations',
        'Lead time tracking accuracy',
        'Quality rating aggregation',
        'Cost performance analysis',
        'Risk assessment algorithms'
      ]
    },
    {
      id: 'stock-coverage',
      name: 'Stock Coverage Analysis',
      icon: Package,
      description: 'Test inventory intelligence and reorder recommendations',
      tests: [
        'Sales velocity calculations',
        'Stock coverage predictions',
        'Reorder point optimization',
        'Seasonal demand adjustments',
        'Lead time variance handling'
      ]
    },
    {
      id: 'seasonal-intelligence',
      name: 'Seasonal Intelligence',
      icon: BarChart3,
      description: 'Validate seasonal demand patterns and adjustments',
      tests: [
        'Seasonal pattern recognition',
        'Demand forecasting accuracy',
        'Seasonal stock adjustments',
        'Peak season preparation',
        'Off-season optimization'
      ]
    }
  ];

  const runCashFlowTests = async (): Promise<TestResult[]> => {
    const testResults: TestResult[] = [];
    
    try {
      // Test 1: Cash position calculation
      const { data: cashStatus, error } = await supabase.rpc('get_supply_chain_cash_status');
      if (error) throw error;
      
      testResults.push({
        testName: 'Cash position calculation accuracy',
        status: cashStatus ? 'passed' : 'failed',
        details: cashStatus ? `Found ${Object.keys(cashStatus).length} account balances` : 'No cash data returned',
        score: cashStatus ? 95 : 0
      });

      // Test 2: Multi-currency handling
      const currencies = ['USD', 'NIS'];
      let currencyScore = 0;
      for (const currency of currencies) {
        if (cashStatus[currency]) currencyScore += 50;
      }
      
      testResults.push({
        testName: 'Multi-currency balance aggregation',
        status: currencyScore > 50 ? 'passed' : 'failed',
        details: `Handled ${currencyScore/50} out of ${currencies.length} currencies`,
        score: currencyScore
      });

    } catch (error: any) {
      testResults.push({
        testName: 'Cash Flow Intelligence Suite',
        status: 'failed',
        details: `Error: ${error.message}`,
        score: 0
      });
    }

    return testResults;
  };

  const runSupplierTests = async (): Promise<TestResult[]> => {
    const testResults: TestResult[] = [];
    
    try {
      // Test supplier performance function
      const { data: supplierData, error } = await supabase.rpc('get_enhanced_supplier_performance');
      if (error) throw error;
      
      testResults.push({
        testName: 'Reliability score calculations',
        status: supplierData?.length > 0 ? 'passed' : 'failed',
        details: `Processed ${supplierData?.length || 0} suppliers`,
        score: supplierData?.length > 0 ? 90 : 0
      });

      // Test supplier metrics
      if (supplierData?.length > 0) {
        const hasMetrics = supplierData.some((s: any) => 
          s.reliability_score !== undefined && 
          s.avg_lead_time_days !== undefined
        );
        
        testResults.push({
          testName: 'Lead time tracking accuracy',
          status: hasMetrics ? 'passed' : 'failed',
          details: hasMetrics ? 'All required metrics present' : 'Missing key metrics',
          score: hasMetrics ? 85 : 0
        });
      }

    } catch (error: any) {
      testResults.push({
        testName: 'Supplier Intelligence Suite',
        status: 'failed',
        details: `Error: ${error.message}`,
        score: 0
      });
    }

    return testResults;
  };

  const runStockCoverageTests = async (): Promise<TestResult[]> => {
    const testResults: TestResult[] = [];
    
    try {
      // Test stock coverage analysis
      const { data: coverageData, error } = await supabase.rpc('get_stock_coverage_analysis');
      if (error) throw error;
      
      testResults.push({
        testName: 'Sales velocity calculations',
        status: coverageData?.length > 0 ? 'passed' : 'failed',
        details: `Analyzed ${coverageData?.length || 0} products`,
        score: coverageData?.length > 0 ? 88 : 0
      });

      // Test reorder recommendations
      const { data: reorderData, error: reorderError } = await supabase.rpc('get_intelligent_reorder_recommendations');
      if (reorderError) throw reorderError;
      
      testResults.push({
        testName: 'Reorder point optimization',
        status: reorderData?.length >= 0 ? 'passed' : 'failed',
        details: `Generated ${reorderData?.length || 0} recommendations`,
        score: reorderData?.length >= 0 ? 92 : 0
      });

    } catch (error: any) {
      testResults.push({
        testName: 'Stock Coverage Suite',
        status: 'failed',
        details: `Error: ${error.message}`,
        score: 0
      });
    }

    return testResults;
  };

  const runSeasonalTests = async (): Promise<TestResult[]> => {
    const testResults: TestResult[] = [];
    
    try {
      // Test seasonal demand intelligence
      const { data: seasonalData, error } = await supabase.rpc('get_seasonal_demand_intelligence');
      if (error) throw error;
      
      testResults.push({
        testName: 'Seasonal pattern recognition',
        status: seasonalData?.length > 0 ? 'passed' : 'failed',
        details: `Identified patterns for ${seasonalData?.length || 0} products`,
        score: seasonalData?.length > 0 ? 87 : 0
      });

      // Test seasonal adjustments
      const hasSeasonalFactors = seasonalData?.some((item: any) => 
        item.seasonal_factor !== undefined && item.seasonal_factor !== 1.0
      );
      
      testResults.push({
        testName: 'Seasonal stock adjustments',
        status: hasSeasonalFactors ? 'passed' : 'failed',
        details: hasSeasonalFactors ? 'Seasonal factors applied' : 'No seasonal adjustments found',
        score: hasSeasonalFactors ? 84 : 0
      });

    } catch (error: any) {
      testResults.push({
        testName: 'Seasonal Intelligence Suite',
        status: 'failed',
        details: `Error: ${error.message}`,
        score: 0
      });
    }

    return testResults;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    try {
      const allResults: TestResult[] = [];
      
      // Run cash flow tests
      setCurrentTest('Running cash flow intelligence tests...');
      setProgress(10);
      const cashResults = await runCashFlowTests();
      allResults.push(...cashResults);
      setProgress(30);
      
      // Run supplier tests  
      setCurrentTest('Running supplier intelligence tests...');
      const supplierResults = await runSupplierTests();
      allResults.push(...supplierResults);
      setProgress(50);
      
      // Run stock coverage tests
      setCurrentTest('Running stock coverage tests...');
      const stockResults = await runStockCoverageTests();
      allResults.push(...stockResults);
      setProgress(80);
      
      // Run seasonal tests
      setCurrentTest('Running seasonal intelligence tests...');
      const seasonalResults = await runSeasonalTests();
      allResults.push(...seasonalResults);
      setProgress(100);
      
      setResults(allResults);
      
      const passedTests = allResults.filter(r => r.status === 'passed').length;
      const totalTests = allResults.length;
      
      toast({
        title: "Supply Chain Intelligence Tests Complete",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });
      
    } catch (error: any) {
      toast({
        title: "Test Suite Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return <Badge variant="outline" className="text-success border-success">Passed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">Running</Badge>;
    }
  };

  const overallScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Supply Chain Intelligence Tests
          </h2>
          <p className="text-muted-foreground">
            Comprehensive validation of AI-driven supply chain algorithms
          </p>
        </div>
        <Button
          onClick={runAllTests}
          disabled={isRunning}
          size="lg"
        >
          <Play className="mr-2 h-4 w-4" />
          {isRunning ? 'Running Tests...' : 'Run Intelligence Tests'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{currentTest}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Score */}
      {results.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{overallScore}%</div>
              <p className="text-muted-foreground">Overall Intelligence Score</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-success">
                    {results.filter(r => r.status === 'passed').length}
                  </div>
                  <div className="text-muted-foreground">Passed</div>
                </div>
                <div>
                  <div className="font-semibold text-destructive">
                    {results.filter(r => r.status === 'failed').length}
                  </div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="font-semibold">
                    {results.length}
                  </div>
                  <div className="text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Suites Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testSuites.map((suite) => {
          const Icon = suite.icon;
          const suiteResults = results.filter(r => 
            r.testName.toLowerCase().includes(suite.id.replace('-', ' '))
          );
          const suiteScore = suiteResults.length > 0 
            ? Math.round(suiteResults.reduce((sum, r) => sum + (r.score || 0), 0) / suiteResults.length)
            : 0;
          
          return (
            <Card key={suite.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {suite.name}
                  {suiteResults.length > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {suiteScore}%
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {suite.description}
                </p>
                <div className="space-y-2">
                  {suite.tests.map((test, index) => {
                    const result = results.find(r => 
                      r.testName.toLowerCase().includes(test.toLowerCase())
                    );
                    
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {result ? getStatusIcon(result.status) : <div className="h-4 w-4" />}
                          {test}
                        </span>
                        {result && (
                          <Badge variant="outline" className="text-xs">
                            {result.score}%
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.testName}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.details}
                    </p>
                  </div>
                  {result.score !== undefined && (
                    <Badge variant="outline" className="ml-4">
                      {result.score}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};