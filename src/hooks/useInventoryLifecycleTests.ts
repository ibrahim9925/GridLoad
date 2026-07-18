// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useInventoryLifecycleTests = () => {
  const createInventoryLifecycleTests = (): BusinessTest[] => [
    {
      name: "Product Receipt from Container",
      category: "Inventory Lifecycle",
      description: "Test receiving products from containers and updating inventory",
      module: "Inventory",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get container product to receive
          const { data: containerProduct } = await supabase
            .from('container_products')
            .select('product_id, quantity, unit_cost, container_id')
            .limit(1)
            .single();

          if (!containerProduct) {
            return {
              success: false,
              message: "No container products found to receive",
              duration: Date.now() - startTime,
              testName: "Product Receipt from Container",
              category: "Inventory Lifecycle",
              priority: "Critical",
              module: "Inventory"
            };
          }

          // Get current stock
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', containerProduct.product_id)
            .single();

          if (!product) {
            return {
              success: false,
              message: "Product not found",
              duration: Date.now() - startTime,
              testName: "Product Receipt from Container",
              category: "Inventory Lifecycle",
              priority: "Critical",
              module: "Inventory"
            };
          }

          const initialStock = product.current_stock || 0;
          const receivedQuantity = containerProduct.quantity;

          // Update product stock
          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_stock: initialStock + receivedQuantity,
              last_restock_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', containerProduct.product_id);

          if (updateError) {
            return {
              success: false,
              message: "Failed to update product stock",
              error: updateError.message,
              duration: Date.now() - startTime,
              testName: "Product Receipt from Container",
              category: "Inventory Lifecycle",
              priority: "Critical",
              module: "Inventory"
            };
          }

          // Create stock movement record
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: containerProduct.product_id,
              movement_type: 'in',
              quantity: receivedQuantity,
              unit_cost: containerProduct.unit_cost,
              total_cost: receivedQuantity * containerProduct.unit_cost,
              reference_type: 'container',
              reference_id: containerProduct.container_id,
              notes: 'Product received from container'
            });

          return {
            success: !updateError && !movementError,
            message: updateError || movementError ? "Failed to record stock movement" : "Product received and inventory updated",
            error: updateError?.message || movementError?.message,
            duration: Date.now() - startTime,
            details: { 
              initialStock, 
              receivedQuantity, 
              newStock: initialStock + receivedQuantity,
              productId: containerProduct.product_id
            },
            testName: "Product Receipt from Container",
            category: "Inventory Lifecycle",
            priority: "Critical",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Product receipt test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Product Receipt from Container",
            category: "Inventory Lifecycle",
            priority: "Critical",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Serial Number Assignment",
      category: "Inventory Lifecycle",
      description: "Test assigning serial numbers to received products",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get product with stock
          const { data: product } = await supabase
            .from('products')
            .select('id, current_stock')
            .gt('current_stock', 0)
            .limit(1)
            .single();

          if (!product) {
            return {
              success: false,
              message: "No products with stock found for serial number assignment",
              duration: Date.now() - startTime,
              testName: "Serial Number Assignment",
              category: "Inventory Lifecycle",
              priority: "High",
              module: "Inventory"
            };
          }

          // Generate serial numbers
          const serialNumbers = [];
          for (let i = 1; i <= Math.min(5, product.current_stock); i++) {
            serialNumbers.push({
              product_id: product.id,
              serial_number: `SN-${Date.now()}-${i.toString().padStart(3, '0')}`,
              status: 'available',
              received_date: new Date().toISOString().split('T')[0],
              notes: 'Auto-generated serial number'
            });
          }

          const { error } = await supabase
            .from('product_serial_numbers')
            .insert(serialNumbers);

          return {
            success: !error,
            message: error ? "Failed to assign serial numbers" : `${serialNumbers.length} serial numbers assigned successfully`,
            error: error?.message,
            duration: Date.now() - startTime,
            details: { serialCount: serialNumbers.length, productId: product.id },
            testName: "Serial Number Assignment",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Serial number assignment test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Serial Number Assignment",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Stock Level Alerts",
      category: "Inventory Lifecycle",
      description: "Test stock level monitoring and alert generation",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get product with low stock or create low stock scenario
          const { data: products } = await supabase
            .from('products')
            .select('id, current_stock, reorder_point')
            .gt('current_stock', 0)
            .limit(1);

          if (!products || products.length === 0) {
            return {
              success: false,
              message: "No products found for stock alert test",
              duration: Date.now() - startTime,
              testName: "Stock Level Alerts",
              category: "Inventory Lifecycle",
              priority: "High",
              module: "Inventory"
            };
          }

          const product = products[0];
          const reorderPoint = product.reorder_point || 20;

          // If stock is not low, simulate low stock
          if (product.current_stock > reorderPoint) {
            const { error: updateError } = await supabase
              .from('products')
              .update({ current_stock: reorderPoint - 5 })
              .eq('id', product.id);

            if (updateError) {
              return {
                success: false,
                message: "Failed to simulate low stock",
                error: updateError.message,
                duration: Date.now() - startTime,
                testName: "Stock Level Alerts",
                category: "Inventory Lifecycle",
                priority: "High",
                module: "Inventory"
              };
            }
          }

          // Create stock alert
          const { error: alertError } = await supabase
            .from('stock_alerts')
            .insert({
              product_id: product.id,
              alert_type: 'reorder_point',
              threshold_quantity: reorderPoint,
              current_quantity: reorderPoint - 5,
              severity: 'high',
              auto_reorder_suggested: true,
              suggested_order_quantity: 50
            });

          return {
            success: !alertError,
            message: alertError ? "Failed to create stock alert" : "Stock alert generated successfully",
            error: alertError?.message,
            duration: Date.now() - startTime,
            details: { 
              productId: product.id, 
              currentStock: reorderPoint - 5, 
              reorderPoint 
            },
            testName: "Stock Level Alerts",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Stock level alerts test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Stock Level Alerts",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Inventory Valuation Update",
      category: "Inventory Lifecycle",
      description: "Test inventory valuation calculations and updates",
      module: "Inventory",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get product with stock movements
          const { data: movements } = await supabase
            .from('stock_movements')
            .select('product_id, quantity, unit_cost, total_cost')
            .eq('movement_type', 'in')
            .limit(5);

          if (!movements || movements.length === 0) {
            return {
              success: false,
              message: "No stock movements found for valuation test",
              duration: Date.now() - startTime,
              testName: "Inventory Valuation Update",
              category: "Inventory Lifecycle",
              priority: "Medium",
              module: "Inventory"
            };
          }

          // Calculate weighted average cost
          const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
          const totalCost = movements.reduce((sum, m) => sum + (m.total_cost || 0), 0);
          const weightedAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

          // Create or update inventory valuation
          const { error } = await supabase
            .from('inventory_valuations')
            .insert({
              product_id: movements[0].product_id,
              quantity: totalQuantity,
              unit_cost: weightedAvgCost,
              total_value: totalCost,
              valuation_method: 'weighted_average'
            });

          return {
            success: !error,
            message: error ? "Failed to update inventory valuation" : "Inventory valuation updated successfully",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { 
              totalQuantity, 
              totalValue: totalCost, 
              avgUnitCost: weightedAvgCost,
              productId: movements[0].product_id
            },
            testName: "Inventory Valuation Update",
            category: "Inventory Lifecycle",
            priority: "Medium",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Inventory valuation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Inventory Valuation Update",
            category: "Inventory Lifecycle",
            priority: "Medium",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "Stock Reservation for Sales",
      category: "Inventory Lifecycle",
      description: "Test reserving stock for pending sales orders",
      module: "Inventory",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get product with available stock
          const { data: product } = await supabase
            .from('products')
            .select('id, current_stock, reserved_qty')
            .gt('current_stock', 10)
            .limit(1)
            .single();

          if (!product) {
            return {
              success: false,
              message: "No products with sufficient stock found",
              duration: Date.now() - startTime,
              testName: "Stock Reservation for Sales",
              category: "Inventory Lifecycle",
              priority: "High",
              module: "Inventory"
            };
          }

          const reserveQuantity = 5;
          const currentReserved = product.reserved_qty || 0;

          // Reserve stock
          const { error } = await supabase
            .from('products')
            .update({
              reserved_qty: currentReserved + reserveQuantity
            })
            .eq('id', product.id);

          return {
            success: !error,
            message: error ? "Failed to reserve stock" : `${reserveQuantity} units reserved successfully`,
            error: error?.message,
            duration: Date.now() - startTime,
            details: { 
              productId: product.id,
              reservedQuantity: reserveQuantity,
              totalReserved: currentReserved + reserveQuantity,
              availableStock: product.current_stock - (currentReserved + reserveQuantity)
            },
            testName: "Stock Reservation for Sales",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Stock reservation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Stock Reservation for Sales",
            category: "Inventory Lifecycle",
            priority: "High",
            module: "Inventory"
          };
        }
      }
    },

    {
      name: "ABC Analysis Calculation",
      category: "Inventory Lifecycle", 
      description: "Test ABC analysis for inventory categorization",
      module: "Inventory",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get products with sales data
          const { data: salesData } = await supabase
            .from('sale_items')
            .select(`
              product_id,
              quantity,
              unit_price,
              products!inner(name)
            `)
            .limit(10);

          if (!salesData || salesData.length === 0) {
            return {
              success: false,
              message: "No sales data found for ABC analysis",
              duration: Date.now() - startTime,
              testName: "ABC Analysis Calculation",
              category: "Inventory Lifecycle",
              priority: "Medium",
              module: "Inventory"
            };
          }

          // Calculate consumption value per product
          const productConsumption = salesData.reduce((acc: any, item) => {
            const productId = item.product_id;
            const value = item.quantity * item.unit_price;
            acc[productId] = (acc[productId] || 0) + value;
            return acc;
          }, {});

          // Sort by consumption value
          const sortedProducts = Object.entries(productConsumption)
            .sort(([,a], [,b]) => (b as number) - (a as number));

          // Assign ABC categories (80-15-5 rule)
          const totalValue = sortedProducts.reduce((sum, [,value]) => sum + (value as number), 0);
          let cumulativeValue = 0;
          const abcCategories: Array<{productId: string, category: string, value: number}> = [];

          sortedProducts.forEach(([productId, value]) => {
            cumulativeValue += value as number;
            const percentage = (cumulativeValue / totalValue) * 100;
            
            let category = 'C';
            if (percentage <= 80) category = 'A';
            else if (percentage <= 95) category = 'B';
            
            abcCategories.push({ productId, category, value: value as number });
          });

          return {
            success: true,
            message: `ABC analysis completed for ${abcCategories.length} products`,
            duration: Date.now() - startTime,
            details: { 
              totalProducts: abcCategories.length,
              totalValue: totalValue,
              categoryA: abcCategories.filter(p => p.category === 'A').length,
              categoryB: abcCategories.filter(p => p.category === 'B').length,
              categoryC: abcCategories.filter(p => p.category === 'C').length
            },
            testName: "ABC Analysis Calculation",
            category: "Inventory Lifecycle",
            priority: "Medium",
            module: "Inventory"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "ABC analysis test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "ABC Analysis Calculation",
            category: "Inventory Lifecycle",
            priority: "Medium",
            module: "Inventory"
          };
        }
      }
    }
  ];

  return { createInventoryLifecycleTests };
};