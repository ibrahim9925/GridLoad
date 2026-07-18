// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';

export const usePurchasingTests = () => {
  const createPurchasingTests = useCallback((): BusinessTest[] => [
    {
      name: "Complete Purchase Order Workflow",
      category: "Workflow",
      description: "Test full purchase order lifecycle from creation to receiving",
      module: "Purchasing",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create supplier
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: 'Test Supplier PO',
              contact_person: 'John Supplier',
              email: 'supplier@test.com',
              phone: '+1234567890',
              payment_terms: 'net_30'
            })
            .select()
            .single();

          if (supplierError) throw supplierError;

          // Create products for purchase
          const products = [
            { name: 'PO Product 1', sku: 'PO-PROD-001', price: 100 },
            { name: 'PO Product 2', sku: 'PO-PROD-002', price: 200 }
          ];

          const createdProducts = [];
          for (const prod of products) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .insert({
                name: prod.name,
                sku: prod.sku,
                price: prod.price,
                stock_quantity: 0
              })
              .select()
              .single();

            if (productError) throw productError;
            createdProducts.push(product);
          }

          // Create purchase order
          const { data: purchaseOrder, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
              supplier_id: supplier.id,
              order_date: new Date().toISOString().split('T')[0],
              expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'draft',
              subtotal: 0,
              total_amount: 0,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();

          if (poError) throw poError;

          // Create purchase order items
          const poItems = [
            { product_id: createdProducts[0].id, quantity: 10, unit_cost: 80, line_total: 800 },
            { product_id: createdProducts[1].id, quantity: 5, unit_cost: 160, line_total: 800 }
          ];

          const createdPOItems = [];
          for (const item of poItems) {
            const { data: poItem, error: itemError } = await supabase
              .from('purchase_order_items')
              .insert({
                purchase_order_id: purchaseOrder.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                line_total: item.line_total
              })
              .select()
              .single();

            if (itemError) throw itemError;
            createdPOItems.push(poItem);
          }

          // Update purchase order totals
          const subtotal = poItems.reduce((sum, item) => sum + item.line_total, 0);
          const { data: updatedPO, error: updateError } = await supabase
            .from('purchase_orders')
            .update({
              subtotal: subtotal,
              total_amount: subtotal,
              status: 'confirmed'
            })
            .eq('id', purchaseOrder.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Simulate receiving items
          const receivedQuantities = [8, 5]; // Partial receipt for first item
          for (let i = 0; i < createdPOItems.length; i++) {
            const { error: receiveError } = await supabase
              .from('purchase_order_items')
              .update({ received_quantity: receivedQuantities[i] })
              .eq('id', createdPOItems[i].id);

            if (receiveError) throw receiveError;
          }

          // Update product stock based on received quantities
          for (let i = 0; i < createdProducts.length; i++) {
            const { error: stockError } = await supabase
              .from('products')
              .update({ current_stock: receivedQuantities[i] })
              .eq('id', createdProducts[i].id);

            if (stockError) throw stockError;
          }

          // Create stock movements for received items
          const stockMovements = [];
          for (let i = 0; i < createdProducts.length; i++) {
            const { data: movement, error: movementError } = await supabase
              .from('stock_movements')
              .insert({
                product_id: createdProducts[i].id,
                movement_type: 'purchase',
                quantity: receivedQuantities[i],
                reference_id: purchaseOrder.id,
                reference_type: 'purchase_order',
                unit_cost: poItems[i].unit_cost,
                total_cost: receivedQuantities[i] * poItems[i].unit_cost
              })
              .select()
              .single();

            if (movementError) throw movementError;
            stockMovements.push(movement);
          }

          // Verify complete workflow
          const { data: completeWorkflow, error: verifyError } = await supabase
            .from('purchase_orders')
            .select(`
              *,
              suppliers(*),
              purchase_order_items(*, products(*))
            `)
            .eq('id', purchaseOrder.id)
            .single();

          if (verifyError) throw verifyError;

          // Cleanup
          await Promise.all(
            stockMovements.map(movement => 
              supabase.from('stock_movements').delete().eq('id', movement.id)
            )
          );
          await Promise.all(
            createdPOItems.map(item => 
              supabase.from('purchase_order_items').delete().eq('id', item.id)
            )
          );
          await supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id);
          await Promise.all(
            createdProducts.map(product => 
              supabase.from('products').delete().eq('id', product.id)
            )
          );
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          const workflowComplete = completeWorkflow.suppliers && 
                                 completeWorkflow.purchase_order_items?.length === 2;
          const totalCorrect = completeWorkflow.total_amount === subtotal;

          return {
            success: workflowComplete && totalCorrect,
            message: "Complete purchase order workflow executed successfully",
            duration: Date.now() - startTime,
            details: {
              purchaseOrderId: purchaseOrder.id,
              supplierId: supplier.id,
              itemsCount: createdPOItems.length,
              subtotal,
              totalAmount: completeWorkflow.total_amount,
              receivedItems: receivedQuantities,
              stockMovements: stockMovements.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Purchase order workflow test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Container Management Integration",
      category: "Integration",
      description: "Test container tracking with purchase orders",
      module: "Purchasing",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create supplier
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: 'Container Supplier',
              contact_person: 'Container Manager',
              email: 'container@supplier.com'
            })
            .select()
            .single();

          if (supplierError) throw supplierError;

          // Create container
          const { data: container, error: containerError } = await supabase
            .from('containers')
            .insert({
              supplier_id: supplier.id,
              container_number: 'CONT-TEST-001',
              container_type: '40ft_hc',
              status: 'ordered',
              order_date: new Date().toISOString().split('T')[0],
              expected_arrival_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              cbm_capacity: 76.0
            })
            .select()
            .single();

          if (containerError) throw containerError;

          // Create purchase order linked to container
          const { data: purchaseOrder, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
              supplier_id: supplier.id,
              container_id: container.id,
              order_date: new Date().toISOString().split('T')[0],
              status: 'confirmed',
              subtotal: 50000,
              total_amount: 50000,
              cbm_volume: 45.5,
              created_by: '00000000-0000-0000-0000-000000000000'
            })
            .select()
            .single();

          if (poError) throw poError;

          // Create products for the container
          const containerProducts = [
            { name: 'Container Product A', sku: 'CONT-A-001', cbm_per_unit: 0.5 },
            { name: 'Container Product B', sku: 'CONT-B-001', cbm_per_unit: 0.3 }
          ];

          const createdProducts = [];
          for (const prod of containerProducts) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .insert({
                name: prod.name,
                sku: prod.sku,
                price: 200,
                stock_quantity: 0,
                cbm_per_unit: prod.cbm_per_unit
              })
              .select()
              .single();

            if (productError) throw productError;
            createdProducts.push(product);
          }

          // Create container products mapping
          const containerProductMappings = [
            { product_id: createdProducts[0].id, expected_quantity: 50, cbm_allocated: 25.0 },
            { product_id: createdProducts[1].id, expected_quantity: 70, cbm_allocated: 21.0 }
          ];

          const createdMappings = [];
          for (const mapping of containerProductMappings) {
            const { data: containerProduct, error: mappingError } = await supabase
              .from('container_products')
              .insert({
                container_id: container.id,
                product_id: mapping.product_id,
                product_name: `Product ${mapping.product_id}`,
                quantity: mapping.expected_quantity,
                unit_cost: 100,
                total_cost: mapping.expected_quantity * 100
              })
              .select()
              .single();

            if (mappingError) throw mappingError;
            createdMappings.push(containerProduct);
          }

          // Simulate container arrival and status updates
          const { data: arrivedContainer, error: arrivalError } = await supabase
            .from('containers')
            .update({
              status: 'port_arrival',
              port_arrival_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', container.id)
            .select()
            .single();

          if (arrivalError) throw arrivalError;

          // Create container analytics
          const { data: analytics, error: analyticsError } = await supabase
            .from('container_analytics')
            .insert({
              container_id: container.id,
              supplier_id: supplier.id,
              total_transit_days: 28,
              on_time_delivery: true,
              delivery_variance_days: -2,
              quality_score: 4.8
            })
            .select()
            .single();

          if (analyticsError) throw analyticsError;

          // Verify container-PO relationship
          const { data: containerWithPO, error: relationError } = await supabase
            .from('containers')
            .select(`
              *,
              suppliers(*),
              purchase_orders(*),
              container_products(*, products(*)),
              container_analytics(*)
            `)
            .eq('id', container.id)
            .single();

          if (relationError) throw relationError;

          // Calculate CBM utilization
          const totalAllocatedCBM = createdMappings.reduce((sum, mapping) => sum + mapping.cbm_allocated, 0);
          const utilizationPercentage = (totalAllocatedCBM / container.cbm_capacity) * 100;

          // Cleanup
          await supabase.from('container_analytics').delete().eq('id', analytics.id);
          await Promise.all(
            createdMappings.map(mapping => 
              supabase.from('container_products').delete().eq('id', mapping.id)
            )
          );
          await supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id);
          await supabase.from('containers').delete().eq('id', container.id);
          await Promise.all(
            createdProducts.map(product => 
              supabase.from('products').delete().eq('id', product.id)
            )
          );
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          const relationshipCorrect = containerWithPO.purchase_orders?.length > 0;
          const productsLinked = containerWithPO.container_products?.length === 2;
          const analyticsCreated = containerWithPO.container_analytics?.length > 0;

          return {
            success: relationshipCorrect && productsLinked && analyticsCreated,
            message: "Container management integration completed successfully",
            duration: Date.now() - startTime,
            details: {
              containerId: container.id,
              purchaseOrderId: purchaseOrder.id,
              containerNumber: container.container_number,
              statusUpdated: arrivedContainer.status,
              productsLinked: containerWithPO.container_products?.length || 0,
              totalAllocatedCBM,
              cbmUtilization: utilizationPercentage.toFixed(1) + '%',
              analyticsCreated: !!analytics
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Container management test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Supplier Performance Tracking",
      category: "Analytics",
      description: "Test supplier performance metrics and ratings",
      module: "Purchasing",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create suppliers with different performance levels
          const suppliers = [
            { name: 'Excellent Supplier', quality_rating: 5.0, delivery_rating: 4.8 },
            { name: 'Good Supplier', quality_rating: 4.2, delivery_rating: 4.0 },
            { name: 'Poor Supplier', quality_rating: 2.5, delivery_rating: 2.8 }
          ];

          const createdSuppliers = [];
          for (const sup of suppliers) {
            const { data: supplier, error: supplierError } = await supabase
              .from('suppliers')
              .insert({
                name: sup.name,
                email: `${sup.name.toLowerCase().replace(' ', '')}@test.com`,
                quality_rating: sup.quality_rating,
                delivery_rating: sup.delivery_rating,
                is_active: true
              })
              .select()
              .single();

            if (supplierError) throw supplierError;
            createdSuppliers.push(supplier);
          }

          // Create purchase orders to track performance
          const performanceData = [];
          for (let i = 0; i < createdSuppliers.length; i++) {
            const supplier = createdSuppliers[i];
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 14);
            
            const actualDate = new Date(expectedDate);
            if (i === 0) actualDate.setDate(actualDate.getDate() - 2); // 2 days early
            if (i === 1) actualDate.setDate(actualDate.getDate() + 1); // 1 day late
            if (i === 2) actualDate.setDate(actualDate.getDate() + 7); // 7 days late

            const { data: purchaseOrder, error: poError } = await supabase
              .from('purchase_orders')
              .insert({
                supplier_id: supplier.id,
                order_date: new Date().toISOString().split('T')[0],
                expected_delivery_date: expectedDate.toISOString().split('T')[0],
                actual_delivery_date: actualDate.toISOString().split('T')[0],
                status: 'completed',
                total_amount: 10000,
                created_by: '00000000-0000-0000-0000-000000000000'
              })
              .select()
              .single();

            if (poError) throw poError;
            performanceData.push({ supplier, purchaseOrder, actualDate, expectedDate });
          }

          // Calculate delivery performance metrics
          const deliveryMetrics = performanceData.map(data => {
            const timeDiff = data.actualDate.getTime() - data.expectedDate.getTime();
            const daysDifference = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const onTime = daysDifference <= 0;
            
            return {
              supplierId: data.supplier.id,
              supplierName: data.supplier.name,
              daysDifference,
              onTime,
              qualityRating: data.supplier.quality_rating,
              deliveryRating: data.supplier.delivery_rating
            };
          });

          // Query supplier performance analytics
          const { data: topSuppliers, error: topError } = await supabase
            .from('suppliers')
            .select('*')
            .gte('quality_rating', 4.0)
            .gte('delivery_rating', 4.0)
            .eq('is_active', true)
            .order('quality_rating', { ascending: false });

          if (topError) throw topError;

          const { data: poorSuppliers, error: poorError } = await supabase
            .from('suppliers')
            .select('*')
            .lt('quality_rating', 3.0)
            .eq('is_active', true);

          if (poorError) throw poorError;

          // Calculate overall performance scores
          const overallScores = deliveryMetrics.map(metric => ({
            ...metric,
            overallScore: (metric.qualityRating + metric.deliveryRating) / 2,
            performanceGrade: getPerformanceGrade((metric.qualityRating + metric.deliveryRating) / 2)
          }));

          function getPerformanceGrade(score: number): string {
            if (score >= 4.5) return 'A';
            if (score >= 3.5) return 'B';
            if (score >= 2.5) return 'C';
            return 'D';
          }

          // Cleanup
          await Promise.all(
            performanceData.map(data => 
              supabase.from('purchase_orders').delete().eq('id', data.purchaseOrder.id)
            )
          );
          await Promise.all(
            createdSuppliers.map(supplier => 
              supabase.from('suppliers').delete().eq('id', supplier.id)
            )
          );

          const performanceTracked = deliveryMetrics.length === 3;
          const topSuppliersFound = topSuppliers.length >= 1;
          const poorSuppliersFound = poorSuppliers.length >= 1;

          return {
            success: performanceTracked && topSuppliersFound && poorSuppliersFound,
            message: "Supplier performance tracking completed successfully",
            duration: Date.now() - startTime,
            details: {
              suppliersCreated: createdSuppliers.length,
              deliveryMetrics,
              overallScores,
              topSuppliers: topSuppliers.length,
              poorSuppliers: poorSuppliers.length,
              onTimeDeliveries: deliveryMetrics.filter(m => m.onTime).length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Supplier performance test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Purchase Cost Analysis",
      category: "Financial",
      description: "Test purchase cost tracking and analysis",
      module: "Purchasing",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create supplier
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: 'Cost Analysis Supplier',
              contact_person: 'Finance Manager',
              email: 'finance@supplier.com',
              payment_terms: 'net_30'
            })
            .select()
            .single();

          if (supplierError) throw supplierError;

          // Create purchase orders with different cost structures
          const purchaseOrdersData = [
            {
              subtotal: 10000,
              shipping_cost: 500,
              customs_cost: 300,
              port_charges: 200,
              transportation_cost: 400
            },
            {
              subtotal: 15000,
              shipping_cost: 750,
              customs_cost: 450,
              port_charges: 300,
              transportation_cost: 600
            }
          ];

          const createdPOs = [];
          for (const poData of purchaseOrdersData) {
            const totalAmount = poData.subtotal + poData.shipping_cost + 
                              poData.customs_cost + poData.port_charges + 
                              poData.transportation_cost;

            const { data: purchaseOrder, error: poError } = await supabase
              .from('purchase_orders')
              .insert({
                supplier_id: supplier.id,
                order_date: new Date().toISOString().split('T')[0],
                subtotal: poData.subtotal,
                shipping_cost: poData.shipping_cost,
                customs_cost: poData.customs_cost,
                port_charges: poData.port_charges,
                transportation_cost: poData.transportation_cost,
                total_amount: totalAmount,
                status: 'completed',
                created_by: '00000000-0000-0000-0000-000000000000'
               })
               .select()
               .single();

            if (poError) throw poError;
            createdPOs.push({ purchaseOrder, expectedTotal: totalAmount });
          }

          // Create products and PO items for cost analysis
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Cost Analysis Product',
              sku: 'COST-001',
              price: 150,
              stock_quantity: 0
            })
            .select()
            .single();

          if (productError) throw productError;

          const poItems = [];
          for (let i = 0; i < createdPOs.length; i++) {
            const quantity = (i + 1) * 20; // 20, 40
            const unitCost = 50 + (i * 10); // 50, 60
            
            const { data: poItem, error: itemError } = await supabase
              .from('purchase_order_items')
              .insert({
                purchase_order_id: createdPOs[i].purchaseOrder.id,
                product_id: product.id,
                quantity: quantity,
                unit_cost: unitCost,
                line_total: quantity * unitCost
              })
              .select()
              .single();

            if (itemError) throw itemError;
            poItems.push(poItem);
          }

          // Analyze costs by category
          const { data: costAnalysis, error: analysisError } = await supabase
            .from('purchase_orders')
            .select(`
              subtotal,
              shipping_cost,
              customs_cost,
              port_charges,
              transportation_cost,
              total_amount
            `)
            .eq('supplier_id', supplier.id);

          if (analysisError) throw analysisError;

          // Calculate cost breakdowns
          const totalSubtotal = costAnalysis.reduce((sum, po) => sum + po.subtotal, 0);
          const totalShipping = costAnalysis.reduce((sum, po) => sum + (po.shipping_cost || 0), 0);
          const totalCustoms = costAnalysis.reduce((sum, po) => sum + (po.customs_cost || 0), 0);
          const totalPorts = costAnalysis.reduce((sum, po) => sum + (po.port_charges || 0), 0);
          const totalTransport = costAnalysis.reduce((sum, po) => sum + (po.transportation_cost || 0), 0);
          const grandTotal = costAnalysis.reduce((sum, po) => sum + po.total_amount, 0);

          // Calculate cost percentages
          const costBreakdown = {
            subtotal: { amount: totalSubtotal, percentage: (totalSubtotal / grandTotal) * 100 },
            shipping: { amount: totalShipping, percentage: (totalShipping / grandTotal) * 100 },
            customs: { amount: totalCustoms, percentage: (totalCustoms / grandTotal) * 100 },
            ports: { amount: totalPorts, percentage: (totalPorts / grandTotal) * 100 },
            transport: { amount: totalTransport, percentage: (totalTransport / grandTotal) * 100 }
          };

          // Analyze supplier cost efficiency
          const { data: supplierAnalysis, error: supplierAnalysisError } = await supabase
            .from('purchase_orders')
            .select(`
              total_amount,
              purchase_order_items(quantity, unit_cost, line_total)
            `)
            .eq('supplier_id', supplier.id);

          if (supplierAnalysisError) throw supplierAnalysisError;

          // Cleanup
          await Promise.all(
            poItems.map(item => 
              supabase.from('purchase_order_items').delete().eq('id', item.id)
            )
          );
          await Promise.all(
            createdPOs.map(({ purchaseOrder }) => 
              supabase.from('purchase_orders').delete().eq('id', purchaseOrder.id)
            )
          );
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          const expectedGrandTotal = purchaseOrdersData.reduce((sum, po) => 
            sum + po.subtotal + po.shipping_cost + po.customs_cost + po.port_charges + po.transportation_cost, 0
          );

          const calculationCorrect = Math.abs(grandTotal - expectedGrandTotal) < 0.01;
          const costCategoriesTracked = totalShipping > 0 && totalCustoms > 0 && totalPorts > 0;

          return {
            success: calculationCorrect && costCategoriesTracked,
            message: "Purchase cost analysis completed successfully",
            duration: Date.now() - startTime,
            details: {
              purchaseOrdersAnalyzed: costAnalysis.length,
              grandTotal,
              expectedGrandTotal,
              costBreakdown,
              supplierAnalysis: supplierAnalysis.length,
              calculationAccurate: calculationCorrect
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Purchase cost analysis test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    }
  ], []);

  return { createPurchasingTests };
};