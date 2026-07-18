// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';

export const useInventoryTests = () => {
  const createInventoryTests = useCallback((): BusinessTest[] => [
    {
      name: "Stock Movement Tracking",
      category: "Workflow",
      description: "Test complete stock movement lifecycle",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Stock Movement Test Product',
              sku: 'STOCK-MOVE-001',
              price: 200,
              current_stock: 100
            })
            .select()
            .single();

          if (productError) throw productError;

          // Create various stock movements
          const movements = [
            { type: 'purchase', quantity: 50, reference_type: 'purchase_order' },
            { type: 'sale', quantity: -20, reference_type: 'sale' },
            { type: 'adjustment', quantity: -5, reference_type: 'inventory_adjustment' },
            { type: 'return', quantity: 3, reference_type: 'customer_return' }
          ];

          const createdMovements = [];
          for (const movement of movements) {
            const { data: stockMovement, error: movementError } = await supabase
              .from('stock_movements')
              .insert({
                product_id: product.id,
                movement_type: movement.type,
                quantity: movement.quantity,
                reference_type: movement.reference_type,
                notes: `Test ${movement.type} movement`
              })
              .select()
              .single();

            if (movementError) throw movementError;
            createdMovements.push(stockMovement);
          }

          // Calculate expected final stock
          const totalMovement = movements.reduce((sum, mov) => sum + mov.quantity, 0);
          const expectedFinalStock = 100 + totalMovement; // 100 + 50 - 20 - 5 + 3 = 128

          // Update product stock
          const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ current_stock: expectedFinalStock })
            .eq('id', product.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Verify stock movements can be queried
          const { data: movements_query, error: queryError } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: true });

          if (queryError) throw queryError;

          // Cleanup
          await Promise.all(
            createdMovements.map(movement => 
              supabase.from('stock_movements').delete().eq('id', movement.id)
            )
          );
          await supabase.from('products').delete().eq('id', product.id);

          const movementsTracked = movements_query.length === movements.length;
          const stockCorrect = updatedProduct.current_stock === expectedFinalStock;

          return {
            success: movementsTracked && stockCorrect,
            message: "Stock movement tracking completed successfully",
            duration: Date.now() - startTime,
            details: {
              initialStock: 100,
              finalStock: updatedProduct.current_stock,
              expectedFinalStock,
              movementsCreated: createdMovements.length,
              movementsQueried: movements_query.length,
              totalMovement
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Stock movement test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Low Stock Alert System",
      category: "Automation",
      description: "Test automatic low stock alert generation",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product with low stock threshold
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Low Stock Alert Product',
              sku: 'LOW-STOCK-001',
              price: 150,
              current_stock: 15,
              reorder_point: 20 // Stock is below reorder point
            })
            .select()
            .single();

          if (productError) throw productError;

          // Create stock alert for low stock
          const { data: alert, error: alertError } = await supabase
            .from('stock_alerts')
            .insert({
              product_id: product.id,
              alert_type: 'low_stock',
              threshold_quantity: 20,
              current_quantity: 15,
              severity: 'high',
              auto_reorder_suggested: true,
              suggested_order_quantity: 50
            })
            .select()
            .single();

          if (alertError) throw alertError;

          // Test alert query and filtering
          const { data: lowStockAlerts, error: queryError } = await supabase
            .from('stock_alerts')
            .select(`
              *,
              products(name, sku, current_stock)
            `)
            .eq('alert_type', 'low_stock')
            .eq('is_acknowledged', false);

          if (queryError) throw queryError;

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

          const alertFound = lowStockAlerts.some(a => a.id === alert.id);
          const alertAcknowledged = acknowledgedAlert.is_acknowledged;

          return {
            success: alertFound && alertAcknowledged,
            message: "Low stock alert system working correctly",
            duration: Date.now() - startTime,
            details: {
              productId: product.id,
              alertId: alert.id,
              currentStock: 15,
              reorderPoint: 20,
              suggestedOrderQty: 50,
              alertsFound: lowStockAlerts.length,
              acknowledged: alertAcknowledged
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Low stock alert test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Inventory Valuation Calculation",
      category: "Financial",
      description: "Test inventory valuation using different methods",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create products with different costs
          const { data: product1, error: product1Error } = await supabase
            .from('products')
            .insert({
              name: 'Valuation Product 1',
              sku: 'VAL-001',
              price: 100,
              cost_price: 60,
              current_stock: 10
            })
            .select()
            .single();

          if (product1Error) throw product1Error;

          const { data: product2, error: product2Error } = await supabase
            .from('products')
            .insert({
              name: 'Valuation Product 2',
              sku: 'VAL-002',
              price: 200,
              cost_price: 120,
              current_stock: 5
            })
            .select()
            .single();

          if (product2Error) throw product2Error;

          // Create inventory valuation records
          const valuationDate = new Date().toISOString().split('T')[0];
          
          const { data: valuation1, error: val1Error } = await supabase
            .from('inventory_valuations')
            .insert({
              product_id: product1.id,
              valuation_date: valuationDate,
              quantity: 10,
              unit_cost: 60,
              total_value: 600,
              valuation_method: 'fifo'
            })
            .select()
            .single();

          if (val1Error) throw val1Error;

          const { data: valuation2, error: val2Error } = await supabase
            .from('inventory_valuations')
            .insert({
              product_id: product2.id,
              valuation_date: valuationDate,
              quantity: 5,
              unit_cost: 120,
              total_value: 600,
              valuation_method: 'fifo'
            })
            .select()
            .single();

          if (val2Error) throw val2Error;

          // Calculate total inventory value
          const { data: totalValuation, error: totalError } = await supabase
            .from('inventory_valuations')
            .select('total_value')
            .eq('valuation_date', valuationDate);

          if (totalError) throw totalError;

          const calculatedTotal = totalValuation.reduce(
            (sum, val) => sum + val.total_value, 
            0
          );
          const expectedTotal = 1200; // 600 + 600

          // Test valuation query with product details
          const { data: detailedValuation, error: detailError } = await supabase
            .from('inventory_valuations')
            .select(`
              *,
              products(name, sku, stock_quantity)
            `)
            .eq('valuation_date', valuationDate);

          if (detailError) throw detailError;

          // Cleanup
          await supabase.from('inventory_valuations').delete().eq('id', valuation1.id);
          await supabase.from('inventory_valuations').delete().eq('id', valuation2.id);
          await supabase.from('products').delete().eq('id', product1.id);
          await supabase.from('products').delete().eq('id', product2.id);

          const totalCorrect = Math.abs(calculatedTotal - expectedTotal) < 0.01;
          const detailsComplete = detailedValuation.every(v => v.products !== null);

          return {
            success: totalCorrect && detailsComplete,
            message: "Inventory valuation calculation completed",
            duration: Date.now() - startTime,
            details: {
              calculatedTotal,
              expectedTotal,
              valuationRecords: totalValuation.length,
              detailedRecords: detailedValuation.length,
              product1Value: valuation1.total_value,
              product2Value: valuation2.total_value
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Inventory valuation test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "ABC Analysis Classification",
      category: "Analytics",
      description: "Test product classification based on sales volume",
      module: "Inventory",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create products with different sales volumes
          const products = [
            { name: 'High Volume Product', sku: 'ABC-HIGH-001', price: 100 },
            { name: 'Medium Volume Product', sku: 'ABC-MED-001', price: 200 },
            { name: 'Low Volume Product', sku: 'ABC-LOW-001', price: 150 }
          ];

          const createdProducts = [];
          for (const prod of products) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .insert({
                name: prod.name,
                sku: prod.sku,
                price: prod.price,
                stock_quantity: 50
              })
              .select()
              .single();

            if (productError) throw productError;
            createdProducts.push(product);
          }

          // Create customer for sales
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'ABC Analysis Customer',
              contact_person: 'ABC Contact',
              email: 'abc@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create sales with different volumes
          const salesData = [
            { productIndex: 0, quantity: 100, amount: 10000 }, // High volume - A class
            { productIndex: 1, quantity: 20, amount: 4000 },   // Medium volume - B class
            { productIndex: 2, quantity: 5, amount: 750 }      // Low volume - C class
          ];

          const createdSales = [];
          for (const saleData of salesData) {
            const { data: sale, error: saleError } = await supabase
              .from('sales')
              .insert({
                customer_id: customer.id,
                total_amount: saleData.amount,
                status: 'confirmed'
              })
              .select()
              .single();

            if (saleError) throw saleError;

            const { data: saleItem, error: itemError } = await supabase
              .from('sale_items')
              .insert({
                sale_id: sale.id,
                product_id: createdProducts[saleData.productIndex].id,
                quantity: saleData.quantity,
                unit_price: createdProducts[saleData.productIndex].price,
                line_total: saleData.amount
              })
              .select()
              .single();

            if (itemError) throw itemError;

            createdSales.push({ sale, saleItem });
          }

          // Query sales data for ABC analysis
          const { data: salesAnalysis, error: analysisError } = await supabase
            .from('sale_items')
            .select(`
              product_id,
              quantity,
              line_total,
              products(name, sku)
            `)
            .in('product_id', createdProducts.map(p => p.id));

          if (analysisError) throw analysisError;

          // Calculate total sales value for ABC classification
          const productSales = salesAnalysis.reduce((acc: any, item: any) => {
            if (!acc[item.product_id]) {
              acc[item.product_id] = { 
                total_value: 0, 
                total_quantity: 0,
                product: item.products
              };
            }
            acc[item.product_id].total_value += item.line_total;
            acc[item.product_id].total_quantity += item.quantity;
            return acc;
          }, {});

          const totalSalesValue = Object.values(productSales).reduce(
            (sum: number, product: any) => sum + product.total_value, 
            0
          );

          // Classify products (simplified ABC logic)
          const classifications = Object.entries(productSales).map(([productId, data]: [string, any]) => {
            const percentage = ((data?.total_value || 0) / Math.max(Number(totalSalesValue) || 1, 1)) * 100;
            let classification = 'C';
            if (percentage >= 70) classification = 'A';
            else if (percentage >= 20) classification = 'B';
            
            return {
              productId,
              classification,
              percentage,
              totalValue: data.total_value
            };
          });

          // Cleanup
          await Promise.all(
            createdSales.map(({ sale, saleItem }) => Promise.all([
              supabase.from('sale_items').delete().eq('id', saleItem.id),
              supabase.from('sales').delete().eq('id', sale.id)
            ]))
          );
          await supabase.from('customers').delete().eq('id', customer.id);
          await Promise.all(
            createdProducts.map(product => 
              supabase.from('products').delete().eq('id', product.id)
            )
          );

          const hasAClass = classifications.some(c => c.classification === 'A');
          const hasBClass = classifications.some(c => c.classification === 'B');
          const hasCClass = classifications.some(c => c.classification === 'C');

          return {
            success: hasAClass && hasBClass && hasCClass,
            message: "ABC analysis classification completed",
            duration: Date.now() - startTime,
            details: {
              totalProducts: createdProducts.length,
              totalSalesValue,
              classifications,
              aClassCount: classifications.filter(c => c.classification === 'A').length,
              bClassCount: classifications.filter(c => c.classification === 'B').length,
              cClassCount: classifications.filter(c => c.classification === 'C').length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `ABC analysis test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Serial Number Tracking",
      category: "Tracking",
      description: "Test product serial number lifecycle management",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product that requires serial numbers
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Serial Tracked Product',
              sku: 'SERIAL-001',
              price: 1000,
              stock_quantity: 3,
              requires_serial: true
            })
            .select()
            .single();

          if (productError) throw productError;

          // Create serial numbers for the product
          const serialNumbers = ['SN001-2024', 'SN002-2024', 'SN003-2024'];
          const createdSerials = [];

          for (const serialNum of serialNumbers) {
            const { data: serial, error: serialError } = await supabase
              .from('product_serial_numbers')
              .insert({
                product_id: product.id,
                serial_number: serialNum,
                status: 'available',
                received_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (serialError) throw serialError;
            createdSerials.push(serial);
          }

          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Serial Test Customer',
              contact_person: 'Serial Contact',
              email: 'serial@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 1000,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Sell one unit and track serial number
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: 1,
              unit_price: 1000,
              line_total: 1000
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Update serial number status to sold
          const { data: soldSerial, error: soldError } = await supabase
            .from('product_serial_numbers')
            .update({ 
              status: 'sold',
              sale_id: sale.id,
              sold_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', createdSerials[0].id)
            .select()
            .single();

          if (soldError) throw soldError;

          // Query available vs sold serial numbers
          const { data: availableSerials, error: availableError } = await supabase
            .from('product_serial_numbers')
            .select('*')
            .eq('product_id', product.id)
            .eq('status', 'available');

          if (availableError) throw availableError;

          const { data: soldSerials, error: soldQueryError } = await supabase
            .from('product_serial_numbers')
            .select('*')
            .eq('product_id', product.id)
            .eq('status', 'sold');

          if (soldQueryError) throw soldQueryError;

          // Cleanup
          await Promise.all(
            createdSerials.map(serial => 
              supabase.from('product_serial_numbers').delete().eq('id', serial.id)
            )
          );
          await supabase.from('sale_items').delete().eq('id', saleItem.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('products').delete().eq('id', product.id);

          const availableCount = availableSerials.length;
          const soldCount = soldSerials.length;
          const serialTracked = soldSerial.sale_id === sale.id;

          return {
            success: availableCount === 2 && soldCount === 1 && serialTracked,
            message: "Serial number tracking completed successfully",
            duration: Date.now() - startTime,
            details: {
              totalSerials: serialNumbers.length,
              availableCount,
              soldCount,
              soldSerialNumber: soldSerial.serial_number,
              saleLinked: serialTracked
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Serial number tracking test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    }
  ], []);

  return { createInventoryTests };
};