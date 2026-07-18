// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useExpandedContainerTests = () => {
  const createExpandedContainerTests = useCallback((): BusinessTest[] => [
    {
      name: "Container Order Creation",
      category: "Container Management",
      description: "Test container order creation with supplier validation",
      module: "Containers",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test supplier
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              name: 'Test Container Supplier',
              contact_person: 'John Supplier',
              email: 'supplier@container.com',
              lead_time_days: 14
            })
            .select()
            .single();

          if (supplierError) throw supplierError;

          // Create container
          const { data: container, error: containerError } = await supabase
            .from('containers')
            .insert({
              container_number: `CNT-${Date.now()}`,
              container_type: '20ft', // FIXED: Use valid enum value
              supplier_id: supplier.id,
              status: 'ordered',
              cbm_capacity: 67.7,
              total_cost: 25000
            })
            .select()
            .single();

          if (containerError) throw containerError;

          // Cleanup
          await supabase.from('containers').delete().eq('id', container.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          return {
            success: true,
            message: "Container order created successfully",
            details: { containerId: container.id, supplierName: supplier.name },
            duration: Date.now() - startTime,
            testName: "Container Order Creation",
            category: "Container Management",
            priority: "Critical",
            module: "Containers"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Container order creation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Container Order Creation",
            category: "Container Management",
            priority: "Critical",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Status Progression",
      category: "Container Workflow",
      description: "Test container status updates through delivery lifecycle",
      module: "Containers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const { data: supplier } = await supabase
            .from('suppliers')
            .insert({
              name: 'Status Test Supplier',
              contact_person: 'Status Tester',
              email: 'status@test.com'
            })
            .select()
            .single();

          const { data: container } = await supabase
            .from('containers')
            .insert({
              container_number: `STATUS-${Date.now()}`,
              container_type: '20ft',
              supplier_id: supplier.id,
              status: 'ordered'
            })
            .select()
            .single();

          // Test status progression using valid container statuses
          const statuses = ['confirmed', 'shipped', 'in_transit', 'port_arrival', 'customs_cleared', 'completed'];
          let progressionSuccess = true;

          for (const status of statuses) {
            const { error } = await supabase
              .from('containers')
              .update({ status: status as any })
              .eq('id', container.id);
            
            if (error) {
              progressionSuccess = false;
              break;
            }
          }

          // Cleanup
          await supabase.from('containers').delete().eq('id', container.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          return {
            success: progressionSuccess,
            message: "Container status progression completed",
            details: { statusCount: statuses.length, containerId: container.id },
            duration: Date.now() - startTime,
            testName: "Container Status Progression",
            category: "Container Workflow",
            priority: "High",
            module: "Containers"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Container status progression failed",
            error: error.message,
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
      category: "Container Management",
      description: "Test assigning products to containers with quantities",
      module: "Containers",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test data
          const { data: supplier } = await supabase
            .from('suppliers')
            .insert({ name: 'Product Test Supplier', email: 'products@test.com' })
            .select().single();

          const { data: container } = await supabase
            .from('containers')
            .insert({
              container_number: `PROD-${Date.now()}`,
              container_type: '40ft', // FIXED: Use valid enum value
              supplier_id: supplier.id,
              status: 'confirmed'
            })
            .select().single();

          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Container Test Product ${Date.now()}`,
              sku: `CP-${Date.now()}`,
              category: 'Test',
              cost_price: 50,
              standard_selling_price: 75
            })
            .select().single();

          // Assign product to container
          const { data: containerProduct, error: assignError } = await supabase
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

          if (assignError) throw assignError;

          // Verify assignment
          const { data: verification } = await supabase
            .from('container_products')
            .select('*, products(*), containers(*)')
            .eq('id', containerProduct.id)
            .single();

          // Cleanup
          await supabase.from('container_products').delete().eq('id', containerProduct.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('containers').delete().eq('id', container.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          return {
            success: !!verification && verification.quantity === 100,
            message: "Container product assignment completed",
            details: { productId: product.id, quantity: 100, totalCost: 4500 },
            duration: Date.now() - startTime,
            testName: "Container Products Assignment",
            category: "Container Management",
            priority: "Critical",
            module: "Containers"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Container product assignment failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Container Products Assignment",
            category: "Container Management",
            priority: "Critical",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Variance Detection",
      category: "Quality Control",
      description: "Test recording and tracking container quantity variances",
      module: "Containers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test setup
          const { data: supplier } = await supabase
            .from('suppliers')
            .insert({ name: 'Variance Test Supplier', email: 'variance@test.com' })
            .select().single();

          const { data: container } = await supabase
            .from('containers')
            .insert({
              container_number: `VAR-${Date.now()}`,
              container_type: '20ft',
              supplier_id: supplier.id,
              status: 'completed'
            })
            .select().single();

          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Variance Test Product ${Date.now()}`,
              sku: `VT-${Date.now()}`,
              category: 'Test',
              cost_price: 30
            })
            .select().single();

          const { data: containerProduct } = await supabase
            .from('container_products')
            .insert({
              container_id: container.id,
              product_id: product.id,
              product_name: product.name,
              quantity: 200,
              unit_cost: 30
            })
            .select().single();

          // Record variance (actual received less than expected)
          const expectedQty = 200;
          const actualQty = 185;
          const varianceQty = actualQty - expectedQty;

          const { data: variance, error: varianceError } = await supabase
            .from('container_variances')
            .insert({
              container_id: container.id,
              container_product_id: containerProduct.id,
              expected_quantity: expectedQty,
              actual_quantity: actualQty,
              variance_quantity: varianceQty,
              variance_value: varianceQty * 30,
              variance_type: 'shortage',
              severity: 'medium',
              status: 'pending',
              notes: 'Shortage detected during receiving'
            })
            .select()
            .single();

          if (varianceError) throw varianceError;

          // Cleanup
          await supabase.from('container_variances').delete().eq('id', variance.id);
          await supabase.from('container_products').delete().eq('id', containerProduct.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('containers').delete().eq('id', container.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          return {
            success: variance.variance_quantity === -15,
            message: "Container variance detection completed",
            details: { 
              expected: expectedQty, 
              actual: actualQty, 
              variance: varianceQty,
              varianceValue: variance.variance_value 
            },
            duration: Date.now() - startTime,
            testName: "Container Variance Detection",
            category: "Quality Control",
            priority: "High",
            module: "Containers"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Container variance detection failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Container Variance Detection",
            category: "Quality Control", 
            priority: "High",
            module: "Containers"
          };
        }
      }
    },

    {
      name: "Container Analytics Generation",
      category: "Analytics",
      description: "Test generating performance analytics for delivered containers",
      module: "Containers",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const { data: supplier } = await supabase
            .from('suppliers')
            .insert({ name: 'Analytics Supplier', email: 'analytics@test.com' })
            .select().single();

          const orderDate = new Date('2024-01-01');
          const deliveredDate = new Date('2024-02-15');
          const transitDays = Math.floor((deliveredDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

          const { data: container } = await supabase
            .from('containers')
            .insert({
              container_number: `ANALYTICS-${Date.now()}`,
              container_type: '40ft', // FIXED: Use valid enum value
              supplier_id: supplier.id,
              order_date: orderDate.toISOString().split('T')[0],
              delivered_date: deliveredDate.toISOString().split('T')[0],
              status: 'completed'
            })
            .select().single();

          // Generate analytics
          const { data: analytics, error: analyticsError } = await supabase
            .from('container_analytics')
            .insert({
              container_id: container.id,
              supplier_id: supplier.id,
              total_transit_days: transitDays,
              customs_processing_days: 5,
              port_processing_days: 3,
              local_delivery_days: 2,
              on_time_delivery: transitDays <= 45,
              delivery_variance_days: transitDays - 45,
              quality_score: 4.2,
              variance_count: 1,
              discrepancy_value: 450
            })
            .select()
            .single();

          if (analyticsError) throw analyticsError;

          // Cleanup
          await supabase.from('container_analytics').delete().eq('id', analytics.id);
          await supabase.from('containers').delete().eq('id', container.id);
          await supabase.from('suppliers').delete().eq('id', supplier.id);

          return {
            success: analytics.total_transit_days === transitDays,
            message: "Container analytics generation completed",
            details: {
              transitDays,
              qualityScore: analytics.quality_score,
              onTimeDelivery: analytics.on_time_delivery
            },
            duration: Date.now() - startTime,
            testName: "Container Analytics Generation",
            category: "Analytics",
            priority: "Medium",
            module: "Containers"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Container analytics generation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Container Analytics Generation",
            category: "Analytics",
            priority: "Medium",
            module: "Containers"
          };
        }
      }
    }

    // TODO: Add 10 more container tests to reach 15 total
    // Container Inspection Quality Control
    // Multi-Container Order Management  
    // Container Cost Optimization
    // Container Supplier Performance
    // Container Documentation Compliance
    // Container Insurance Claims
    // Container Consolidation
    // Container Customs Clearance
    // Container GPS Tracking
    // Container ROI Analysis

  ], []);

  return { createExpandedContainerTests };
};