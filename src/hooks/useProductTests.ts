// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useProductTests = () => {
  const createProductManagementTests = (): BusinessTest[] => [
      {
      name: "Product Creation Basic Test",
      category: "Product Management",
      description: "Test basic product creation functionality with schema compliance",
      module: "Products",
      priority: "Critical" as const,
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          const { TestDatabaseUtils } = await import('@/utils/testDatabaseUtils');
          
          // Use enhanced unique ID generation to prevent collisions
          const uniqueSKU = TestDatabaseUtils.generateUniqueSKU('PROD');
          const testProduct = {
            name: `Test Product ${Date.now()}`,
            sku: uniqueSKU,
            category: "Solar Panel",
            cost_price: 100.00,
            selling_price: 120.00,
            standard_selling_price: 150.00,
            current_stock: 10,
            reorder_point: 5,
            reorder_quantity: 50,
            warranty_months: 12,
            is_active: true,
            requires_installation: false,
            weight: 25.5,
            dimensions: "165x99x4",
            description: "Test product for automated testing"
          };

          const { data, error } = await supabase
            .from('products')
            .insert(testProduct)
            .select()
            .single();

          if (error) throw error;

          // Verify product was created with all required fields
          const hasRequiredFields = data && data.sku === uniqueSKU && 
                                  data.name && data.standard_selling_price && 
                                  data.is_active !== undefined;

          // Cleanup
          if (data?.id) {
            await supabase.from('products').delete().eq('id', data.id);
          }

          return {
            success: hasRequiredFields,
            message: hasRequiredFields ? 
              `Product created successfully with SKU: ${uniqueSKU}` : 
              "Product creation missing required fields",
            details: { 
              productId: data?.id, 
              sku: data?.sku,
              requiredFieldsPresent: hasRequiredFields
            },
            duration: Date.now() - startTime,
            testName: "Product Creation Basic Test",
            category: "Product Management",
            priority: "Critical",
            module: "Products"
          };
        } catch (error: any) {
          const { TestErrorHandler } = await import('@/utils/testErrorHandler');
          TestErrorHandler.handleTestError(error, 'Product Creation Basic Test');
          return {
            success: false,
            message: "Product creation test failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Product Creation Basic Test",
            category: "Product Management", 
            priority: "Critical",
            module: "Products"
          };
        }
      }
    },
    {
      name: "Product SKU Validation",
      category: "Product Management",
      description: "Test SKU uniqueness validation",
      module: "Products",
      priority: "High" as const,
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // First create a product with a specific SKU
          const testSku = `TEST-SKU-${Date.now()}`;
          const { data: firstProduct, error: firstError } = await supabase
            .from('products')
            .insert({
              name: "First Test Product",
              sku: testSku,
              category: "Test",
              cost_price: 100,
              standard_selling_price: 150,
              current_stock: 10
            })
            .select()
            .single();

          if (firstError) throw firstError;

          // Try to create another product with the same SKU
          const { error: duplicateError } = await supabase
            .from('products')
            .insert({
              name: "Second Test Product",
              sku: testSku,
              category: "Test",
              cost_price: 100,
              standard_selling_price: 150,
              current_stock: 10
            });

          // Cleanup
          if (firstProduct?.id) {
            await supabase.from('products').delete().eq('id', firstProduct.id);
          }

          const shouldHaveError = !!duplicateError;
          
          return {
            success: shouldHaveError,
            message: shouldHaveError ? "SKU validation working correctly" : "SKU validation failed - duplicate allowed",
            duration: Date.now() - startTime,
            testName: "Product SKU Validation",
            category: "Product Management",
            priority: "High",
            module: "Products"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "SKU validation test failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Product SKU Validation",
            category: "Product Management",
            priority: "High",
            module: "Products"
          };
        }
      }
    }
  ];

  return { createProductManagementTests };
};