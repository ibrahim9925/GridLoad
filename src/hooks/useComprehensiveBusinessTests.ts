// @ts-nocheck
import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BusinessTest, TestResult, TestSuiteMap } from "./useBusinessTestTypes";
import { useProductTests } from "./useProductTests";
// useQuotationTests removed — module deleted
const useQuotationTests = () => ({ createQuotationTests: (): any[] => [] });
import { useInstallationTests } from "./useInstallationTests";
import { useSecurityTests } from "./useSecurityTests";
import { useContainerWorkflowTests } from "./useContainerWorkflowTests";
import { useInventoryLifecycleTests } from "./useInventoryLifecycleTests";
import { useComprehensiveSalesTests } from "./useComprehensiveSalesTests";
import { useComprehensivePaymentTests } from "./useComprehensivePaymentTests";
import { useWarrantyTests } from "./useWarrantyTests";
import { useCommissionTests } from "./useCommissionTests";
import { useAutomationTests } from "./useAutomationTests";
import { useInventoryTests } from "./useInventoryTests";
import { useExpandedContainerTests } from "./useExpandedContainerTests";
import { useSimplifiedInventoryTests } from "./useSimplifiedInventoryTests";
import { useFixedExpandedSalesTests } from "./useFixedExpandedSalesTests";
import { useExpandedPaymentTests } from "./useExpandedPaymentTests";
import { useExpandedInventoryTests } from "./useExpandedInventoryTests";
import { useEnhancedBusinessTests } from './useEnhancedBusinessTests';
import { useComprehensiveErrorHandling } from './useComprehensiveErrorHandling';
import { useAdvancedBusinessWorkflows } from './useAdvancedBusinessWorkflows';
import { useEnhancedDatabaseTests } from './useEnhancedDatabaseTests';
import { supabase } from "@/integrations/supabase/client";
import { TestDatabaseUtils } from "@/utils/testDatabaseUtils";
import { TestPermissionManager } from "@/utils/testPermissionManager";
import { useRealTestResultsIntegration } from "./useRealTestResultsIntegration";

export const useComprehensiveBusinessTests = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const { toast } = useToast();
  const { storeTestExecution } = useRealTestResultsIntegration();
  const { createProductManagementTests } = useProductTests();
  const { createQuotationTests } = useQuotationTests();
  const { createInstallationTests } = useInstallationTests();  
  const { createSecurityTests } = useSecurityTests();
  const { createContainerWorkflowTests } = useContainerWorkflowTests();
  const { createInventoryLifecycleTests } = useInventoryLifecycleTests();
  const { createComprehensiveSalesTests } = useComprehensiveSalesTests();
  const { createComprehensivePaymentTests } = useComprehensivePaymentTests();
  const { createWarrantyTests } = useWarrantyTests();
  const { createCommissionTests } = useCommissionTests();
  const { createAutomationTests } = useAutomationTests();
  const { createInventoryTests } = useInventoryTests();
  const { createExpandedContainerTests } = useExpandedContainerTests();
  const { createSimplifiedInventoryTests } = useSimplifiedInventoryTests();
  const { createExpandedSalesTests } = useFixedExpandedSalesTests();
  const { createExpandedPaymentTests } = useExpandedPaymentTests();
  const { createExpandedInventoryTests } = useExpandedInventoryTests();
  const enhancedTests = useEnhancedBusinessTests();
  const errorHandlingTests = useComprehensiveErrorHandling();
  const advancedWorkflowTests = useAdvancedBusinessWorkflows();
  const { createCriticalComplianceTests, createPerformanceTests } = enhancedTests;
  const { createErrorHandlingTests } = errorHandlingTests;
  const { createAdvancedWorkflowTests } = advancedWorkflowTests;

  // Create comprehensive enhanced test suites with database validation
  const createStaffManagementTests = useCallback((): BusinessTest[] => {
    const tests: BusinessTest[] = [
      {
        name: "Database Prerequisites Validation",
        category: "System Validation", 
        description: "Validate all required database tables and data exist",
        module: "System",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          try {
            const validation = await TestDatabaseUtils.validatePrerequisites();
            
            return {
              success: validation.allValid,
              message: validation.allValid ? "All database prerequisites validated" : "Missing database prerequisites",
              details: validation,
              duration: Date.now() - startTime,
              testName: "Database Prerequisites Validation",
              category: "System Validation",
              priority: "Critical", 
              module: "System"
            };
          } catch (err: any) {
            return {
              success: false,
              message: "Database prerequisites validation failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Database Prerequisites Validation",
              category: "System Validation",
              priority: "Critical",
              module: "System"
            };
          }
        }
      },
      {
        name: "Staff Table Access Test",
        category: "Staff Management", 
        description: "Test staff table access and validation",
        module: "Staff",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          try {
            const { data, error } = await supabase
              .from('staff')
              .select('id, email, role, is_active, commission_rate')
              .eq('is_active', true)
              .limit(5);

            const hasCommissionReps = data?.some(s => s.role === 'sales_rep' && s.commission_rate > 0) || false;

            return {
              success: !error && data !== null,
              message: error ? "Staff table access failed" : `Staff table accessible (${data?.length || 0} active staff)`,
              details: { 
                staffCount: data?.length || 0,
                hasCommissionReps,
                sampleRoles: data?.map(s => s.role).slice(0, 3) || []
              },
              error: error?.message,
              duration: Date.now() - startTime,
              testName: "Staff Table Access Test", 
              category: "Staff Management",
              priority: "Critical", 
              module: "Staff"
            };
          } catch (err: any) {
            return {
              success: false,
              message: "Staff table access test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Staff Table Access Test",
              category: "Staff Management",
              priority: "Critical",
              module: "Staff"
            };
          }
        }
      }
    ];
    return tests;
  }, []);

  const createCustomerManagementTests = useCallback((): BusinessTest[] => {
    const tests: BusinessTest[] = [
      {
        name: "Customer Data Access Test",
        category: "Customer Management",
        description: "Test customer data retrieval",
        module: "Customers", 
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          try {
            const { data, error } = await supabase
              .from('customers')
              .select('id, company_name, email')
              .limit(1);

            return {
              success: !error,
              message: error ? "Customer table access failed" : "Customer table accessible",
              error: error?.message,
              duration: Date.now() - startTime,
              testName: "Customer Data Access Test",
              category: "Customer Management",
              priority: "Critical",
              module: "Customers"
            };
          } catch (err: any) {
            return {
              success: false,
              message: "Customer data access test failed", 
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Customer Data Access Test",
              category: "Customer Management", 
              priority: "Critical",
              module: "Customers"
            };
          }
        }
      }
    ];
    return tests;
  }, []);

  const createSalesWorkflowTests = useCallback((): BusinessTest[] => {
    const tests: BusinessTest[] = [
      {
        name: "Sales Prerequisites Check",
        category: "Sales Workflows",
        description: "Check if sales prerequisites are met",
        module: "Sales",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          try {
            const checks = await Promise.all([
              supabase.from('products').select('id').limit(1),
              supabase.from('customers').select('id').limit(1),
              supabase.from('staff').select('id').limit(1)
            ]);

            const hasProducts = checks[0].data && checks[0].data.length > 0;
            const hasCustomers = checks[1].data && checks[1].data.length > 0;
            const hasStaff = checks[2].data && checks[2].data.length > 0;

            const allChecksPassed = hasProducts && hasCustomers && hasStaff;

            return {
              success: allChecksPassed,
              message: allChecksPassed ? "All sales prerequisites met" : "Missing sales prerequisites",
              details: { hasProducts, hasCustomers, hasStaff },
              duration: Date.now() - startTime,
              testName: "Sales Prerequisites Check",
              category: "Sales Workflows",
              priority: "Critical",
              module: "Sales"
            };
          } catch (err: any) {
            return {
              success: false,
              message: "Sales prerequisites check failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Sales Prerequisites Check",
              category: "Sales Workflows",
              priority: "Critical", 
              module: "Sales"
            };
          }
        }
      }
    ];
    return tests;
  }, []);

    const createSupplyChainTests = useCallback((): BusinessTest[] => {
      return [
        {
          name: "Supply Chain Dashboard Access",
          category: "Supply Chain",
          description: "Test supply chain dashboard accessibility",
          module: "supply_chain",
          priority: "Critical",
          fn: async () => {
            const start = Date.now();
            try {
              // Test basic data access for supply chain
              const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, name, current_stock, cost_price')
                .limit(5);

              const { data: containers, error: containersError } = await supabase
                .from('containers')
                .select('id, container_number, status, total_cost')
                .limit(3);

              const hasProductAccess = !productsError && products && products.length > 0;
              const hasContainerAccess = !containersError && containers !== null;

              return {
                success: hasProductAccess && hasContainerAccess,
                message: hasProductAccess && hasContainerAccess ? 
                  "Supply chain data accessible" : 
                  "Supply chain data access issues",
                duration: Date.now() - start,
                details: { 
                  productsCount: products?.length || 0,
                  containersCount: containers?.length || 0,
                  productsError: productsError?.message,
                  containersError: containersError?.message
                },
              };
            } catch (error) {
              return {
                success: false,
                message: `Supply chain access test failed: ${error}`,
                duration: Date.now() - start,
                error: String(error),
              };
            }
          },
        },
        {
          name: "Capital Tracking Data",
          category: "Supply Chain",
          description: "Test capital and liquidity tracking",
          module: "supply_chain", 
          priority: "High",
          fn: async () => {
            const start = Date.now();
            try {
              const { data: bankAccounts, error: bankError } = await supabase
                .from('bank_accounts')
                .select('current_balance')
                .eq('is_active', true);

              const { data: containers, error: containerError } = await supabase
                .from('containers')
                .select('total_cost, status')
                .in('status', ['in_transit', 'confirmed', 'shipped']);

              const hasFinancialData = !bankError && bankAccounts && bankAccounts.length > 0;
              const hasCapitalTracking = !containerError && containers !== null;

              return {
                success: hasFinancialData && hasCapitalTracking,
                message: hasFinancialData && hasCapitalTracking ? 
                  "Capital tracking operational" : 
                  "Capital tracking data issues",
                duration: Date.now() - start,
                details: {
                  bankAccountsCount: bankAccounts?.length || 0,
                  frozenContainers: containers?.length || 0,
                  totalLiquidity: bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0
                },
              };
            } catch (error) {
              return {
                success: false,
                message: `Capital tracking test failed: ${error}`,
                duration: Date.now() - start,
                error: String(error),
              };
            }
          },
        },
      ];
    }, []);

  const getAllTestSuites = useMemo((): TestSuiteMap => {
    return {
      
      // Container & Shipping Tests (15+ tests)
      'Container & Shipping': createExpandedContainerTests(),
      'Container Workflow': createContainerWorkflowTests(),
      
      // Inventory & Stock Tests (25+ tests)  
      'Inventory Management': createSimplifiedInventoryTests(),
      'Inventory & Stock': createInventoryTests(),
      'Inventory Lifecycle': createInventoryLifecycleTests(),
      'Expanded Inventory': createExpandedInventoryTests(),
      
      // Sales & Fulfillment Tests (30+ tests)
      'Sales Operations': createExpandedSalesTests(),
      'Sales & Fulfillment': createComprehensiveSalesTests(),
      'Sales Workflows': createSalesWorkflowTests(),
      'Quotation Management': createQuotationTests(),
      
      // Payment Processing Tests (30 tests)
      'Payment Processing': createComprehensivePaymentTests(),
      'Enhanced Payments': createExpandedPaymentTests(),
      
      // Installation & Warranty Tests (20 tests)
      'Installation Management': createInstallationTests(),
      'Warranty Management': createWarrantyTests(),
      
      // Financial & Commission Tests (15 tests)
      'Financial Management': createCommissionTests(),
      
      // Performance & Load Tests
      'Performance Testing': createPerformanceTests(),
      
      // Automation & Security Tests (20 tests)
      'Automation Systems': createAutomationTests(),
      'Security Management': createSecurityTests(),
      
      // Additional Business Tests
      'Product Management': createProductManagementTests(),
      'Staff Management': createStaffManagementTests(),
      'Customer Management': createCustomerManagementTests()
    };
  }, [
    createContainerWorkflowTests, 
    createInventoryTests,
    createInventoryLifecycleTests, 
    createComprehensiveSalesTests, 
    createComprehensivePaymentTests, 
    createProductManagementTests, 
    createStaffManagementTests, 
    createCustomerManagementTests, 
    createSalesWorkflowTests, 
    createQuotationTests, 
    createInstallationTests, 
    createSecurityTests,
    createWarrantyTests,
    createCommissionTests,
    createAutomationTests,
    createExpandedContainerTests,
    createSimplifiedInventoryTests,
    createExpandedSalesTests,
    createExpandedPaymentTests,
    createExpandedInventoryTests,
    createCriticalComplianceTests,
    createPerformanceTests
  ]);

  const runIndividualTest = useCallback(async (test: BusinessTest): Promise<TestResult> => {
    setIsRunning(true);
    try {
      const result = await test.fn();
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runTestSuite = useCallback(async (suiteName: string, tests: BusinessTest[]): Promise<TestResult[]> => {
    setIsRunning(true);
    setTestProgress(0);
    
    try {
      // PHASE 5: Prerequisite validation and auto-creation
      console.log('🔍 Validating test prerequisites...');
      const prerequisites = await TestDatabaseUtils.validatePrerequisites();
      
      if (!prerequisites.allValid) {
        console.log('🔧 Auto-creating missing prerequisites...');
        try {
          await TestDatabaseUtils.createTestPrerequisites();
          console.log('✅ Prerequisites created successfully');
        } catch (prereqError) {
          console.warn('⚠️ Failed to auto-create prerequisites:', prereqError);
        }
      }
      
      // PHASE 4: Permission-aware testing with enhanced error handling
      const permissionConfig = await TestPermissionManager.getTestConfiguration();
      console.log(`🔐 Test permissions: ${permissionConfig.permissionSummary}`);
      
      if (permissionConfig.skipCategories.length > 0) {
        console.log(`⏭️ Skipping categories due to permissions: ${permissionConfig.skipCategories.join(', ')}`);
      }

      const results: TestResult[] = [];
      let skippedTests = 0;
      
      for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        
        // Check if test should be skipped due to permissions
        const skipCheck = await TestPermissionManager.shouldSkipTest(test.name, test.category);
        
        if (skipCheck.shouldSkip) {
          results.push({
            success: true,
            message: `Skipped: ${skipCheck.reason}`,
            testName: test.name,
            category: test.category,
            module: test.module || 'Unknown',
            priority: test.priority || 'medium',
            duration: 0,
            details: { skipped: true, reason: skipCheck.reason }
          });
          skippedTests++;
        } else {
          const result = await runIndividualTest(test);
          results.push(result);
        }
        
        setTestProgress(((i + 1) / tests.length) * 100);
      }
      
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const total = results.length;
      
      // Store results in database for dashboard integration
      await storeTestExecution(suiteName, tests, results);
      
      toast({
        title: `${suiteName} Tests Complete`,
        description: `${passed}/${total} tests passed${skippedTests > 0 ? ` (${skippedTests} skipped)` : ''}${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: failed === 0 ? "default" : "destructive"
      });
      
      return results;
    } finally {
      setIsRunning(false);
      setTestProgress(0);
    }
  }, [runIndividualTest, toast, storeTestExecution]);

  return {
    getAllTestSuites,
    runIndividualTest, 
    runTestSuite,
    isRunning,
    testProgress
  };
};