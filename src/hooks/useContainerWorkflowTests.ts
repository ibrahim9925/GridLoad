// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useContainerWorkflowTests = () => {
  const createContainerWorkflowTests = (): BusinessTest[] => [
    {
      name: "Container Order Creation",
      category: "Container Workflow",
      description: "Test creating a container order with multiple products",
      module: "Containers",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Check if supplier exists
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id')
            .limit(1);

          if (!suppliers || suppliers.length === 0) {
            return {
              success: false,
              message: "No suppliers found - cannot create container order",
              duration: Date.now() - startTime,
              testName: "Container Order Creation",
              category: "Container Workflow",
              priority: "Critical",
              module: "Containers"
            };
          }

          // Create container order
          const { data: container, error } = await supabase
            .from('containers')
            .insert({
              supplier_id: suppliers[0].id,
              container_number: `TEST-CONT-${Date.now()}`,
              container_type: '40ft',
              order_date: new Date().toISOString().split('T')[0],
              expected_arrival_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'ordered'
            })
            .select()
            .single();

          return {
            success: !error,
            message: error ? "Failed to create container order" : "Container order created successfully",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { containerId: container?.id },
            testName: "Container Order Creation",
            category: "Container Workflow",
            priority: "Critical",
            module: "Containers"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Container order creation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Container Order Creation",
            category: "Container Workflow",
            priority: "Critical",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Status Progression",
      category: "Container Workflow",
      description: "Test container status updates through all stages",
      module: "Containers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get a container to update
          const { data: containers } = await supabase
            .from('containers')
            .select('id')
            .eq('status', 'ordered')
            .limit(1);

          if (!containers || containers.length === 0) {
            return {
              success: false,
              message: "No ordered containers found for status progression test",
              duration: Date.now() - startTime,
              testName: "Container Status Progression",
              category: "Container Workflow",
              priority: "High",
              module: "Containers"
            };
          }

          const containerId = containers[0].id;
          const statusFlow = [
            { status: 'shipped', dateField: 'shipped_date' },
            { status: 'in_transit', dateField: 'in_transit_date' },
            { status: 'port_arrival', dateField: 'port_arrival_date' },
            { status: 'customs_cleared', dateField: 'customs_completion_date' },
            { status: 'delivered', dateField: 'delivered_date' }
          ];
          let currentStatus = 'ordered';

          for (const { status, dateField } of statusFlow) {
            const updateData: any = { status };
            updateData[dateField] = new Date().toISOString().split('T')[0];
            
            const { error } = await supabase
              .from('containers')
              .update(updateData)
              .eq('id', containerId);

            if (error) {
              return {
                success: false,
                message: `Failed to update container status to ${status}`,
                error: error.message,
                duration: Date.now() - startTime,
                testName: "Container Status Progression",
                category: "Container Workflow",
                priority: "High",
                module: "Containers"
              };
            }
            currentStatus = status;
          }

          return {
            success: true,
            message: `Container status progressed through all stages to ${currentStatus}`,
            duration: Date.now() - startTime,
            details: { finalStatus: currentStatus, containerId },
            testName: "Container Status Progression",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Container status progression test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Container Status Progression",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Products Assignment",
      category: "Container Workflow",
      description: "Test adding products to containers with quantities and costs",
      module: "Containers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get container and products
          const [containerResult, productsResult] = await Promise.all([
            supabase.from('containers').select('id').limit(1),
            supabase.from('products').select('id').limit(3)
          ]);

          if (!containerResult.data?.length || !productsResult.data?.length) {
            return {
              success: false,
              message: "No containers or products found",
              duration: Date.now() - startTime,
              testName: "Container Products Assignment",
              category: "Container Workflow",
              priority: "High",
              module: "Containers"
            };
          }

          // Add products to container
          const containerProducts = productsResult.data.map((product, index) => ({
            container_id: containerResult.data[0].id,
            product_id: product.id,
            product_name: `Test Product ${index + 1}`,
            quantity: (index + 1) * 10,
            unit_cost: (index + 1) * 100,
            total_cost: (index + 1) * 10 * (index + 1) * 100
          }));

          const { error } = await supabase
            .from('container_products')
            .insert(containerProducts);

          return {
            success: !error,
            message: error ? "Failed to assign products to container" : "Products assigned to container successfully",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { productsAssigned: containerProducts.length },
            testName: "Container Products Assignment",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Container products assignment test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Container Products Assignment",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Variance Detection",
      category: "Container Workflow", 
      description: "Test detecting and recording container variances",
      module: "Containers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get container with products
          const { data: containerProduct } = await supabase
            .from('container_products')
            .select('id, container_id, quantity')
            .limit(1)
            .single();

          if (!containerProduct) {
            return {
              success: false,
              message: "No container products found for variance test",
              duration: Date.now() - startTime,
              testName: "Container Variance Detection",
              category: "Container Workflow",
              priority: "High",
              module: "Containers"
            };
          }

          // Create variance record
          const expectedQuantity = containerProduct.quantity;
          const actualQuantity = expectedQuantity - 5; // Simulate shortage
          const varianceQuantity = expectedQuantity - actualQuantity;

          const { error } = await supabase
            .from('container_variances')
            .insert({
              container_id: containerProduct.container_id,
              container_product_id: containerProduct.id,
              expected_quantity: expectedQuantity,
              actual_quantity: actualQuantity,
              variance_quantity: varianceQuantity,
              variance_type: 'shortage',
              severity: 'medium',
              status: 'pending',
              notes: 'Test variance - 5 units short'
            });

          return {
            success: !error,
            message: error ? "Failed to create variance record" : "Container variance detected and recorded",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { varianceQuantity, expectedQuantity, actualQuantity },
            testName: "Container Variance Detection",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Container variance detection test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Container Variance Detection",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Analytics Generation",
      category: "Container Workflow",
      description: "Test generating container analytics and performance metrics",
      module: "Containers",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get completed container
          const { data: container } = await supabase
            .from('containers')
            .select('id, supplier_id, order_date, delivered_date')
            .eq('status', 'delivered')
            .limit(1)
            .single();

          if (!container) {
            return {
              success: false,
              message: "No delivered containers found for analytics",
              duration: Date.now() - startTime,
              testName: "Container Analytics Generation",
              category: "Container Workflow",
              priority: "Medium",
              module: "Containers"
            };
          }

          // Calculate analytics
          const orderDate = new Date(container.order_date);
          const deliveredDate = new Date(container.delivered_date);
          const totalTransitDays = Math.floor((deliveredDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

          // Create analytics record
          const { error } = await supabase
            .from('container_analytics')
            .insert({
              container_id: container.id,
              supplier_id: container.supplier_id,
              total_transit_days: totalTransitDays,
              customs_processing_days: 3,
              port_processing_days: 2,
              local_delivery_days: 1,
              on_time_delivery: totalTransitDays <= 30,
              delivery_variance_days: Math.max(0, totalTransitDays - 30),
              quality_score: 4.5,
              variance_count: 0,
              discrepancy_value: 0
            });

          return {
            success: !error,
            message: error ? "Failed to generate container analytics" : "Container analytics generated successfully",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { totalTransitDays, containerId: container.id },
            testName: "Container Analytics Generation",
            category: "Container Workflow",
            priority: "Medium",
            module: "Containers"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Container analytics generation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Container Analytics Generation",
            category: "Container Workflow",
            priority: "Medium",
            module: "Containers"
          };
        }
      }
    }
  ];

  return { createContainerWorkflowTests };
};