// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useExpandedInventoryTests = () => {
  const createExpandedInventoryTests = useCallback((): BusinessTest[] => [
    {
      name: "Stock Movement Tracking",
      category: "Inventory Control",
      description: "Test comprehensive stock movement recording and tracking",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Stock Movement Product ${Date.now()}`,
              sku: `SMP-${Date.now()}`,
              category: 'Stock Test',
              cost_price: 75,
              standard_selling_price: 100,
              current_stock: 200,
              reorder_point: 50
            })
            .select()
            .single();

          // Record incoming stock (purchase)
          const incomingQty = 100;
          const { data: inMovement } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'in',
              quantity: incomingQty,
              reference_type: 'purchase_order',
              unit_cost: 70,
              total_cost: incomingQty * 70,
              notes: 'Stock receipt from supplier'
            })
            .select()
            .single();

          // Update product stock
          await supabase
            .from('products')
            .update({ current_stock: 200 + incomingQty })
            .eq('id', product.id);

          // Record outgoing stock (sale)
          const outgoingQty = 75;
          const { data: outMovement } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'out',
              quantity: outgoingQty,
              reference_type: 'sale',
              unit_cost: 75,
              total_cost: outgoingQty * 100,
              notes: 'Stock shipped to customer'
            })
            .select()
            .single();

          // Update product stock after sale
          const finalStock = 300 - outgoingQty;
          const { data: updatedProduct } = await supabase
            .from('products')
            .update({ current_stock: finalStock })
            .eq('id', product.id)
            .select()
            .single();

          // Verify stock movements
          const { data: movements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: true });

          // Cleanup
          await Promise.all(movements?.map(movement => 
            supabase.from('stock_movements').delete().eq('id', movement.id)
          ) || []);
          await supabase.from('products').delete().eq('id', product.id);

          const movementsValid = movements?.length === 2 &&
                                movements[0].movement_type === 'in' &&
                                movements[1].movement_type === 'out' &&
                                updatedProduct.current_stock === finalStock;

          return {
            success: movementsValid,
            message: "Stock movement tracking completed successfully",
            details: {
              initialStock: 200,
              incomingQty,
              outgoingQty,
              finalStock,
              movementsRecorded: movements?.length || 0
            },
            duration: Date.now() - startTime,
            testName: "Stock Movement Tracking",
            category: "Inventory Control",
            priority: "Critical",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Stock movement tracking failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Stock Movement Tracking",
            category: "Inventory Control",
            priority: "Critical",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Low Stock Alert Generation",
      category: "Inventory Alerts",
      description: "Test automatic low stock alert generation and management",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create products with different stock levels
          const products = [];
          const stockLevels = [5, 15, 25]; // Below, at, and above reorder point
          const reorderPoint = 20;

          for (let i = 0; i < stockLevels.length; i++) {
            const { data: product } = await supabase
              .from('products')
              .insert({
                name: `Alert Product ${i + 1}`,
                sku: `AP${i + 1}-${Date.now()}`,
                category: 'Alert Test',
                cost_price: 50,
                current_stock: stockLevels[i],
                reorder_point: reorderPoint,
                reorder_quantity: 100
              })
              .select()
              .single();
            products.push(product);
          }

          // Generate stock alerts for products below reorder point
          const alerts = [];
          for (const product of products) {
            if (product.current_stock <= reorderPoint) {
              const severity = product.current_stock === 0 ? 'critical' : 
                             product.current_stock <= 10 ? 'high' : 'medium';

              const { data: alert } = await supabase
                .from('stock_alerts')
                .insert({
                  product_id: product.id,
                  alert_type: product.current_stock === 0 ? 'out_of_stock' : 'reorder_point',
                  threshold_quantity: reorderPoint,
                  current_quantity: product.current_stock,
                  severity: severity,
                  auto_reorder_suggested: true,
                  suggested_order_quantity: product.reorder_quantity
                })
                .select()
                .single();
              alerts.push(alert);
            }
          }

          // Test alert acknowledgment
          if (alerts.length > 0) {
            const { data: acknowledgedAlert } = await supabase
              .from('stock_alerts')
              .update({
                is_acknowledged: true,
                acknowledged_at: new Date().toISOString()
              })
              .eq('id', alerts[0].id)
              .select()
              .single();
          }

          // Cleanup
          await Promise.all(alerts.map(alert => 
            supabase.from('stock_alerts').delete().eq('id', alert.id)
          ));
          await Promise.all(products.map(product => 
            supabase.from('products').delete().eq('id', product.id)
          ));

          const alertsValid = alerts.length === 2 && // Products with 5 and 15 stock should generate alerts
                            alerts.every(alert => alert.current_quantity <= reorderPoint);

          return {
            success: alertsValid,
            message: "Low stock alert generation completed successfully",
            details: {
              productsCreated: products.length,
              alertsGenerated: alerts.length,
              reorderPoint,
              severityLevels: alerts.map(a => a.severity)
            },
            duration: Date.now() - startTime,
            testName: "Low Stock Alert Generation",
            category: "Inventory Alerts",
            priority: "High",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Low stock alert generation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Low Stock Alert Generation",
            category: "Inventory Alerts",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Inventory Valuation Calculation",
      category: "Inventory Analytics",
      description: "Test inventory valuation using different costing methods",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Valuation Product ${Date.now()}`,
              sku: `VP-${Date.now()}`,
              category: 'Valuation Test',
              cost_price: 60,
              current_stock: 0
            })
            .select()
            .single();

          // Create multiple inventory receipts with different costs
          const receipts = [
            { quantity: 100, unitCost: 50, date: '2024-01-01' },
            { quantity: 150, unitCost: 60, date: '2024-01-15' },
            { quantity: 200, unitCost: 70, date: '2024-02-01' }
          ];

          const valuations = [];
          let runningStock = 0;

          for (const receipt of receipts) {
            runningStock += receipt.quantity;
            const totalValue = receipt.quantity * receipt.unitCost;

            // Create valuation record
            const { data: valuation } = await supabase
              .from('inventory_valuations')
              .insert({
                product_id: product.id,
                quantity: receipt.quantity,
                unit_cost: receipt.unitCost,
                total_value: totalValue,
                valuation_method: 'weighted_average',
                valuation_date: receipt.date
              })
              .select()
              .single();
            valuations.push(valuation);

            // Update product stock
            await supabase
              .from('products')
              .update({ current_stock: runningStock })
              .eq('id', product.id);
          }

          // Calculate weighted average cost
          const totalQuantity = receipts.reduce((sum, r) => sum + r.quantity, 0);
          const totalValue = receipts.reduce((sum, r) => sum + (r.quantity * r.unitCost), 0);
          const weightedAverageCost = totalValue / totalQuantity;

          // Create consolidated valuation
          const { data: consolidatedValuation } = await supabase
            .from('inventory_valuations')
            .insert({
              product_id: product.id,
              quantity: totalQuantity,
              unit_cost: weightedAverageCost,
              total_value: totalValue,
              valuation_method: 'weighted_average',
              valuation_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Cleanup
          await supabase.from('inventory_valuations').delete().eq('id', consolidatedValuation.id);
          await Promise.all(valuations.map(valuation => 
            supabase.from('inventory_valuations').delete().eq('id', valuation.id)
          ));
          await supabase.from('products').delete().eq('id', product.id);

          const valuationValid = Math.abs(consolidatedValuation.unit_cost - weightedAverageCost) < 0.01 &&
                                consolidatedValuation.total_value === totalValue;

          return {
            success: valuationValid,
            message: "Inventory valuation calculation completed successfully",
            details: {
              totalQuantity,
              totalValue,
              weightedAverageCost: Number(weightedAverageCost.toFixed(2)),
              calculatedCost: Number(consolidatedValuation.unit_cost.toFixed(2)),
              valuationsCreated: valuations.length + 1
            },
            duration: Date.now() - startTime,
            testName: "Inventory Valuation Calculation",
            category: "Inventory Analytics",
            priority: "High",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Inventory valuation calculation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Inventory Valuation Calculation",
            category: "Inventory Analytics",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Product Serial Number Tracking",
      category: "Inventory Control",
      description: "Test serial number assignment, tracking, and warranty integration",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Serial Product ${Date.now()}`,
              sku: `SP-${Date.now()}`,
              category: 'Serial Test',
              cost_price: 500,
              standard_selling_price: 750,
              current_stock: 5,
              warranty_months: 24
            })
            .select()
            .single();

          // Create serial numbers for received products
          const serialNumbers = [];
          for (let i = 1; i <= 3; i++) {
            const { data: serial } = await supabase
              .from('product_serial_numbers')
              .insert({
                product_id: product.id,
                serial_number: `SN${Date.now()}-${i.toString().padStart(3, '0')}`,
                status: 'available',
                received_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();
            serialNumbers.push(serial);
          }

          // Create customer and sale
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Serial Customer',
              contact_person: 'Serial Manager',
              email: 'serial@customer.com'
            })
            .select()
            .single();

          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 750,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Assign serial number to sale (simulate selling one unit)
          const { data: updatedSerial } = await supabase
            .from('product_serial_numbers')
            .update({
              status: 'sold',
              sale_id: sale.id,
              sold_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', serialNumbers[0].id)
            .select()
            .single();

          // Create warranty linked to serial number
          const { data: warranty } = await supabase
            .from('warranties')
            .insert({
              customer_id: customer.id,
              sale_id: sale.id,
              warranty_period_months: product.warranty_months,
              warranty_start_date: new Date().toISOString().split('T')[0],
              warranty_end_date: new Date(Date.now() + product.warranty_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              warranty_type: 'manufacturer',
              serial_number: updatedSerial.serial_number
            })
            .select()
            .single();

          // Update serial number with warranty reference
          await supabase
            .from('product_serial_numbers')
            .update({ warranty_id: warranty.id })
            .eq('id', updatedSerial.id);

          // Cleanup
          await supabase.from('warranties').delete().eq('id', warranty.id);
          await Promise.all(serialNumbers.map(serial => 
            supabase.from('product_serial_numbers').delete().eq('id', serial.id)
          ));
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('products').delete().eq('id', product.id);

          const serialTrackingValid = updatedSerial.status === 'sold' &&
                                    updatedSerial.sale_id === sale.id &&
                                    warranty.serial_number === updatedSerial.serial_number;

          return {
            success: serialTrackingValid,
            message: "Product serial number tracking completed successfully",
            details: {
              serialNumbersCreated: serialNumbers.length,
              serialNumberSold: updatedSerial.serial_number,
              warrantyCreated: warranty.id,
              warrantyPeriod: warranty.warranty_period_months
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
      name: "Multi-Location Inventory Management",
      category: "Inventory Distribution",
      description: "Test inventory tracking across multiple locations and warehouses",
      module: "Inventory",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Multi-Location Product ${Date.now()}`,
              sku: `MLP-${Date.now()}`,
              category: 'Location Test',
              cost_price: 80,
              standard_selling_price: 120,
              current_stock: 500 // Total across all locations
            })
            .select()
            .single();

          // Simulate inventory in different locations using metadata
          const locations = [
            { name: 'Main Warehouse', quantity: 300 },
            { name: 'Retail Store A', quantity: 150 },
            { name: 'Retail Store B', quantity: 50 }
          ];

          const locationMovements = [];

          // Create stock movements for each location
          for (const location of locations) {
            const { data: movement } = await supabase
              .from('stock_movements')
              .insert({
                product_id: product.id,
                movement_type: 'in',
                quantity: location.quantity,
                reference_type: 'location_allocation',
                notes: `Initial stock allocation to ${location.name}`,
                unit_cost: 80,
                total_cost: location.quantity * 80
              })
              .select()
              .single();
            locationMovements.push({ ...movement, locationName: location.name });
          }

          // Test inter-location transfer
          const transferQty = 25;
          
          // Movement out from Main Warehouse
          const { data: transferOut } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'out',
              quantity: transferQty,
              reference_type: 'location_transfer',
              notes: 'Transfer from Main Warehouse to Retail Store A'
            })
            .select()
            .single();

          // Movement in to Retail Store A
          const { data: transferIn } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'in',
              quantity: transferQty,
              reference_type: 'location_transfer',
              notes: 'Transfer received at Retail Store A from Main Warehouse'
            })
            .select()
            .single();

          // Verify total movements
          const { data: allMovements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: true });

          // Calculate net stock (should remain the same after transfer)
          const totalIn = allMovements
            ?.filter(m => m.movement_type === 'in')
            .reduce((sum, m) => sum + m.quantity, 0) || 0;
          
          const totalOut = allMovements
            ?.filter(m => m.movement_type === 'out')
            .reduce((sum, m) => sum + m.quantity, 0) || 0;

          const netStock = totalIn - totalOut;

          // Cleanup
          await Promise.all(allMovements?.map(movement => 
            supabase.from('stock_movements').delete().eq('id', movement.id)
          ) || []);
          await supabase.from('products').delete().eq('id', product.id);

          const locationManagementValid = allMovements?.length === 5 && // 3 initial + 2 transfer movements
                                        netStock === 500 && // Net stock unchanged after transfer
                                        transferOut.quantity === transferQty;

          return {
            success: locationManagementValid,
            message: "Multi-location inventory management completed successfully",
            details: {
              locationsManaged: locations.length,
              totalMovements: allMovements?.length || 0,
              transferQuantity: transferQty,
              initialStock: 500,
              netStock
            },
            duration: Date.now() - startTime,
            testName: "Multi-Location Inventory Management",
            category: "Inventory Distribution",
            priority: "Medium",
            module: "Inventory"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Multi-location inventory management failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Multi-Location Inventory Management",
            category: "Inventory Distribution",
            priority: "Medium",
            module: "Inventory"
          };
        }
      }
    }
  ], []);

  return { createExpandedInventoryTests };
};
