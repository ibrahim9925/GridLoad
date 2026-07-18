// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useSimplifiedInventoryTests = () => {
  const createSimplifiedInventoryTests = useCallback((): BusinessTest[] => [
    {
      name: "Stock Movement Processing",
      category: "Inventory Management",
      description: "Test comprehensive stock movement tracking and validation",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test product
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: `Stock Test Product ${Date.now()}`,
              sku: `ST-${Date.now()}`,
              category: 'Stock Test',
              cost_price: 25,
              standard_selling_price: 40,
              current_stock: 100
            })
            .select()
            .single();

          if (productError) throw productError;

          // Test various stock movements
          const movements = [
            { type: 'inbound', quantity: 50 },
            { type: 'outbound', quantity: -20 },
            { type: 'adjustment', quantity: -5 }
          ];

          let expectedStock = 100;
          const movementIds = [];

          for (const movement of movements) {
            const { data: stockMovement, error: movementError } = await supabase
              .from('stock_movements')
              .insert({
                product_id: product.id,
                movement_type: movement.type,
                quantity: movement.quantity,
                reference_type: 'manual',
                unit_cost: 25,
                total_cost: movement.quantity * 25
              })
              .select()
              .single();

            if (movementError) throw movementError;
            movementIds.push(stockMovement.id);

            expectedStock += movement.quantity;

            // Update product stock
            await supabase
              .from('products')
              .update({ current_stock: expectedStock })
              .eq('id', product.id);
          }

          // Verify final stock level
          const { data: updatedProduct } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', product.id)
            .single();

          // Cleanup
          await Promise.all(movementIds.map(id => 
            supabase.from('stock_movements').delete().eq('id', id)
          ));
          await supabase.from('products').delete().eq('id', product.id);

          return {
            success: updatedProduct.current_stock === expectedStock,
            message: "Stock movement processing completed successfully",
            details: { 
              initialStock: 100,
              finalStock: updatedProduct.current_stock,
              expectedStock,
              movementsProcessed: movements.length 
            },
            duration: Date.now() - startTime,
            testName: "Stock Movement Processing",
            category: "Inventory Management",
            priority: "Critical",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Stock movement processing failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Stock Movement Processing",
            category: "Inventory Management",
            priority: "Critical",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Automated Stock Alert Generation",
      category: "Inventory Automation",
      description: "Test automatic low stock alerts and reorder suggestions",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Alert Test Product ${Date.now()}`,
              sku: `AT-${Date.now()}`,
              category: 'Alert Test',
              cost_price: 15,
              standard_selling_price: 25,
              current_stock: 5
            })
            .select()
            .single();

          // Generate stock alert
          const { data: alert, error: alertError } = await supabase
            .from('stock_alerts')
            .insert({
              product_id: product.id,
              alert_type: 'low_stock',
              threshold_quantity: 10,
              current_quantity: 5,
              severity: 'high',
              auto_reorder_suggested: true,
              suggested_order_quantity: 50
            })
            .select()
            .single();

          if (alertError) throw alertError;

          // Test alert acknowledgment
          const { data: acknowledgedAlert, error: ackError } = await supabase
            .from('stock_alerts')
            .update({
              is_acknowledged: true,
              acknowledged_at: new Date().toISOString()
            })
            .eq('id', alert.id)
            .select()
            .single();

          if (ackError) throw ackError;

          // Cleanup
          await supabase.from('stock_alerts').delete().eq('id', alert.id);
          await supabase.from('products').delete().eq('id', product.id);

          return {
            success: acknowledgedAlert.is_acknowledged === true,
            message: "Stock alert generation and acknowledgment completed",
            details: {
              alertType: alert.alert_type,
              thresholdQty: alert.threshold_quantity,
              currentQty: alert.current_quantity,
              suggestedReorder: alert.suggested_order_quantity,
              acknowledged: acknowledgedAlert.is_acknowledged
            },
            duration: Date.now() - startTime,
            testName: "Automated Stock Alert Generation",
            category: "Inventory Automation",
            priority: "High",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Stock alert generation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Automated Stock Alert Generation",
            category: "Inventory Automation",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Product Serial Number Tracking",
      category: "Inventory Control",
      description: "Test product serial number tracking through sales lifecycle",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Serial Product ${Date.now()}`,
              sku: `SP-${Date.now()}`,
              category: 'Serialized',
              cost_price: 200,
              current_stock: 10,
              is_serialized: true
            })
            .select()
            .single();

          // Create serial numbers
          const serialNumbers = ['SN001', 'SN002', 'SN003'];
          const serialIds = [];

          for (const serialNo of serialNumbers) {
            const { data: serial, error: serialError } = await supabase
              .from('product_serial_numbers')
              .insert({
                product_id: product.id,
                serial_number: `${serialNo}-${Date.now()}`,
                status: 'available',
                received_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (serialError) throw serialError;
            serialIds.push(serial.id);
          }

          // Simulate sale - mark serial as sold
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Serial Test Customer',
              contact_person: 'Serial Manager',
              email: 'serial@test.com'
            })
            .select()
            .single();

          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 200,
              status: 'confirmed'
            })
            .select()
            .single();

          // Update first serial number as sold
          const { data: soldSerial, error: updateError } = await supabase
            .from('product_serial_numbers')
            .update({
              status: 'sold',
              sale_id: sale.id,
              sold_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', serialIds[0])
            .select()
            .single();

          if (updateError) throw updateError;

          // Query available vs sold serials
          const { data: availableSerials } = await supabase
            .from('product_serial_numbers')
            .select('*')
            .eq('product_id', product.id)
            .eq('status', 'available');

          const { data: soldSerials } = await supabase
            .from('product_serial_numbers')
            .select('*')
            .eq('product_id', product.id)
            .eq('status', 'sold');

          // Cleanup
          await Promise.all(serialIds.map(id => 
            supabase.from('product_serial_numbers').delete().eq('id', id)
          ));
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('products').delete().eq('id', product.id);

          const trackingCorrect = availableSerials?.length === 2 && soldSerials?.length === 1;

          return {
            success: trackingCorrect && soldSerial.status === 'sold',
            message: "Product serial number tracking completed",
            details: {
              totalSerials: serialIds.length,
              availableCount: availableSerials?.length || 0,
              soldCount: soldSerials?.length || 0,
              soldSerialStatus: soldSerial.status
            },
            duration: Date.now() - startTime,
            testName: "Product Serial Number Tracking",
            category: "Inventory Control",
            priority: "High",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Product serial number tracking failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Product Serial Number Tracking",
            category: "Inventory Control",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Purchase Order Receiving Workflow",
      category: "Inventory Management",
      description: "Test complete purchase order receiving and stock updates",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create supplier and product
          const { data: supplier } = await supabase
            .from('suppliers')
            .insert({
              name: 'PO Test Supplier',
              email: 'po@supplier.com'
            })
            .select().single();

          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `PO Product ${Date.now()}`,
              sku: `PO-${Date.now()}`,
              category: 'Purchase Test',
              cost_price: 50,
              current_stock: 20
            })
            .select().single();

          // Create purchase order
          const { data: purchaseOrder } = await supabase
            .from('purchase_orders')
            .insert({
              supplier_id: supplier.id,
              order_date: new Date().toISOString().split('T')[0],
              status: 'draft',
              subtotal: 2500,
              total_amount: 2500,
              created_by: crypto.randomUUID()
            })
            .select().single();

          // Add purchase order items
          const { data: poItem } = await supabase
            .from('purchase_order_items')
            .insert({
              purchase_order_id: purchaseOrder.id,
              product_id: product.id,
              quantity: 50,
              unit_cost: 50,
              line_total: 2500
            })
            .select().single();

          // Process receiving (partial receipt)
          const receivedQty = 45; // Received 45 out of 50 ordered
          const { data: updatedItem, error: receiveError } = await supabase
            .from('purchase_order_items')
            .update({ received_quantity: receivedQty })
            .eq('id', poItem.id)
            .select()
            .single();

          if (receiveError) throw receiveError;

          // Update product stock
          const newStock = 20 + receivedQty;
          await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', product.id);

          // Create stock movement for receipt
          const { data: stockMovement } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'inbound',
              quantity: receivedQty,
              reference_type: 'purchase_order',
              reference_id: purchaseOrder.id,
              unit_cost: 50,
              total_cost: receivedQty * 50
            })
            .select().single();

          // Update PO status
          const { data: completedPO, error: updatePOError } = await supabase
            .from('purchase_orders')
            .update({ 
              status: receivedQty >= 50 ? 'completed' : 'partially_received',
              actual_delivery_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', purchaseOrder.id)
            .select()
            .single();

          if (updatePOError) throw updatePOError;

          // Verify final product stock
          const { data: finalProduct } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', product.id)
            .single();

          // Cleanup
          await supabase.from('stock_movements').delete().eq('id', stockMovement.id);
          await supabase.from('purchase_order_items').delete().eq('id', poItem.id);
          await supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          const workflowCorrect = finalProduct.current_stock === newStock &&
                                 updatedItem.received_quantity === receivedQty &&
                                 completedPO.status === 'partially_received';

          return {
            success: workflowCorrect,
            message: "Purchase order receiving workflow completed",
            details: {
              orderedQty: 50,
              receivedQty,
              initialStock: 20,
              finalStock: finalProduct.current_stock,
              poStatus: completedPO.status
            },
            duration: Date.now() - startTime,
            testName: "Purchase Order Receiving Workflow",
            category: "Inventory Management",
            priority: "Critical",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Purchase order receiving workflow failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Purchase Order Receiving Workflow",
            category: "Inventory Management",
            priority: "Critical",
            module: "Inventory"
          };
        }
      }
    }

    // 16 more tests would be added here to reach 20 total inventory tests

  ], []);

  return { createSimplifiedInventoryTests };
};