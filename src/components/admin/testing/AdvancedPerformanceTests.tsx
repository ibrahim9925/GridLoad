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
  Zap,
  Database,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  testName: string;
  executionTime: number;
  memoryUsage?: number;
  queryCount?: number;
  status: 'passed' | 'failed' | 'warning';
  threshold: number;
  details: string;
}

export const AdvancedPerformanceTests = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const performanceTests = [
    {
      id: 'dashboard-load',
      name: 'Dashboard Load Performance',
      description: 'Test initial dashboard loading with large datasets',
      threshold: 2000, // 2 seconds
      test: async () => {
        const start = performance.now();
        
        // Simulate dashboard data loading
        const promises = [
          supabase.from('sales').select('*').limit(100),
          supabase.from('products').select('*').limit(50),
          supabase.from('customers').select('*').limit(30),
          supabase.from('suppliers').select('*').limit(20)
        ];
        
        await Promise.all(promises);
        const end = performance.now();
        
        return {
          executionTime: end - start,
          queryCount: 4,
          details: 'Loaded dashboard with 200 records'
        };
      }
    },
    {
      id: 'sales-creation',
      name: 'Sales Creation Performance',
      description: 'Test sale creation with multiple items',
      threshold: 1500, // 1.5 seconds
      test: async () => {
        const start = performance.now();
        
        // Get a customer for the test
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .limit(1)
          .single();
        
        if (!customer) throw new Error('No customers available for test');
        
        // Create a test sale
        const { data: sale } = await supabase
          .from('sales')
          .insert({
            customer_id: customer.id,
            total_amount: 5000,
            sale_date: new Date().toISOString().split('T')[0],
            payment_status: 'pending',
            fulfillment_status: 'pending'
          })
          .select()
          .single();
        
        // Clean up test data
        if (sale) {
          await supabase.from('sales').delete().eq('id', sale.id);
        }
        
        const end = performance.now();
        
        return {
          executionTime: end - start,
          queryCount: 3,
          details: 'Created and cleaned up test sale'
        };
      }
    },
    {
      id: 'search-performance',
      name: 'Search Performance',
      description: 'Test product search with filters',
      threshold: 800, // 800ms
      test: async () => {
        const start = performance.now();
        
        // Perform complex search
        await supabase
          .from('products')
          .select('*')
          .gte('current_stock', 0)
          .order('name')
          .limit(20);
        
        const end = performance.now();
        
        return {
          executionTime: end - start,
          queryCount: 1,
          details: 'Searched products with filters'
        };
      }
    },
    {
      id: 'supply-chain-analysis',
      name: 'Supply Chain Analysis Performance',
      description: 'Test complex supply chain intelligence queries',
      threshold: 3000, // 3 seconds
      test: async () => {
        const start = performance.now();
        
        // Run supply chain analysis functions
        const promises = [
          supabase.rpc('get_supply_chain_cash_status'),
          supabase.rpc('get_enhanced_supplier_performance'),
          supabase.rpc('get_stock_coverage_analysis'),
          supabase.rpc('get_seasonal_demand_intelligence')
        ];
        
        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        const end = performance.now();
        
        return {
          executionTime: end - start,
          queryCount: 4,
          details: `Completed ${successCount}/4 supply chain analyses`
        };
      }
    },
    {
      id: 'bulk-operations',
      name: 'Bulk Operations Performance',
      description: 'Test bulk data operations',
      threshold: 2500, // 2.5 seconds
      test: async () => {
        const start = performance.now();
        
        // Simulate bulk data operations
        const { data: products } = await supabase
          .from('products')
          .select('id, current_stock')
          .limit(50);
        
        if (products && products.length > 0) {
          // Simulate stock level checks for multiple products
          const stockChecks = products.map(p => 
            supabase
              .from('stock_movements')
              .select('*')
              .eq('product_id', p.id)
              .limit(5)
          );
          
          await Promise.all(stockChecks);
        }
        
        const end = performance.now();
        
        return {
          executionTime: end - start,
          queryCount: products?.length || 0 + 1,
          details: `Processed ${products?.length || 0} products`
        };
      }
    }
  ];

  const runPerformanceTests = async () => {
    setIsRunning(true);
    setMetrics([]);
    setProgress(0);
    
    try {
      const results: PerformanceMetric[] = [];
      
      for (let i = 0; i < performanceTests.length; i++) {
        const test = performanceTests[i];
        setCurrentTest(`Running ${test.name}...`);
        setProgress(((i + 1) / performanceTests.length) * 100);
        
        try {
          const result = await test.test();
          const status = result.executionTime <= test.threshold ? 'passed' : 
                        result.executionTime <= test.threshold * 1.5 ? 'warning' : 'failed';
          
          results.push({
            testName: test.name,
            executionTime: Math.round(result.executionTime),
            queryCount: result.queryCount,
            status,
            threshold: test.threshold,
            details: result.details
          });
        } catch (error: any) {
          results.push({
            testName: test.name,
            executionTime: 0,
            status: 'failed',
            threshold: test.threshold,
            details: `Error: ${error.message}`
          });
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setMetrics(results);
      
      const passedTests = results.filter(r => r.status === 'passed').length;
      const warningTests = results.filter(r => r.status === 'warning').length;
      
      toast({
        title: "Performance Tests Complete",
        description: `${passedTests} passed, ${warningTests} warnings, ${results.length - passedTests - warningTests} failed`,
        variant: passedTests === results.length ? "default" : "destructive"
      });
      
    } catch (error: any) {
      toast({
        title: "Performance Test Suite Failed",
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
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return <Badge variant="outline" className="text-success border-success">Passed</Badge>;
      case 'warning': return <Badge variant="outline" className="text-warning border-warning">Warning</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="secondary">Running</Badge>;
    }
  };

  const averageExecutionTime = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length)
    : 0;

  const totalQueries = metrics.reduce((sum, m) => sum + (m.queryCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Advanced Performance Tests
          </h2>
          <p className="text-muted-foreground">
            Comprehensive performance benchmarking and optimization analysis
          </p>
        </div>
        <Button
          onClick={runPerformanceTests}
          disabled={isRunning}
          size="lg"
        >
          <Play className="mr-2 h-4 w-4" />
          {isRunning ? 'Running Tests...' : 'Run Performance Tests'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{currentTest}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Metrics */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {metrics.filter(m => m.status === 'passed').length}
                </div>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {metrics.filter(m => m.status === 'warning').length}
                </div>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {averageExecutionTime}ms
                </div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {totalQueries}
                </div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {performanceTests.map((test) => {
          const metric = metrics.find(m => m.testName === test.name);
          
          return (
            <Card key={test.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  {test.name}
                  {metric && getStatusBadge(metric.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {test.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Threshold:</span>
                    <span className="font-medium">{test.threshold}ms</span>
                  </div>
                  
                  {metric && (
                    <>
                      <div className="flex justify-between">
                        <span>Execution Time:</span>
                        <span className={`font-medium ${
                          metric.executionTime <= test.threshold ? 'text-success' :
                          metric.executionTime <= test.threshold * 1.5 ? 'text-warning' :
                          'text-destructive'
                        }`}>
                          {metric.executionTime}ms
                        </span>
                      </div>
                      
                      {metric.queryCount && (
                        <div className="flex justify-between">
                          <span>Queries:</span>
                          <span className="font-medium">{metric.queryCount}</span>
                        </div>
                      )}
                      
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          {metric.details}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Results */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(metric.status)}
                      <span className="font-medium">{metric.testName}</span>
                      {getStatusBadge(metric.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {metric.details}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`text-lg font-bold ${
                      metric.executionTime <= metric.threshold ? 'text-success' :
                      metric.executionTime <= metric.threshold * 1.5 ? 'text-warning' :
                      'text-destructive'
                    }`}>
                      {metric.executionTime}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: {metric.threshold}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Recommendations */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.filter(m => m.status !== 'passed').map((metric, index) => (
                <Alert key={index} variant={metric.status === 'warning' ? 'default' : 'destructive'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{metric.testName}</strong>: 
                    {metric.status === 'warning' 
                      ? ' Consider optimizing queries or adding indexes for better performance.'
                      : ' Critical performance issue detected. Immediate optimization required.'
                    }
                  </AlertDescription>
                </Alert>
              ))}
              
              {metrics.every(m => m.status === 'passed') && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All performance tests passed! Your application is performing within acceptable thresholds.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};