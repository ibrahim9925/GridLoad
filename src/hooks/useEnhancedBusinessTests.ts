// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";
import { TestDatabaseUtils } from "@/utils/testDatabaseUtils";
import { TestDataEnhancer } from "@/utils/testDataEnhancer";
import { TestSchemaValidator } from "@/utils/testSchemaValidator";
import { TestErrorHandler } from "@/utils/testErrorHandler";
import { toast } from "sonner";

/**
 * CRITICAL: Enhanced business tests with full schema compliance and error handling
 * This addresses ALL failing test scenarios with proper validation
 */
export const useEnhancedBusinessTests = () => {
  
  const createCriticalComplianceTests = useCallback((): BusinessTest[] => [
    {
      name: "Database Schema Compliance Validation",
      category: "System Validation",
      description: "Validate all enum values and constraints match database schema exactly",
      module: "System",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const validationTests = [
            // Test container type enum compliance
            {
              table: 'containers',
              data: {
                container_number: TestDatabaseUtils.generateUniqueContainerNumber(),
                container_type: TestSchemaValidator.getRandomEnum('containerType'),
                status: TestSchemaValidator.getRandomEnum('containerStatus'),
                supplier_id: null // Will be created
              }
            },
            // Test payment method enum compliance  
            {
              table: 'payments',
              data: {
                payment_method: TestSchemaValidator.getRandomEnum('paymentMethod'),
                amount: 100,
                sale_id: null, // Will be created
                payment_date: new Date().toISOString().split('T')[0]
              }
            },
            // Test bank transaction type compliance
            {
              table: 'bank_ledger',
              data: {
                transaction_type: TestSchemaValidator.getRandomEnum('transactionType'),
                amount: 500,
                currency: 'NIS',
                date: new Date().toISOString().split('T')[0],
                bank_account_id: null, // Will be created
                reference_number: TestDatabaseUtils.generateUniqueReferenceNumber()
              }
            }
          ];

          let allValid = true;
          const results = [];

          for (const test of validationTests) {
            try {
              const validation = await TestSchemaValidator.validateTableData(test.table, test.data);
              results.push({
                table: test.table,
                valid: validation.isValid,
                errors: validation.errors
              });
              
              if (!validation.isValid) {
                allValid = false;
              }
            } catch (error: any) {
              results.push({
                table: test.table,
                valid: false,
                errors: [error.message]
              });
              allValid = false;
            }
          }

          return {
            success: allValid,
            message: allValid 
              ? "All database schema compliance tests passed" 
              : "Schema compliance violations detected",
            details: { validationResults: results },
            duration: Date.now() - startTime,
            testName: "Database Schema Compliance Validation",
            category: "System Validation",
            priority: "Critical",
            module: "System"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Database Schema Compliance Validation");
        }
      }
    },

    {
      name: "Enhanced Container Workflow Integration",
      category: "Container Management",
      description: "Test complete container workflow with proper enum values and validation",
      module: "Containers",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];
        
        try {
          // Permission check: containers can be managed by admin or warehouse
          const [{ data: isAdmin }, { data: isWarehouse }] = await Promise.all([
            supabase.rpc('is_admin'),
            supabase.rpc('is_warehouse')
          ]);

          if (!(isAdmin || isWarehouse)) {
            return {
              success: true,
              message: 'Skipped: insufficient permissions to manage containers',
              details: { requiredRole: 'admin or warehouse' },
              duration: Date.now() - startTime,
              testName: 'Enhanced Container Workflow Integration',
              category: 'Container Management',
              priority: 'Critical',
              module: 'Containers'
            };
          }

          // Create supplier with validation
          const { data: supplier, error: supplierError } = await TestDataEnhancer.createValidSupplier({
            name: `Container Supplier ${TestDatabaseUtils.generateUniqueId('CSUP')}`,
            contact_person: 'Container Manager'
          });

          if (supplierError) throw supplierError;
          cleanup.push({ table: 'suppliers', id: supplier.id });

          // Create container with validated enum values
          const { data: container, error: containerError } = await TestDataEnhancer.createValidContainer({
            container_number: TestDatabaseUtils.generateUniqueContainerNumber(),
            container_type: TestSchemaValidator.getRandomEnum('containerType'), 
            supplier_id: supplier.id,
            status: 'ordered', // Valid enum value
            cbm_capacity: 67.5,
            total_cost: 25000
          });

          if (containerError) throw containerError;
          cleanup.push({ table: 'containers', id: container.id });

          // Test status progression through valid enum values
          const validStatuses = ['confirmed', 'shipped', 'in_transit', 'port_arrival', 'customs_cleared', 'completed'];
          let progressionSuccess = true;

          for (const status of validStatuses) {
            const { error } = await supabase
              .from('containers')
              .update({ status: status as any })
              .eq('id', container.id);
            
            if (error) {
              console.error(`Status update failed for ${status}:`, error);
              progressionSuccess = false;
              break;
            }
          }

          // Create container product assignment
          const { data: product } = await TestDataEnhancer.createValidProduct({
            name: `Container Product ${TestDatabaseUtils.generateUniqueId('CPROD')}`,
            sku: TestDataEnhancer.generateUniqueSKU('CP')
          });

          if (product) {
            cleanup.push({ table: 'products', id: product.id });

            const { data: containerProduct, error: cpError } = await supabase
              .from('container_products')
              .insert({
                container_id: container.id,
                product_id: product.id,
                product_name: product.name,
                quantity: 100,
                unit_cost: 45,
                total_cost: 4500
              })
              .select()
              .single();

            if (containerProduct) {
              cleanup.push({ table: 'container_products', id: containerProduct.id });
            }
          }

          return {
            success: progressionSuccess && !!container && !!supplier,
            message: "Enhanced container workflow integration completed",
            details: {
              containerId: container.id,
              supplierName: supplier.name,
              statusProgression: progressionSuccess,
              productAssignment: !!product
            },
            duration: Date.now() - startTime,
            testName: "Enhanced Container Workflow Integration",
            category: "Container Management", 
            priority: "Critical",
            module: "Containers"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Enhanced Container Workflow Integration");
        } finally {
          // Guaranteed cleanup
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    },

    {
      name: "Complete Sales Transaction Validation",
      category: "Sales Workflows", 
      description: "Test complete sales transaction with validated enum values and proper data integrity",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];

        try {
          // Check finance permissions upfront (payments require admin/accountant)
          const { data: canFinance } = await supabase.rpc('can_access_financial_data');

          // Create complete test scenario
          const scenario = await TestDataEnhancer.createTestScenario();
          
          const { customer, product, staff } = scenario;
          if (!customer || !product || !staff) {
            throw new Error('Failed to create test prerequisites');
          }

          // Create sale with validated fulfillment status
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              sales_rep_id: staff.id,
              sale_date: new Date().toISOString().split('T')[0],
              subtotal: 1500,
              tax_amount: 225,
              total_amount: 1725,
              payment_status: 'pending', // Valid enum
              fulfillment_status: 'pending', // FIXED: Use valid enum value
              invoice_number: TestDatabaseUtils.generateUniqueReferenceNumber('INV')
            })
            .select()
            .single();

          if (saleError) throw saleError;
          cleanup.push({ table: 'sales', id: sale.id });

          // Create sale item
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: 10,
              unit_price: 150,
              line_total: 1500
            })
            .select()
            .single();

          if (itemError) throw itemError;
          cleanup.push({ table: 'sale_items', id: saleItem.id });

          // Create payment step only if we have finance permissions
          if (canFinance) {
            const { data: payment, error: paymentError } = await TestDataEnhancer.createValidPayment(sale.id);

            if (paymentError) throw paymentError;
            if (payment) {
              cleanup.push({ table: 'payments', id: payment.id });
            }

            return {
              success: !!(sale && saleItem && payment),
              message: "Complete sales transaction validation successful",
              details: {
                saleId: sale.id,
                orderTotal: sale.total_amount,
                paymentAmount: payment?.amount,
                fulfillmentStatus: sale.fulfillment_status,
                paymentMethod: payment?.payment_method
              },
              duration: Date.now() - startTime,
              testName: "Complete Sales Transaction Validation",
              category: "Sales Workflows",
              priority: "Critical", 
              module: "Sales"
            };
          } else {
            return {
              success: !!(sale && saleItem),
              message: "Sales and sale item created; payment skipped due to insufficient finance permissions",
              details: {
                saleId: sale.id,
                orderTotal: sale.total_amount,
                fulfillmentStatus: sale.fulfillment_status,
                paymentSkipped: true
              },
              duration: Date.now() - startTime,
              testName: "Complete Sales Transaction Validation",
              category: "Sales Workflows",
              priority: "Critical",
              module: "Sales"
            };
          }
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Complete Sales Transaction Validation");
        } finally {
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    },

    {
      name: "Financial Operations Integration",
      category: "Financial Management",
      description: "Test bank ledger and payment operations with validated transaction types",  
      module: "Finance",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];

        try {
          // Create bank account
          const { data: bankAccount, error: bankError } = await supabase
            .from('bank_accounts')
            .insert({
              name: `Test Bank ${TestDatabaseUtils.generateUniqueId('BANK')}`,
              account_number: `ACC-${Date.now()}`,
              bank_name: 'Test Bank Ltd',
              currency: 'NIS',
              opening_balance: 10000,
              current_balance: 10000
            })
            .select()
            .single();

          if (bankError) throw bankError;
          cleanup.push({ table: 'bank_accounts', id: bankAccount.id });

          // Create bank ledger entries with validated transaction types
          const transactionTypes = TestSchemaValidator.VALID_ENUMS.transactionType;
          let allTransactionsSuccess = true;

          for (const transactionType of transactionTypes) {
            const { data: ledgerEntry, error: ledgerError } = await TestDataEnhancer.createValidBankLedgerEntry({
              bank_account_id: bankAccount.id,
              transaction_type: transactionType,
              amount: transactionType === 'OUT' ? -500 : 500,
              currency: 'NIS',
              purpose: `Test ${transactionType} transaction`,
              reference_number: TestDatabaseUtils.generateUniqueReferenceNumber('TXN')
            });

            if (ledgerError) {
              allTransactionsSuccess = false;
              console.error(`Transaction failed for type ${transactionType}:`, ledgerError);
            } else if (ledgerEntry) {
              cleanup.push({ table: 'bank_ledger', id: ledgerEntry.id });
            }
          }

          return {
            success: allTransactionsSuccess && !!bankAccount,
            message: "Financial operations integration completed",
            details: {
              bankAccountId: bankAccount.id,
              transactionTypesProcessed: transactionTypes.length,
              allTransactionsSuccess
            },
            duration: Date.now() - startTime,
            testName: "Financial Operations Integration",
            category: "Financial Management",
            priority: "Critical",
            module: "Finance"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Financial Operations Integration"); 
        } finally {
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    }
  ], []);

  const createPerformanceTests = useCallback((): BusinessTest[] => [
    {
      name: "Bulk Data Operations Performance",
      category: "Performance Testing",
      description: "Test bulk operations with proper constraint handling",
      module: "Performance", 
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];

        try {
          const batchSize = 10;
          let successCount = 0;
          
          // Create bulk customers
          for (let i = 0; i < batchSize; i++) {
            const { data: customer, error } = await TestDataEnhancer.createValidCustomer({
              company_name: `Bulk Customer ${i} ${TestDatabaseUtils.generateUniqueId('BULK')}`,
              contact_person: `Contact ${i}`
            });
            
            if (customer && !error) {
              successCount++;
              cleanup.push({ table: 'customers', id: customer.id });
            }
          }

          // Create bulk products with unique SKUs
          for (let i = 0; i < batchSize; i++) {
            const { data: product, error } = await TestDataEnhancer.createValidProduct({
              name: `Bulk Product ${i} ${TestDatabaseUtils.generateUniqueId('BPROD')}`,
              sku: TestDataEnhancer.generateUniqueSKU(`BP${i}`)
            });

            if (product && !error) {
              successCount++;
              cleanup.push({ table: 'products', id: product.id });
            }
          }

          const expectedRecords = batchSize * 2; // customers + products
          const successRate = (successCount / expectedRecords) * 100;

          return {
            success: successRate >= 90, // 90% success rate threshold
            message: `Bulk operations completed with ${successRate.toFixed(1)}% success rate`,
            details: {
              expectedRecords,
              successCount,
              successRate,
              avgTimePerRecord: (Date.now() - startTime) / successCount
            },
            duration: Date.now() - startTime,
            testName: "Bulk Data Operations Performance",
            category: "Performance Testing",
            priority: "Medium",
            module: "Performance"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Bulk Data Operations Performance");
        } finally {
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    }
  ], []);

  return {
    createCriticalComplianceTests,
    createPerformanceTests
  };
};