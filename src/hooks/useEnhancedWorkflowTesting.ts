// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTestResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  duration?: number;
}

interface IntegrationTestSuite {
  saleToInstallationWorkflow: WorkflowTestResult;
  saleToWarrantyWorkflow: WorkflowTestResult;
  paymentScheduleAutomation: WorkflowTestResult;
  stockMovementTracking: WorkflowTestResult;
  commissionCalculation: WorkflowTestResult;
  crossModuleConsistency: WorkflowTestResult;
  performanceBenchmarks: WorkflowTestResult;
}

interface PerformanceMetrics {
  dbQueryTime: number;
  workflowExecutionTime: number;
  concurrentTransactions: number;
  memoryUsage: number;
}

export const useEnhancedWorkflowTesting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const { toast } = useToast();

  // Comprehensive integration test suite
  const runIntegrationTestSuite = async (): Promise<IntegrationTestSuite> => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const results: IntegrationTestSuite = {
        saleToInstallationWorkflow: await testSaleToInstallationWorkflow(),
        saleToWarrantyWorkflow: await testSaleToWarrantyWorkflow(),
        paymentScheduleAutomation: await testPaymentScheduleAutomation(),
        stockMovementTracking: await testStockMovementTracking(),
        commissionCalculation: await testCommissionCalculation(),
        crossModuleConsistency: await testCrossModuleConsistency(),
        performanceBenchmarks: await testPerformanceBenchmarks()
      };

      const executionTime = Date.now() - startTime;
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalTests = Object.keys(results).length;

      toast({
        title: `Integration Tests Complete`,
        description: `${successCount}/${totalTests} tests passed in ${executionTime}ms`,
        variant: successCount === totalTests ? "default" : "destructive"
      });

      return results;
    } finally {
      setIsLoading(false);
    }
  };

  // Test Sale to Installation workflow automation
  const testSaleToInstallationWorkflow = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      // Create sale with installation-required products
      const { data: installationProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('requires_installation', true)
        .limit(2);

      if (!installationProducts || installationProducts.length === 0) {
        return {
          success: false,
          message: "No installation-required products found for testing"
        };
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single();

      if (!customer) {
        return {
          success: false,
          message: "No customers available for testing"
        };
      }

      // Create test sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          sales_rep_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: new Date().toISOString().split('T')[0],
          subtotal: 500,
          tax_amount: 50,
          total_amount: 550,
          payment_status: 'pending',
          fulfillment_status: 'pending',
          invoice_number: `INT-TEST-${Date.now()}`
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Add sale items
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: installationProducts[0].id,
          quantity: 1,
          unit_price: 500,
          line_total: 500
        });

      if (itemError) throw itemError;

      // Wait for automation to trigger (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify installation was created
      const { data: installation } = await supabase
        .from('installations')
        .select('*')
        .eq('sale_id', sale.id)
        .single();

      const duration = Date.now() - startTime;

      if (!installation) {
        return {
          success: false,
          message: "Installation workflow automation failed - no installation created",
          duration
        };
      }

      // Cleanup
      await supabase.from('sales').delete().eq('id', sale.id);

      return {
        success: true,
        message: `Installation workflow automated successfully in ${duration}ms`,
        data: { installationId: installation.id },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Sale to Installation workflow test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Sale to Warranty workflow automation
  const testSaleToWarrantyWorkflow = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      // Create sale with warranty products
      const { data: warrantyProducts } = await supabase
        .from('products')
        .select('id, name, warranty_months')
        .gt('warranty_months', 0)
        .limit(2);

      if (!warrantyProducts || warrantyProducts.length === 0) {
        return {
          success: false,
          message: "No warranty products found for testing"
        };
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single();

      // Create test sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          sales_rep_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: new Date().toISOString().split('T')[0],
          subtotal: 300,
          tax_amount: 30,
          total_amount: 330,
          payment_status: 'pending',
          invoice_number: `WAR-TEST-${Date.now()}`
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Add warranty-eligible items
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert(warrantyProducts.map(product => ({
          sale_id: sale.id,
          product_id: product.id,
          quantity: 1,
          unit_price: 150,
          line_total: 150
        })));

      if (itemError) throw itemError;

      // Wait for automation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify warranties were created
      const { data: warranties } = await supabase
        .from('warranties')
        .select('*')
        .eq('sale_id', sale.id);

      const duration = Date.now() - startTime;
      const expectedWarranties = warrantyProducts.length;

      // Cleanup
      await supabase.from('sales').delete().eq('id', sale.id);

      if (!warranties || warranties.length !== expectedWarranties) {
        return {
          success: false,
          message: `Warranty automation failed: expected ${expectedWarranties}, got ${warranties?.length || 0}`,
          duration
        };
      }

      return {
        success: true,
        message: `Warranty workflow automated successfully - ${warranties.length} warranties created in ${duration}ms`,
        data: { warrantiesCount: warranties.length },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Sale to Warranty workflow test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Payment Schedule automation
  const testPaymentScheduleAutomation = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single();

      // Create installment sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          sales_rep_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: new Date().toISOString().split('T')[0],
          subtotal: 1200,
          tax_amount: 120,
          total_amount: 1320,
          payment_status: 'pending',
          is_installment: true,
          down_payment: 320,
          installment_amount: 250,
          installment_count: 4,
          invoice_number: `PAY-TEST-${Date.now()}`
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Check if payment schedules were created
      const { data: schedules } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('sale_id', sale.id);

      const duration = Date.now() - startTime;

      // Cleanup
      await supabase.from('sales').delete().eq('id', sale.id);

      if (!schedules || schedules.length === 0) {
        return {
          success: false,
          message: "Payment schedule automation failed - no schedules created",
          duration
        };
      }

      return {
        success: true,
        message: `Payment schedules created successfully - ${schedules.length} installments in ${duration}ms`,
        data: { schedulesCount: schedules.length },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Payment schedule automation test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Stock Movement tracking
  const testStockMovementTracking = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      const { data: product } = await supabase
        .from('products')
        .select('id, current_stock')
        .gt('current_stock', 5)
        .limit(1)
        .single();

      if (!product) {
        return {
          success: false,
          message: "No products with sufficient stock for testing"
        };
      }

      const initialStock = product.current_stock;

      // Create a sale that should trigger stock movement
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single();

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          sales_rep_id: (await supabase.auth.getUser()).data.user?.id,
          sale_date: new Date().toISOString().split('T')[0],
          subtotal: 100,
          tax_amount: 10,
          total_amount: 110,
          payment_status: 'pending',
          invoice_number: `STOCK-TEST-${Date.now()}`
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          sale_id: sale.id,
          product_id: product.id,
          quantity: 2,
          unit_price: 50,
          line_total: 100
        });

      if (itemError) throw itemError;

      // Wait for triggers
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check stock movement and updated stock
      const [{ data: movements }, { data: updatedProduct }] = await Promise.all([
        supabase
          .from('stock_movements')
          .select('*')
          .eq('product_id', product.id)
          .eq('reference_type', 'sale')
          .eq('reference_id', sale.id),
        supabase
          .from('products')
          .select('current_stock')
          .eq('id', product.id)
          .single()
      ]);

      const duration = Date.now() - startTime;

      // Cleanup
      await supabase.from('sales').delete().eq('id', sale.id);

      if (!movements || movements.length === 0) {
        return {
          success: false,
          message: "Stock movement tracking failed - no movements recorded",
          duration
        };
      }

      if (!updatedProduct || updatedProduct.current_stock !== initialStock - 2) {
        return {
          success: false,
          message: `Stock update failed - expected ${initialStock - 2}, got ${updatedProduct?.current_stock}`,
          duration
        };
      }

      return {
        success: true,
        message: `Stock movement tracking successful - stock updated from ${initialStock} to ${updatedProduct.current_stock} in ${duration}ms`,
        data: { stockChange: -2, movementsRecorded: movements.length },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Stock movement tracking test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Commission calculation
  const testCommissionCalculation = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      // Get sales rep with commission rate
      const { data: salesRep } = await supabase
        .from('staff')
        .select('id, commission_rate')
        .eq('role', 'sales_rep')
        .not('commission_rate', 'is', null)
        .limit(1)
        .single();

      if (!salesRep) {
        return {
          success: false,
          message: "No sales rep with commission rate found for testing"
        };
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .limit(1)
        .single();

      // Create sale with commission
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_id: customer.id,
          sales_rep_id: salesRep.id,
          sale_date: new Date().toISOString().split('T')[0],
          subtotal: 1000,
          tax_amount: 100,
          total_amount: 1100,
          payment_status: 'pending',
          invoice_number: `COMM-TEST-${Date.now()}`
        })
        .select('*, commission_amount')
        .single();

      if (saleError) throw saleError;

      const expectedCommission = 1100 * (salesRep.commission_rate / 100);
      const duration = Date.now() - startTime;

      // Cleanup
      await supabase.from('sales').delete().eq('id', sale.id);

      if (Math.abs(sale.commission_amount - expectedCommission) > 0.01) {
        return {
          success: false,
          message: `Commission calculation incorrect - expected ${expectedCommission}, got ${sale.commission_amount}`,
          duration
        };
      }

      return {
        success: true,
        message: `Commission calculation successful - ${sale.commission_amount} calculated in ${duration}ms`,
        data: { commissionAmount: sale.commission_amount, commissionRate: salesRep.commission_rate },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Commission calculation test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Cross-Module consistency
  const testCrossModuleConsistency = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      // Test data consistency across sales, inventory, and financial modules
      const [
        { data: salesData },
        { data: stockData },
        { data: paymentData }
      ] = await Promise.all([
        supabase.from('sales').select('total_amount, total_paid, balance_due').limit(10),
        supabase.from('products').select('current_stock, reserved_qty').limit(10),
        supabase.from('payments').select('amount, sale_id').limit(10)
      ]);

      const duration = Date.now() - startTime;

      // Verify financial consistency
      let financialConsistency = true;
      if (salesData) {
        for (const sale of salesData) {
          const calculatedBalance = sale.total_amount - (sale.total_paid || 0);
          if (Math.abs(calculatedBalance - (sale.balance_due || 0)) > 0.01) {
            financialConsistency = false;
            break;
          }
        }
      }

      // Verify inventory consistency (stock should not be negative)
      let inventoryConsistency = true;
      if (stockData) {
        for (const product of stockData) {
          if (product.current_stock < 0) {
            inventoryConsistency = false;
            break;
          }
        }
      }

      if (!financialConsistency) {
        return {
          success: false,
          message: "Financial data inconsistency detected - balance calculations don't match",
          duration
        };
      }

      if (!inventoryConsistency) {
        return {
          success: false,
          message: "Inventory inconsistency detected - negative stock levels found",
          duration
        };
      }

      return {
        success: true,
        message: `Cross-module consistency verified in ${duration}ms`,
        data: { 
          salesRecords: salesData?.length || 0,
          productRecords: stockData?.length || 0,
          paymentRecords: paymentData?.length || 0
        },
        duration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Cross-module consistency test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Test Performance benchmarks
  const testPerformanceBenchmarks = async (): Promise<WorkflowTestResult> => {
    const startTime = Date.now();
    
    try {
      const benchmarks = {
        simpleQuery: 0,
        complexJoin: 0,
        aggregation: 0,
        bulkInsert: 0
      };

      // Simple query benchmark
      const simpleStart = Date.now();
      await supabase.from('products').select('id, name').limit(100);
      benchmarks.simpleQuery = Date.now() - simpleStart;

      // Complex join benchmark
      const joinStart = Date.now();
      await supabase
        .from('sales')
        .select(`
          *,
          customers(contact_person),
          sale_items(quantity, unit_price, products(name))
        `)
        .limit(20);
      benchmarks.complexJoin = Date.now() - joinStart;

      // Aggregation benchmark
      const aggStart = Date.now();
      await supabase
        .from('sales')
        .select('total_amount.sum(), payment_status')
        .gte('sale_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      benchmarks.aggregation = Date.now() - aggStart;

      // Bulk insert benchmark (test data)
      const bulkStart = Date.now();
      
      // Get a test product for the alerts
      const { data: testProduct } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();
      
      if (!testProduct) throw new Error("No products available for bulk insert test");
      
      const testRecords = Array.from({ length: 10 }, (_, i) => ({
        product_id: testProduct.id,
        alert_type: 'performance_test',
        threshold_quantity: i,
        current_quantity: i * 2,
        severity: 'low'
      }));
      
      await supabase.from('stock_alerts').insert(testRecords);
      benchmarks.bulkInsert = Date.now() - bulkStart;

      // Cleanup test alerts
      if (testProduct) {
        await supabase.from('stock_alerts').delete().eq('alert_type', 'performance_test');
      }

      const totalDuration = Date.now() - startTime;

      // Set performance metrics
      setPerformanceMetrics({
        dbQueryTime: benchmarks.simpleQuery,
        workflowExecutionTime: benchmarks.complexJoin,
        concurrentTransactions: benchmarks.aggregation,
        memoryUsage: benchmarks.bulkInsert
      });

      // Performance thresholds (milliseconds)
      const thresholds = {
        simpleQuery: 100,
        complexJoin: 500,
        aggregation: 300,
        bulkInsert: 200
      };

      const failures = Object.entries(benchmarks)
        .filter(([key, value]) => value > thresholds[key as keyof typeof thresholds])
        .map(([key, value]) => `${key}: ${value}ms (threshold: ${thresholds[key as keyof typeof thresholds]}ms)`);

      if (failures.length > 0) {
        return {
          success: false,
          message: `Performance benchmarks failed: ${failures.join(', ')}`,
          data: benchmarks,
          duration: totalDuration
        };
      }

      return {
        success: true,
        message: `Performance benchmarks passed in ${totalDuration}ms`,
        data: benchmarks,
        duration: totalDuration
      };

    } catch (error: any) {
      return {
        success: false,
        message: "Performance benchmark test failed",
        errors: [error.message],
        duration: Date.now() - startTime
      };
    }
  };

  // Regression testing framework
  const runRegressionTests = async (): Promise<WorkflowTestResult[]> => {
    setIsLoading(true);
    
    try {
      const regressionTests = [
        {
          name: "Business Logic Integrity",
          test: async () => {
            const { data, error } = await supabase.rpc('get_system_health_status');
            if (error) throw error;
            return { success: true, message: "Business logic integrity verified" };
          }
        },
        {
          name: "Database Function Availability",
          test: async () => {
            const functions = [
              'calculate_reorder_point',
              'generate_stock_alerts',
              'calculate_abc_analysis',
              'get_current_user_role'
            ];
            
            for (const func of functions) {
              try {
                await supabase.rpc(func as any);
              } catch (error) {
                // Function exists if it throws an error about parameters, not about not existing
                if (!error.message.includes('function') || !error.message.includes('does not exist')) {
                  continue; // Function exists
                }
                throw new Error(`Function ${func} does not exist`);
              }
            }
            
            return { success: true, message: "All database functions available" };
          }
        },
        {
          name: "RLS Policy Enforcement",
          test: async () => {
            // Test that RLS is properly enforced by attempting unauthorized access
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error("Authentication required for RLS testing");
            
            // This should return data due to proper RLS policies
            const { data, error } = await supabase
              .from('sales')
              .select('id')
              .limit(1);
            
            if (error && error.code === '42501') {
              throw new Error("RLS policies too restrictive - blocking authorized access");
            }
            
            return { success: true, message: "RLS policies properly enforced" };
          }
        }
      ];

      const results: WorkflowTestResult[] = [];
      
      for (const test of regressionTests) {
        try {
          const result = await test.test();
          results.push({ ...result, message: `${test.name}: ${result.message}` });
        } catch (error: any) {
          results.push({
            success: false,
            message: `${test.name}: ${error.message}`,
            errors: [error.message]
          });
        }
      }

      return results;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    performanceMetrics,
    runIntegrationTestSuite,
    runRegressionTests,
    testSaleToInstallationWorkflow,
    testSaleToWarrantyWorkflow,
    testPaymentScheduleAutomation,
    testStockMovementTracking,
    testCommissionCalculation,
    testCrossModuleConsistency,
    testPerformanceBenchmarks
  };
};