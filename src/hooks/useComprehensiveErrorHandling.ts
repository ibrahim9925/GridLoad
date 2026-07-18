// @ts-nocheck
import { useCallback } from "react";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";
import { TestErrorHandler } from "@/utils/testErrorHandler";
import { TestDataEnhancer } from "@/utils/testDataEnhancer";
import { TestSchemaValidator } from "@/utils/testSchemaValidator";
import { supabase } from "@/integrations/supabase/client";

/**
 * CRITICAL: Comprehensive error handling and recovery tests
 * This ensures all database constraint violations are properly handled
 */
export const useComprehensiveErrorHandling = () => {
  
  const createErrorHandlingTests = useCallback((): BusinessTest[] => [
    {
      name: "Database Constraint Violation Handling",
      category: "Error Handling",
      description: "Test comprehensive error handling for all database constraint types",
      module: "System",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const testResults = [];
        
        try {
          // Test 1: Check constraint violations
          try {
            await supabase.from('containers').insert({
              container_number: TestDataEnhancer.generateUniqueId('TEST-CONT'),
              container_type: 'INVALID_TYPE', // Should fail
            });
            testResults.push({ test: 'check_constraint', passed: false, note: 'Should have failed but did not' });
          } catch (error: any) {
            const analysis = TestErrorHandler.analyzeError(error);
            testResults.push({ 
              test: 'check_constraint', 
              passed: analysis.type === 'CHECK_CONSTRAINT_VIOLATION',
              errorType: analysis.type,
              suggestion: analysis.suggestion
            });
          }

          // Test 2: Unique constraint violations
          const uniqueId = TestDataEnhancer.generateUniqueId('UNIQUE-TEST');
          try {
            // Create first record
            await supabase.from('customers').insert({
              company_name: uniqueId,
              contact_person: 'Test Contact',
              email: `${uniqueId}@test.com`
            });
            
            // Try to create duplicate - should fail
            await supabase.from('customers').insert({
              company_name: uniqueId,
              contact_person: 'Test Contact 2', 
              email: `${uniqueId}@test.com`
            });
            testResults.push({ test: 'unique_constraint', passed: false, note: 'Should have failed but did not' });
          } catch (error: any) {
            const analysis = TestErrorHandler.analyzeError(error);
            testResults.push({
              test: 'unique_constraint',
              passed: analysis.type === 'UNIQUE_CONSTRAINT_VIOLATION',
              errorType: analysis.type
            });
          } finally {
            // Cleanup
            await supabase.from('customers').delete().eq('company_name', uniqueId);
          }

          // Test 3: NOT NULL violations
          try {
            await supabase.from('products').insert({
              name: null, // Should fail - required field
              sku: TestDataEnhancer.generateUniqueSKU('NULL-TEST')
            });
            testResults.push({ test: 'not_null_constraint', passed: false, note: 'Should have failed but did not' });
          } catch (error: any) {
            const analysis = TestErrorHandler.analyzeError(error);
            testResults.push({
              test: 'not_null_constraint',
              passed: analysis.type === 'NOT_NULL_VIOLATION',
              errorType: analysis.type
            });
          }

          // Test 4: Foreign key violations
          try {
            await supabase.from('sale_items').insert({
              sale_id: '00000000-0000-0000-0000-000000000000', // Non-existent ID
              product_id: '00000000-0000-0000-0000-000000000001', 
              quantity: 1,
              unit_price: 100,
              line_total: 100
            });
            testResults.push({ test: 'foreign_key_constraint', passed: false, note: 'Should have failed but did not' });
          } catch (error: any) {
            const analysis = TestErrorHandler.analyzeError(error);
            testResults.push({
              test: 'foreign_key_constraint',
              passed: analysis.type === 'FOREIGN_KEY_VIOLATION',
              errorType: analysis.type
            });
          }

          const passedTests = testResults.filter(r => r.passed).length;
          const totalTests = testResults.length;

          return {
            success: passedTests === totalTests,
            message: `Error handling validation: ${passedTests}/${totalTests} tests passed`,
            details: { testResults, passedTests, totalTests },
            duration: Date.now() - startTime,
            testName: "Database Constraint Violation Handling",
            category: "Error Handling",
            priority: "Critical",
            module: "System"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Database Constraint Violation Handling");
        }
      }
    },

    {
      name: "Test Data Isolation and Cleanup",
      category: "Test Infrastructure",
      description: "Verify test data isolation and guaranteed cleanup",
      module: "Testing",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];
        
        try {
          // Create test data that should be cleaned up
          const { data: customer } = await TestDataEnhancer.createValidCustomer({
            company_name: `Cleanup Test ${TestDataEnhancer.generateUniqueId('CLEANUP')}`,
            contact_person: 'Cleanup Contact'
          });
          
          if (customer) {
            cleanup.push({ table: 'customers', id: customer.id });
          }

          const { data: product } = await TestDataEnhancer.createValidProduct({
            name: `Cleanup Product ${TestDataEnhancer.generateUniqueId('CLEANUP-PROD')}`,
            sku: TestDataEnhancer.generateUniqueSKU('CLEANUP')
          });
          
          if (product) {
            cleanup.push({ table: 'products', id: product.id });
          }

          // Test batch cleanup
          await TestDataEnhancer.batchCleanup(cleanup);

          // Verify cleanup - records should no longer exist
          const customerExists = await supabase
            .from('customers')
            .select('id')
            .eq('id', customer?.id || '')
            .single();

          const productExists = await supabase
            .from('products')
            .select('id')
            .eq('id', product?.id || '')
            .single();

          const cleanupSuccessful = !customerExists.data && !productExists.data;

          return {
            success: cleanupSuccessful,
            message: cleanupSuccessful ? "Test data isolation and cleanup successful" : "Cleanup verification failed",
            details: {
              recordsCreated: cleanup.length,
              customerCleaned: !customerExists.data,
              productCleaned: !productExists.data
            },
            duration: Date.now() - startTime,
            testName: "Test Data Isolation and Cleanup",
            category: "Test Infrastructure", 
            priority: "High",
            module: "Testing"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Test Data Isolation and Cleanup");
        }
      }
    }
  ], []);

  return {
    createErrorHandlingTests
  };
};