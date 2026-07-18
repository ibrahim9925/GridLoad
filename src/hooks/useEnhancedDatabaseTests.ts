// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';
import { TestDatabaseUtils } from '@/utils/testDatabaseUtils';
import { TestErrorHandler } from '@/utils/testErrorHandler';

export const useEnhancedDatabaseTests = () => {
  const createEnhancedDatabaseTests = useCallback((): BusinessTest[] => [
    {
      name: "Database Prerequisites Validation",
      category: "Database Infrastructure",
      description: "Validate all test prerequisites are properly created",
      module: "Database",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Test prerequisite validation
          const prerequisites = await TestDatabaseUtils.validatePrerequisites();
          
          if (!prerequisites.allValid) {
            // If validation fails, try to create prerequisites
            const created = await TestDatabaseUtils.createTestPrerequisites();
            
            // Re-validate
            const revalidation = await TestDatabaseUtils.validatePrerequisites();
            
            return {
              success: revalidation.allValid,
              message: revalidation.allValid ? 
                "Prerequisites created and validated successfully" :
                "Failed to create valid prerequisites",
              details: {
                initialValidation: prerequisites,
                createdPrerequisites: !!created,
                finalValidation: revalidation
              },
              duration: Date.now() - startTime
            };
          }

          return {
            success: true,
            message: "All database prerequisites are valid",
            details: prerequisites,
            duration: Date.now() - startTime
          };
        } catch (error: any) {
          TestErrorHandler.handleTestError(error, 'Database Prerequisites Validation');
          return {
            success: false,
            message: `Prerequisites validation failed: ${error.message}`,
            error: error.message,
            duration: Date.now() - startTime
          };
        }
      }
    },

    {
      name: "Enum Values Compliance Test",
      category: "Database Constraints",
      description: "Test all enum values are compliant with database schema",
      module: "Database",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const testResults: any[] = [];
        
        try {
          // Test container enum values
          const containerData = {
            container_number: TestDatabaseUtils.generateUniqueContainerNumber(),
            container_type: TestDatabaseUtils.getRandomEnum('containerType') as "20ft" | "40ft",
            status: TestDatabaseUtils.getRandomEnum('containerStatus') as "ordered" | "confirmed" | "shipped" | "in_transit" | "port_arrival" | "customs_cleared" | "completed",
            order_date: new Date().toISOString().split('T')[0],
            cbm_capacity: 50
          };

          const { data: container, error: containerError } = await supabase
            .from('containers')
            .insert(containerData)
            .select()
            .single();

          testResults.push({
            table: 'containers',
            success: !containerError,
            error: containerError?.message,
            data: containerData
          });

          // Test bank ledger enum values
          const { staff } = await TestDatabaseUtils.createTestPrerequisites();
          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'Test Bank Account',
              currency: 'USD',
              current_balance: 1000
            })
            .select()
            .single();

          if (bankAccount) {
            const bankLedgerData = {
              bank_account_id: bankAccount.id,
              transaction_type: TestDatabaseUtils.getRandomEnum('transactionType'),
              currency: 'USD',
              amount: 500,
              reference_number: TestDatabaseUtils.generateUniqueReferenceNumber(),
              created_by: staff.id
            };

            const { error: ledgerError } = await supabase
              .from('bank_ledger')
              .insert(bankLedgerData);

            testResults.push({
              table: 'bank_ledger',
              success: !ledgerError,
              error: ledgerError?.message,
              data: bankLedgerData
            });
          }

          // Cleanup
          await TestDatabaseUtils.cleanupTestData();

          const allPassed = testResults.every(result => result.success);

          return {
            success: allPassed,
            message: allPassed ? 
              "All enum values are compliant with database schema" :
              "Some enum values failed validation",
            details: {
              totalTests: testResults.length,
              passedTests: testResults.filter(r => r.success).length,
              failedTests: testResults.filter(r => !r.success),
              results: testResults
            },
            duration: Date.now() - startTime
          };
        } catch (error: any) {
          TestErrorHandler.handleTestError(error, 'Enum Values Compliance Test');
          return {
            success: false,
            message: `Enum compliance test failed: ${error.message}`,
            error: error.message,
            details: { testResults },
            duration: Date.now() - startTime
          };
        }
      }
    },

    {
      name: "Foreign Key Relationships Test",
      category: "Database Integrity",
      description: "Test all foreign key relationships work correctly",
      module: "Database",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const prerequisites = await TestDatabaseUtils.createTestPrerequisites();
          const { staff, customer, product } = prerequisites;

          // Test complete sales workflow with foreign keys
          const saleData = {
            customer_id: customer.id,
            sales_rep_id: staff.id,
            created_by: staff.id,
            sale_date: new Date().toISOString().split('T')[0],
            subtotal: 1000,
            tax_amount: 100,
            total_amount: 1100,
            payment_status: TestDatabaseUtils.getRandomEnum('paymentStatus') as "pending" | "partial_paid" | "paid" | "overdue" | "cancelled",
            fulfillment_status: TestDatabaseUtils.getRandomEnum('fulfillmentStatus') as "pending" | "packed" | "shipped" | "delivered" | "cancelled",
            invoice_number: TestDatabaseUtils.generateUniqueId('INV')
          };

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert(saleData)
            .select()
            .single();

          if (saleError) throw saleError;

          // Test sale items foreign key
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: 2,
              unit_price: 500,
              line_total: 1000
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Test payment foreign key
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: 500,
              payment_method: TestDatabaseUtils.getRandomEnum('paymentMethod') as "cash" | "check" | "bank_transfer" | "credit_card" | "other",
              reference_number: TestDatabaseUtils.generateUniqueReferenceNumber(),
              recorded_by: staff.id
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Verify relationships with joined query
          const { data: completeRecord, error: joinError } = await supabase
            .from('sales')
            .select(`
              *,
              customers(*),
              staff(*),
              sale_items(*, products(*)),
              payments(*)
            `)
            .eq('id', sale.id)
            .single();

          if (joinError) throw joinError;

          const relationshipsValid = completeRecord.customers && 
                                   completeRecord.staff && 
                                   completeRecord.sale_items?.length > 0 &&
                                   completeRecord.payments?.length > 0;

          // Cleanup
          await TestDatabaseUtils.cleanupTestData();

          return {
            success: relationshipsValid,
            message: relationshipsValid ? 
              "All foreign key relationships working correctly" :
              "Foreign key relationships have issues",
            details: {
              saleId: sale.id,
              hasCustomer: !!completeRecord.customers,
              hasStaff: !!completeRecord.staff,
              saleItemsCount: completeRecord.sale_items?.length || 0,
              paymentsCount: completeRecord.payments?.length || 0,
              completeRecord
            },
            duration: Date.now() - startTime
          };
        } catch (error: any) {
          TestErrorHandler.handleTestError(error, 'Foreign Key Relationships Test');
          return {
            success: false,
            message: `Foreign key test failed: ${error.message}`,
            error: error.message,
            duration: Date.now() - startTime
          };
        }
      }
    },

    {
      name: "Unique Constraint Validation Test",
      category: "Database Constraints",
      description: "Test unique constraints prevent duplicate records",
      module: "Database",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Test product SKU uniqueness
          const uniqueSKU = TestDatabaseUtils.generateUniqueSKU();
          
          // Create first product
          const { data: product1, error: error1 } = await supabase
            .from('products')
            .insert({
              name: 'First Test Product',
              sku: uniqueSKU,
              category: 'Test',
              cost_price: 100,
              standard_selling_price: 150,
              current_stock: 10,
              is_active: true,
              description: 'First test product'
            })
            .select()
            .single();

          if (error1) throw error1;

          // Try to create second product with same SKU (should fail)
          const { error: error2 } = await supabase
            .from('products')
            .insert({
              name: 'Second Test Product',
              sku: uniqueSKU,
              category: 'Test',
              cost_price: 100,
              standard_selling_price: 150,
              current_stock: 10,
              is_active: true,
              description: 'Second test product'
            });

          // Should have error due to unique constraint
          const uniqueConstraintWorking = !!error2 && error2.message.includes('duplicate');

          // Test staff email uniqueness
          const uniqueEmail = `test-${Date.now()}@example.com`;
          
          const { data: staff1, error: staffError1 } = await supabase
            .from('staff')
            .insert({
              id: crypto.randomUUID(),
              email: uniqueEmail,
              full_name: 'First Staff',
              role: 'sales_rep',
              is_active: true
            })
            .select()
            .single();

          if (staffError1) throw staffError1;

          // Try duplicate email (should fail)
          const { error: staffError2 } = await supabase
            .from('staff')
            .insert({
              id: crypto.randomUUID(),
              email: uniqueEmail,
              full_name: 'Second Staff',
              role: 'sales_rep',
              is_active: true
            });

          const emailConstraintWorking = !!staffError2 && staffError2.message.includes('duplicate');

          // Cleanup
          await TestDatabaseUtils.cleanupTestData();

          const allConstraintsWorking = uniqueConstraintWorking && emailConstraintWorking;

          return {
            success: allConstraintsWorking,
            message: allConstraintsWorking ? 
              "All unique constraints working correctly" :
              "Some unique constraints are not enforced",
            details: {
              skuConstraintWorking: uniqueConstraintWorking,
              emailConstraintWorking: emailConstraintWorking,
              testedSKU: uniqueSKU,
              testedEmail: uniqueEmail
            },
            duration: Date.now() - startTime
          };
        } catch (error: any) {
          TestErrorHandler.handleTestError(error, 'Unique Constraint Validation Test');
          return {
            success: false,
            message: `Unique constraint test failed: ${error.message}`,
            error: error.message,
            duration: Date.now() - startTime
          };
        }
      }
    }
  ], []);

  return { createEnhancedDatabaseTests };
};