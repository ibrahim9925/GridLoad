// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
  duration: number;
  testName?: string;
  category?: string;
  priority?: string;
  module?: string;
}

/**
 * Quick test validation runner to verify infrastructure fixes
 */
export class TestValidationRunner {
  
  /**
   * Run quick validation tests to check if infrastructure fixes worked
   */
  static async runQuickValidationTests() {
    try {
      console.log('🧪 Running quick validation tests...');
      
      const testResults = {
        commissionCalculationTest: await this.testCommissionCalculation(),
        priceCalculationsTest: await this.testPriceCalculations(),
        salesPrerequisitesTest: await this.testSalesPrerequisites(),
        staffInfrastructureTest: await this.testStaffInfrastructure(),
        summary: null as any
      };
      
      // Calculate overall results
      const totalTests = 4;
      const passedTests = Object.values(testResults).filter(test => test && typeof test === 'object' && test.success).length;
      const passRate = Math.round((passedTests / totalTests) * 100);
      
      testResults.summary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        passRate,
        improved: passRate >= 85 // Target 85%+ pass rate
      };
      
      console.log(`✅ Quick validation completed: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
      
      return testResults;
    } catch (error) {
      console.error('❌ Quick validation failed:', error);
      throw error;
    }
  }
  
  /**
   * Test Commission Calculation functionality
   */
  static async testCommissionCalculation(): Promise<TestResult> {
    const startTime = performance.now();
    try {
      // Enhanced query to properly detect commission rates
      const { data: salesReps, error } = await supabase
        .from('staff')
        .select('id, email, full_name, commission_rate')
        .eq('role', 'sales_rep')
        .eq('is_active', true)
        .not('commission_rate', 'is', null)
        .gt('commission_rate', 0);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Also check using RPC for validation
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_test_infrastructure');

      const detectedRates = (validationData as any)?.commission_rates_detected || [];

      if ((!salesReps || salesReps.length === 0) && detectedRates.length === 0) {
        return {
          success: false,
          message: 'No active sales reps with commission rates found',
          details: { 
            expected: 'At least 2 sales reps with commission rate > 0 (John: 5%, Jane: 7.5%)',
            found: 0,
            validation_check: detectedRates,
            issue: 'Staff infrastructure not properly configured or commission rates not set'
          },
          duration: performance.now() - startTime
        };
      }

      const activeReps = salesReps || detectedRates;
      
      if (activeReps.length < 2) {
        return {
          success: false,
          message: `Only ${activeReps.length} sales rep found, expected at least 2`,
          details: { 
            expected: 'At least 2 sales reps (John: 5%, Jane: 7.5%)',
            found: activeReps.length,
            commission_rates: activeReps.map(rep => ({
              name: rep.full_name || rep.email,
              rate: rep.commission_rate
            }))
          },
          duration: performance.now() - startTime
        };
      }

      // Test commission calculation for sample reps
      const testSaleAmount = 1000;
      const calculations = activeReps.map(rep => ({
        rep: rep.full_name || rep.email,
        rate: rep.commission_rate,
        test_amount: testSaleAmount,
        calculated_commission: testSaleAmount * (rep.commission_rate / 100)
      }));

      return {
        success: true,
        message: `Commission calculation verified for ${activeReps.length} sales reps`,
        details: { 
          sales_reps_found: activeReps.length,
          expected_reps: ['John Sales Rep (5%)', 'Jane Sales Rep (7.5%)'],
          calculations,
          commission_rates: activeReps.map(rep => ({
            name: rep.full_name || rep.email,
            rate: rep.commission_rate
          })),
          validation_source: salesReps?.length > 0 ? 'direct_query' : 'rpc_validation'
        },
        duration: performance.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        message: 'Commission calculation test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };
    }
  }
  
  /**
   * Test Price Calculations functionality
   */
  static async testPriceCalculations(): Promise<TestResult> {
    const startTime = performance.now();
    try {
      // Enhanced product pricing validation with RPC support
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, cost_price, standard_selling_price, min_selling_price, max_selling_price')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Also get validation data from RPC
      const { data: validationData } = await supabase
        .rpc('validate_test_infrastructure');

      const validProductsFromRPC = (validationData as any)?.valid_products_count || 0;

      if (!products || products.length === 0) {
        return {
          success: false,
          message: 'No active products found',
          details: { 
            expected: 'At least 100 active products with valid pricing', 
            found: 0,
            rpc_validation: validProductsFromRPC
          },
          duration: performance.now() - startTime
        };
      }

      // Enhanced validation: standard_selling_price > cost_price AND > 0
      const invalidProducts = products.filter(p => 
        !p.standard_selling_price || 
        p.standard_selling_price <= (p.cost_price || 0) ||
        p.standard_selling_price <= 0
      );

      const validProducts = products.filter(p => 
        p.standard_selling_price && 
        p.standard_selling_price > (p.cost_price || 0) &&
        p.standard_selling_price > 0
      );

      // Check if pricing rules are properly applied
      const wellStructuredProducts = validProducts.filter(p => 
        p.min_selling_price && 
        p.max_selling_price &&
        p.min_selling_price <= p.standard_selling_price &&
        p.standard_selling_price <= p.max_selling_price
      );

      if (invalidProducts.length > 0) {
        return {
          success: false,
          message: `${invalidProducts.length} products have invalid pricing (expected 0)`,
          details: {
            total_products: products.length,
            valid_products: validProducts.length,
            invalid_products: invalidProducts.length,
            well_structured: wellStructuredProducts.length,
            rpc_validation_count: validProductsFromRPC,
            invalid_examples: invalidProducts.slice(0, 3).map(p => ({
              name: p.name,
              cost_price: p.cost_price,
              selling_price: p.standard_selling_price,
              min_price: p.min_selling_price,
              max_price: p.max_selling_price,
              issue: !p.standard_selling_price ? 'missing_selling_price' : 
                     p.standard_selling_price <= 0 ? 'zero_selling_price' :
                     'selling_price_not_above_cost'
            })),
            remediation_needed: true
          },
          duration: performance.now() - startTime
        };
      }

      return {
        success: true,
        message: `Price calculations verified for ${validProducts.length} products (${wellStructuredProducts.length} fully structured)`,
        details: {
          total_products: products.length,
          valid_products: validProducts.length,
          invalid_products: 0,
          well_structured: wellStructuredProducts.length,
          rpc_validation_count: validProductsFromRPC,
          pricing_compliance: '100%',
          sample_pricing: validProducts.slice(0, 3).map(p => ({
            name: p.name,
            cost_price: p.cost_price,
            selling_price: p.standard_selling_price,
            min_price: p.min_selling_price,
            max_price: p.max_selling_price,
            margin: ((p.standard_selling_price - (p.cost_price || 0)) / p.standard_selling_price * 100).toFixed(1) + '%'
          }))
        },
        duration: performance.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        message: 'Price calculations test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };
    }
  }
  
  /**
   * Test Sales Prerequisites
   */
  static async testSalesPrerequisites(): Promise<TestResult> {
    const startTime = performance.now();
    try {
      // Enhanced prerequisites check with orphaned sales detection
      const [customersResult, productsResult, salesRepsResult, salesResult] = await Promise.all([
        supabase.from('customers').select('id').limit(1),
        supabase.from('products').select('id').eq('is_active', true).limit(1),
        supabase.from('staff').select('id, full_name, commission_rate').eq('role', 'sales_rep').eq('is_active', true),
        supabase.from('sales').select('id, sales_rep_id').limit(100)
      ]);

      const issues = [];
      
      if (customersResult.error) {
        throw new Error(`Customers query failed: ${customersResult.error.message}`);
      }
      if (productsResult.error) {
        throw new Error(`Products query failed: ${productsResult.error.message}`);
      }
      if (salesRepsResult.error) {
        throw new Error(`Sales reps query failed: ${salesRepsResult.error.message}`);
      }

      // Check for orphaned sales (sales without valid sales_rep_id)
      const orphanedSales = salesResult.data?.filter(sale => 
        !sale.sales_rep_id || !salesRepsResult.data?.find(rep => rep.id === sale.sales_rep_id)
      ) || [];

      if (!customersResult.data || customersResult.data.length === 0) {
        issues.push('No customers found');
      }
      
      if (!productsResult.data || productsResult.data.length === 0) {
        issues.push('No active products found');
      }
      
      if (!salesRepsResult.data || salesRepsResult.data.length === 0) {
        issues.push('No active sales representatives found');
      } else if (salesRepsResult.data.length < 2) {
        issues.push(`Only ${salesRepsResult.data.length} sales rep found, expected at least 2`);
      }

      // Check for commission rates
      const repsWithoutCommission = salesRepsResult.data?.filter(rep => 
        !rep.commission_rate || rep.commission_rate <= 0
      ) || [];

      if (repsWithoutCommission.length > 0) {
        issues.push(`${repsWithoutCommission.length} sales reps missing commission rates`);
      }

      if (orphanedSales.length > 0) {
        issues.push(`${orphanedSales.length} orphaned sales found (no valid sales rep assigned)`);
      }

      // Use RPC validation as additional check
      const { data: validationData } = await supabase
        .rpc('validate_test_infrastructure');

      const rpcSalesWithReps = (validationData as any)?.sales_with_reps || 0;

      if (issues.length > 0) {
        return {
          success: false,
          message: `Sales prerequisites not met: ${issues.join(', ')}`,
          details: {
            customers: customersResult.data?.length || 0,
            products: productsResult.data?.length || 0,
            sales_reps: salesRepsResult.data?.length || 0,
            sales_with_valid_reps: rpcSalesWithReps,
            orphaned_sales: orphanedSales.length,
            reps_with_commission: (salesRepsResult.data?.length || 0) - repsWithoutCommission.length,
            commission_issues: repsWithoutCommission.map(rep => ({
              name: rep.full_name,
              rate: rep.commission_rate
            })),
            issues,
            remediation_needed: orphanedSales.length > 0 || repsWithoutCommission.length > 0
          },
          duration: performance.now() - startTime
        };
      }

      return {
        success: true,
        message: 'All sales prerequisites verified',
        details: {
          customers: customersResult.data.length,
          products: productsResult.data.length,
          sales_reps: salesRepsResult.data.length,
          sales_with_valid_reps: rpcSalesWithReps,
          orphaned_sales: 0,
          sales_rep_details: salesRepsResult.data.map(rep => ({
            name: rep.full_name,
            commission_rate: rep.commission_rate
          })),
          prerequisites_met: true
        },
        duration: performance.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        message: 'Sales prerequisites test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };
    }
  }
  
  /**
   * Test Staff Infrastructure
   */
  static async testStaffInfrastructure(): Promise<TestResult> {
    const startTime = performance.now();
    try {
      const { data: staff, error } = await supabase
        .from('staff')
        .select('id, role, commission_rate, is_active, full_name, email')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      
      if (!staff || staff.length === 0) {
        return {
          success: false,
          message: 'No active staff found',
          details: { 
            staffCount: 0,
            expected_roles: ['admin', 'sales_rep', 'accountant', 'warehouse', 'installer'],
            remediation_needed: true
          },
          duration: performance.now() - startTime
        };
      }
      
      const staffByRole = {
        admin: staff.filter(s => s.role === 'admin').length,
        sales_rep: staff.filter(s => s.role === 'sales_rep').length,
        accountant: staff.filter(s => s.role === 'accountant').length,
        warehouse: staff.filter(s => s.role === 'warehouse').length,
        installer: staff.filter(s => s.role === 'installer').length
      };
      
      const salesRepsWithCommission = staff.filter(s => 
        s.role === 'sales_rep' && s.commission_rate > 0
      );
      
      const infrastructureComplete = (
        staffByRole.admin >= 1 &&
        salesRepsWithCommission.length >= 2 &&
        staffByRole.accountant >= 1 &&
        staffByRole.warehouse >= 1 &&
        staffByRole.installer >= 1
      );

      const detailedSalesReps = salesRepsWithCommission.map(rep => ({
        name: rep.full_name || rep.email,
        commission_rate: rep.commission_rate,
        expected: rep.email?.includes('sales1') ? '5.0%' : 
                  rep.email?.includes('sales2') ? '7.5%' : 'N/A'
      }));
      
      if (!infrastructureComplete) {
        const missingRoles = [];
        if (staffByRole.admin < 1) missingRoles.push('admin');
        if (salesRepsWithCommission.length < 2) missingRoles.push(`sales_rep (${salesRepsWithCommission.length}/2 with commission)`);
        if (staffByRole.accountant < 1) missingRoles.push('accountant');
        if (staffByRole.warehouse < 1) missingRoles.push('warehouse');
        if (staffByRole.installer < 1) missingRoles.push('installer');

        return {
          success: false,
          message: `Staff infrastructure incomplete - missing: ${missingRoles.join(', ')}`,
          details: {
            totalStaff: staff.length,
            roleDistribution: staffByRole,
            salesRepsWithCommission: salesRepsWithCommission.length,
            salesRepDetails: detailedSalesReps,
            missingRoles,
            infrastructureComplete: false,
            remediation_needed: true
          },
          duration: performance.now() - startTime
        };
      }
      
      return {
        success: true,
        message: `Staff infrastructure complete - all ${Object.keys(staffByRole).length} roles covered`,
        details: {
          totalStaff: staff.length,
          roleDistribution: staffByRole,
          salesRepsWithCommission: salesRepsWithCommission.length,
          salesRepDetails: detailedSalesReps,
          infrastructureComplete: true,
          expected_sales_reps: ['John Sales Rep (5%)', 'Jane Sales Rep (7.5%)'],
          actual_commission_rates: detailedSalesReps.map(rep => `${rep.name} (${rep.commission_rate}%)`)
        },
        duration: performance.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        message: 'Staff infrastructure test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };
    }
  }
}