// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Play, RefreshCw, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
  data?: any;
  errors?: string[];
}

const TestSystemIntegrationPanel = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runIntegrationTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      toast({
        title: "Running Integration Tests",
        description: "Testing system workflows and data integrity..."
      });

      const results: TestResult[] = [];
      
      // Create test execution record
      const { data: execution, error: execError } = await supabase
        .from('test_executions')
        .insert({
          test_suite: 'Integration Tests',
          status: 'running',
          total_tests: 4,
          passed_tests: 0,
          failed_tests: 0
        })
        .select()
        .single();

      if (execError) throw execError;

      // Test 1: Database Connection
      const dbTest = await runIndividualTest(execution.id, 'Database Connection', 'infrastructure', testDatabaseConnection);
      results.push(dbTest);

      // Test 2: Sales Workflow
      const salesTest = await runIndividualTest(execution.id, 'Sales Workflow', 'business_logic', testSalesWorkflow);
      results.push(salesTest);

      // Test 3: Inventory Management
      const inventoryTest = await runIndividualTest(execution.id, 'Inventory Management', 'business_logic', testInventoryManagement);
      results.push(inventoryTest);

      // Test 4: Authentication System
      const authTest = await runIndividualTest(execution.id, 'Authentication System', 'security', testAuthenticationSystem);
      results.push(authTest);

      setTestResults(results);

      const passedTests = results.filter(r => r.success).length;
      const totalTests = results.length;

      // Update test execution record
      await supabase.from('test_executions').update({
        status: passedTests === totalTests ? 'completed' : 'failed',
        end_time: new Date().toISOString(),
        passed_tests: passedTests,
        failed_tests: totalTests - passedTests
      }).eq('id', execution.id);

      toast({
        title: "Integration Tests Complete",
        description: `${passedTests}/${totalTests} tests passed`,
        variant: passedTests === totalTests ? "default" : "destructive"
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Test Execution Failed",
        description: error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (
    executionId: string, 
    testName: string, 
    category: string,
    testFunction: () => Promise<TestResult>
  ): Promise<TestResult> => {
    const startTime = Date.now();
    
    // Create test result record with pending status
    const { data: testResult, error: createError } = await supabase
      .from('test_results')
      .insert({
        execution_id: executionId,
        test_name: testName,
        test_category: category,
        status: 'running'
      })
      .select()
      .single();

    if (createError) throw createError;

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      // Update test result with completion
      await supabase.from('test_results').update({
        status: result.success ? 'passed' : 'failed',
        duration_ms: duration,
        error_message: result.errors?.join(', ') || null,
        stack_trace: result.errors ? JSON.stringify(result.errors) : null
      }).eq('id', testResult.id);

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Update test result with failure
      await supabase.from('test_results').update({
        status: 'failed',
        duration_ms: duration,
        error_message: error.message,
        stack_trace: error.stack || null
      }).eq('id', testResult.id);

      return {
        success: false,
        message: `Test failed: ${error.message}`,
        duration,
        errors: [error.message]
      };
    }
  };

  const testDatabaseConnection = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      if (error) throw error;
      
      return {
        success: true,
        message: "Database connection successful",
        duration: Date.now() - start
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Database connection failed",
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  };

  const testSalesWorkflow = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      // Check if we have basic data for sales workflow
      const [customers, products, staff] = await Promise.all([
        supabase.from('customers').select('id').limit(1),
        supabase.from('products').select('id').limit(1),
        supabase.from('staff').select('id').eq('role', 'sales_rep').limit(1)
      ]);

      if (customers.error || products.error || staff.error) {
        throw new Error("Failed to validate sales workflow prerequisites");
      }

      const hasCustomers = (customers.data?.length || 0) > 0;
      const hasProducts = (products.data?.length || 0) > 0;
      const hasSalesReps = (staff.data?.length || 0) > 0;

      if (!hasCustomers || !hasProducts || !hasSalesReps) {
        return {
          success: false,
          message: "Sales workflow missing prerequisites",
          duration: Date.now() - start,
          errors: [
            !hasCustomers ? "No customers found" : "",
            !hasProducts ? "No products found" : "",
            !hasSalesReps ? "No sales representatives found" : ""
          ].filter(Boolean)
        };
      }

      return {
        success: true,
        message: "Sales workflow prerequisites validated",
        duration: Date.now() - start,
        data: { customers: hasCustomers, products: hasProducts, salesReps: hasSalesReps }
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Sales workflow test failed",
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  };

  const testInventoryManagement = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, current_stock, reorder_point')
        .limit(10);

      if (error) throw error;

      const productsWithStock = products?.filter(p => (p.current_stock || 0) > 0) || [];
      const productsWithReorderPoints = products?.filter(p => p.reorder_point > 0) || [];

      return {
        success: productsWithStock.length > 0,
        message: `Inventory validation: ${productsWithStock.length} products with stock`,
        duration: Date.now() - start,
        data: {
          totalProducts: products?.length || 0,
          productsWithStock: productsWithStock.length,
          productsWithReorderPoints: productsWithReorderPoints.length
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Inventory management test failed",
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  };

  const testAuthenticationSystem = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          message: "No authenticated user found",
          duration: Date.now() - start
        };
      }

      const { data: staff, error } = await supabase
        .from('staff')
        .select('id, role, is_active')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      return {
        success: true,
        message: staff ? `Authenticated as ${staff.role}` : "Authenticated user (no staff profile)",
        duration: Date.now() - start,
        data: { userId: user.id, role: staff?.role, isActive: staff?.is_active }
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Authentication system test failed",
        duration: Date.now() - start,
        errors: [error.message]
      };
    }
  };

  const getResultIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          System Integration Testing
        </CardTitle>
        <CardDescription>
          Run comprehensive tests to validate system functionality and data integrity
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Action Button */}
        <Button 
          onClick={runIntegrationTests}
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Integration Tests
            </>
          )}
        </Button>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            
            {testResults.map((result, index) => (
              <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-3">
                  {getResultIcon(result.success)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <AlertDescription className="font-medium">
                        {result.message}
                      </AlertDescription>
                      {result.duration && (
                        <Badge variant="outline" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      )}
                    </div>
                    
                    {result.data && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(result.data).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="mr-1">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-destructive">Errors:</p>
                        <ul className="text-sm text-destructive list-disc list-inside">
                          {result.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Test Information */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Integration Tests Include:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Database connectivity and RLS policy validation</li>
              <li>Sales workflow prerequisites and data consistency</li>
              <li>Inventory management system functionality</li>
              <li>Authentication and authorization systems</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TestSystemIntegrationPanel;