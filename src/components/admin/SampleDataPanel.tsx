// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Play, Database, Package, FileText, Calendar, TestTube, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTestDataInfrastructure } from '@/hooks/useTestDataInfrastructure';

const SampleDataPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const { toast } = useToast();
  const { seedBasicData, status } = useTestDataInfrastructure();

  const populateSampleBusinessData = async () => {
    try {
      // Use the existing infrastructure to create comprehensive business data
      const result = await seedBasicData({
        customerCount: 5,
        productCount: 10,
        supplierCount: 3,
        leadCount: 8,
        cleanup: false
      });

      if (!result.success) {
        throw new Error(result.error || result.message);
      }

      // Create sample warranties
      const sampleWarranties = [
        {
          serial_number: '23fx2000049',
          warranty_period_months: 60,
          warranty_type: 'manufacturer',
          warranty_start_date: '2024-01-15',
          warranty_end_date: '2029-01-15',
          status: 'active',
          notes: 'Solar inverter warranty - 5 years manufacturer coverage'
        },
        {
          serial_number: '24gx3000128',
          warranty_period_months: 24,
          warranty_type: 'manufacturer',
          warranty_start_date: '2023-06-20',
          warranty_end_date: '2025-06-20',
          status: 'active',
          notes: 'MPPT charge controller - 2 years warranty'
        }
      ];

      await supabase.from('warranties').insert(sampleWarranties);

      return result;
    } catch (error) {
      console.error('Error populating business data:', error);
      throw error;
    }
  };

  const populateTestExecutionData = async () => {
    try {
      // Create sample test executions for the Test Monitor
      const testExecutions = [
        {
          test_suite: 'Sales Workflow Integration',
          status: 'completed',
          start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          total_tests: 12,
          passed_tests: 10,
          failed_tests: 2
        },
        {
          test_suite: 'Inventory Management Tests',
          status: 'completed',
          start_time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
          total_tests: 8,
          passed_tests: 8,
          failed_tests: 0
        },
        {
          test_suite: 'Payment Processing Suite',
          status: 'running',
          start_time: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          total_tests: 6,
          passed_tests: 4,
          failed_tests: 0
        }
      ];

      const { data: executions, error: execError } = await supabase
        .from('test_executions')
        .insert(testExecutions)
        .select();

      if (execError) throw execError;

      // Create sample test results
      const testResults = [
        {
          execution_id: executions[0].id,
          test_name: 'Create Sale with Items',
          test_category: 'sales',
          status: 'passed',
          duration_ms: 1250,
          error_message: null
        },
        {
          execution_id: executions[0].id,
          test_name: 'Auto-create Installation',
          test_category: 'workflow',
          status: 'passed',
          duration_ms: 890,
          error_message: null
        },
        {
          execution_id: executions[0].id,
          test_name: 'Generate Warranty Records',
          test_category: 'warranty',
          status: 'failed',
          duration_ms: 2100,
          error_message: 'Serial number generation failed: Invalid product type'
        },
        {
          execution_id: executions[1].id,
          test_name: 'Stock Level Validation',
          test_category: 'inventory',
          status: 'passed',
          duration_ms: 650,
          error_message: null
        },
        {
          execution_id: executions[1].id,
          test_name: 'Reorder Point Calculation',
          test_category: 'inventory',
          status: 'passed',
          duration_ms: 420,
          error_message: null
        },
        {
          execution_id: executions[2].id,
          test_name: 'Process Credit Card Payment',
          test_category: 'payment',
          status: 'passed',
          duration_ms: 1800,
          error_message: null
        }
      ];

      await supabase.from('test_results').insert(testResults);

      return executions.length;
    } catch (error) {
      console.error('Error populating test data:', error);
      throw error;
    }
  };

  const runCompleteDataPopulation = async () => {
    setIsLoading(true);
    setCompletedSteps([]);

    try {
      toast({
        title: "Starting Data Population",
        description: "Creating sample business and test data..."
      });

      // Step 1: Create business data
      await populateSampleBusinessData();
      setCompletedSteps(prev => [...prev, 'business']);
      toast({
        title: "Business Data Created",
        description: "Sample customers, products, and sales data populated"
      });

      // Step 2: Create test execution data
      const testCount = await populateTestExecutionData();
      setCompletedSteps(prev => [...prev, 'tests']);
      toast({
        title: "Test Data Created",
        description: `${testCount} test executions with results for Test Monitor`
      });

      toast({
        title: "Data Population Complete",
        description: "✅ All sample data has been created successfully"
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Data Population Failed",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentData = async () => {
    try {
      const [customers, products, sales, testExecutions] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('sales').select('id', { count: 'exact' }),
        supabase.from('test_executions').select('id', { count: 'exact' })
      ]);

      return {
        customers: customers.count || 0,
        products: products.count || 0,
        sales: sales.count || 0,
        testExecutions: testExecutions.count || 0
      };
    } catch (error) {
      console.error('Error checking data:', error);
      return { customers: 0, products: 0, sales: 0, testExecutions: 0 };
    }
  };

  const [dataStats, setDataStats] = useState({ customers: 0, products: 0, sales: 0, testExecutions: 0 });

  React.useEffect(() => {
    checkCurrentData().then(setDataStats);
  }, [completedSteps]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Sample Data & Validation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Data Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted rounded">
            <Package className="h-6 w-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{dataStats.customers}</div>
            <div className="text-sm text-muted-foreground">Customers</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <FileText className="h-6 w-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{dataStats.products}</div>
            <div className="text-sm text-muted-foreground">Products</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <Calendar className="h-6 w-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{dataStats.sales}</div>
            <div className="text-sm text-muted-foreground">Sales</div>
          </div>
          <div className="text-center p-3 bg-muted rounded">
            <TestTube className="h-6 w-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{dataStats.testExecutions}</div>
            <div className="text-sm text-muted-foreground">Test Runs</div>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={runCompleteDataPopulation}
          disabled={isLoading || status.isLoading}
          size="lg"
          className="w-full"
        >
          {isLoading ? "Populating Data..." : "Generate Sample Data"}
          <Zap className="ml-2 h-4 w-4" />
        </Button>

        {/* Progress Indicators */}
        {completedSteps.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Progress:</h4>
            <div className="space-y-1">
              {[
                { key: 'business', label: 'Business data created (customers, products, sales, warranties)' },
                { key: 'tests', label: 'Test execution data populated for Test Monitor' }
              ].map(step => (
                <div key={step.key} className="flex items-center gap-2">
                  <CheckCircle 
                    className={`h-4 w-4 ${completedSteps.includes(step.key) ? 'text-success' : 'text-muted-foreground'}`}
                  />
                  <span className={completedSteps.includes(step.key) ? 'text-success' : 'text-muted-foreground'}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>What This Creates:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Business Data:</strong> Sample customers, products, sales, warranties, and installations</li>
              <li><strong>Test Data:</strong> Mock test executions and results for the Test Monitor dashboard</li>
              <li><strong>Workflows:</strong> Complete sales-to-installation-to-warranty workflows for validation</li>
              <li><strong>Analytics:</strong> Provides real data for all dashboard statistics and reports</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SampleDataPanel;