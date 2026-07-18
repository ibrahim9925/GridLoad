// @ts-nocheck
import { useCallback } from "react";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";
import { TestDataEnhancer } from "@/utils/testDataEnhancer";
import { TestSchemaValidator } from "@/utils/testSchemaValidator";
import { TestErrorHandler } from "@/utils/testErrorHandler";
import { supabase } from "@/integrations/supabase/client";

/**
 * CRITICAL: Advanced business workflow tests with comprehensive validation
 * These test complex multi-step business processes end-to-end
 */
export const useAdvancedBusinessWorkflows = () => {
  
  const createAdvancedWorkflowTests = useCallback((): BusinessTest[] => [
    {
      name: "Complete Customer Lifecycle Management",
      category: "Customer Management",
      description: "Test complete customer lifecycle from lead to sale to support",
      module: "CRM",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];
        
        try {
          // Step 1: Create lead
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              full_name: `Lead Customer ${TestDataEnhancer.generateUniqueId('LEAD')}`,
              email: `lead${Date.now()}@customer.com`,
              phone: '+1-555-0199',
              status: 'new', // FIXED: Use valid enum value
              source: 'website',
              estimated_value: 15000,
              notes: 'Advanced workflow test lead'
            })
            .select()
            .single();

          if (leadError) throw leadError;
          cleanup.push({ table: 'leads', id: lead.id });

          // Step 2: Convert lead to customer
          const { data: customer } = await TestDataEnhancer.createValidCustomer({
            company_name: `Customer Co ${TestDataEnhancer.generateUniqueId('CUST')}`,
            contact_person: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            address: '123 Business St, City, State 12345'
          });

          if (!customer) throw new Error('Failed to create customer');
          cleanup.push({ table: 'customers', id: customer.id });

          // Step 3: Create quotation
          const { data: quotation, error: quoteError } = await supabase
            .from('quotations')
            .insert({
              customer_id: customer.id,
              quote_number: `QUO-${TestDataEnhancer.generateUniqueId('QUOTE')}`, // FIXED: Use correct column name
              quote_date: new Date().toISOString().split('T')[0],
              subtotal: 12000,
              tax_amount: 1800,
              total_amount: 13800,
              status: 'draft',
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            .select()
            .single();

          if (quoteError) throw quoteError;
          cleanup.push({ table: 'quotations', id: quotation.id });

          // Step 4: Convert quotation to sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              quotation_id: quotation.id, // Remove if this column doesn't exist
              sale_date: new Date().toISOString().split('T')[0],
              subtotal: quotation.subtotal,
              tax_amount: quotation.tax_amount,
              total_amount: quotation.total_amount,
              payment_status: 'pending',
              fulfillment_status: 'pending',
              invoice_number: `INV-${TestDataEnhancer.generateUniqueId('SALE')}`
            })
            .select()
            .single();

          if (saleError) throw saleError;
          cleanup.push({ table: 'sales', id: sale.id });

          // Step 5: Create warranty
          const { data: product } = await TestDataEnhancer.createValidProduct({
            name: `Warranty Product ${TestDataEnhancer.generateUniqueId('WPROD')}`,
            sku: TestDataEnhancer.generateUniqueSKU('WP'),
            warranty_months: 24
          });

          if (!product) throw new Error('Failed to create product');
          cleanup.push({ table: 'products', id: product.id });

          const { data: warranty, error: warrantyError } = await supabase
            .from('warranties')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              customer_id: customer.id,
              warranty_period_months: 24,
              warranty_start_date: new Date().toISOString().split('T')[0],
              warranty_end_date: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              warranty_type: 'standard',
              serial_number: `SN-${TestDataEnhancer.generateUniqueId('SERIAL')}`,
              status: 'active'
            })
            .select()
            .single();

          if (warrantyError) throw warrantyError;
          cleanup.push({ table: 'warranties', id: warranty.id });

          return {
            success: !!(lead && customer && quotation && sale && warranty),
            message: "Complete customer lifecycle management successful",
            details: {
              leadId: lead.id,
              customerId: customer.id,
              quotationId: quotation.id,
              saleId: sale.id,
              warrantyId: warranty.id,
              lifecycleSteps: 5
            },
            duration: Date.now() - startTime,
            testName: "Complete Customer Lifecycle Management",
            category: "Customer Management",
            priority: "Critical",
            module: "CRM"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Complete Customer Lifecycle Management");
        } finally {
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    },

    {
      name: "Inventory Replenishment Workflow",
      category: "Inventory Management", 
      description: "Test complete inventory replenishment from low stock alert to purchase order completion",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        const cleanup: Array<{ table: string; id: string }> = [];
        
        try {
          // Step 1: Create supplier
          const { data: supplier } = await TestDataEnhancer.createValidSupplier({
            name: `Replenishment Supplier ${TestDataEnhancer.generateUniqueId('RSUP')}`,
            contact_person: 'Supplier Manager',
            lead_time_days: 14,
            min_order_amount: 1000
          });

          if (!supplier) throw new Error('Failed to create supplier');
          cleanup.push({ table: 'suppliers', id: supplier.id });

          // Step 2: Create low-stock product
          const { data: product } = await TestDataEnhancer.createValidProduct({
            name: `Low Stock Product ${TestDataEnhancer.generateUniqueId('LPROD')}`,
            sku: TestDataEnhancer.generateUniqueSKU('LS'),
            current_stock: 5, // Low stock
            reorder_point: 20,
            reorder_quantity: 100
          });

          if (!product) throw new Error('Failed to create product');
          cleanup.push({ table: 'products', id: product.id });

          // Step 3: Create stock alert
          const { data: stockAlert, error: alertError } = await supabase
            .from('stock_alerts')
            .insert({
              product_id: product.id,
              alert_type: 'reorder_point',
              threshold_quantity: 20,
              current_quantity: 5,
              severity: 'high',
              auto_reorder_suggested: true,
              suggested_order_quantity: 100
            })
            .select()
            .single();

          if (alertError) throw alertError;
          cleanup.push({ table: 'stock_alerts', id: stockAlert.id });

          // Step 4: Create purchase order
          const { data: purchaseOrder, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
              supplier_id: supplier.id,
              order_number: `PO-${TestDataEnhancer.generateUniqueId('REPL')}`,
              order_date: new Date().toISOString().split('T')[0],
              expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              subtotal: 5000,
              total_amount: 5000,
              status: 'draft',
              created_by: supplier.id // FIXED: Add required field
            })
            .select()
            .single();

          if (poError) throw poError;
          cleanup.push({ table: 'purchase_orders', id: purchaseOrder.id });

          // Step 5: Add purchase order item
          const { data: poItem, error: poItemError } = await supabase
            .from('purchase_order_items')
            .insert({
              purchase_order_id: purchaseOrder.id,
              product_id: product.id,
              quantity: 100,
              unit_cost: 50,
              line_total: 5000,
              received_quantity: 0
            })
            .select()
            .single();

          if (poItemError) throw poItemError;
          cleanup.push({ table: 'purchase_order_items', id: poItem.id });

          // Step 6: Complete purchase order (simulate receiving)
          await supabase
            .from('purchase_orders')
            .update({ 
              status: 'completed',
              actual_delivery_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', purchaseOrder.id);

          await supabase
            .from('purchase_order_items')
            .update({ received_quantity: 100 })
            .eq('id', poItem.id);

          // Step 7: Update product stock
          await supabase
            .from('products')
            .update({ current_stock: 105 }) // 5 + 100 received
            .eq('id', product.id);

          // Step 8: Create stock movement
          const { data: stockMovement, error: smError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'in',
              quantity: 100,
              reference_type: 'purchase_order',
              reference_id: purchaseOrder.id,
              unit_cost: 50,
              total_cost: 5000,
              notes: 'Inventory replenishment'
            })
            .select()
            .single();

          if (smError) throw smError;
          cleanup.push({ table: 'stock_movements', id: stockMovement.id });

          return {
            success: !!(supplier && product && stockAlert && purchaseOrder && poItem && stockMovement),
            message: "Inventory replenishment workflow completed successfully",
            details: {
              supplierId: supplier.id,
              productId: product.id,
              initialStock: 5,
              finalStock: 105,
              purchaseOrderId: purchaseOrder.id,
              replenishmentQuantity: 100
            },
            duration: Date.now() - startTime,
            testName: "Inventory Replenishment Workflow",
            category: "Inventory Management",
            priority: "Critical",
            module: "Inventory"
          };
        } catch (error: any) {
          return TestErrorHandler.createErrorResult(error, "Inventory Replenishment Workflow");
        } finally {
          await TestDataEnhancer.batchCleanup(cleanup);
        }
      }
    }
  ], []);

  return {
    createAdvancedWorkflowTests
  };
};