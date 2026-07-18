// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useComprehensiveSalesTests = () => {
  const createComprehensiveSalesTests = (): BusinessTest[] => [
    {
      name: "Lead to Customer Conversion",
      category: "Sales Lifecycle",
      description: "Test converting leads to customers with complete profile",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test lead
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              full_name: 'Test Customer Lead',
              email: `testlead${Date.now()}@example.com`,
              phone: '+1234567890',
              status: 'new',
              estimated_value: 15000,
              source: 'website',
              notes: 'Test lead for conversion'
            })
            .select()
            .single();

          if (leadError || !lead) {
            return {
              success: false,
              message: "Failed to create test lead",
              error: leadError?.message,
              duration: Date.now() - startTime,
              testName: "Lead to Customer Conversion",
              category: "Sales Lifecycle", 
              priority: "Critical",
              module: "Sales"
            };
          }

          // Convert lead to customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: lead.full_name || 'Test Customer Company',
              contact_person: lead.full_name,
              email: lead.email,
              phone: lead.phone,
              address: '123 Test Street, Test City'
            })
            .select()
            .single();

          if (customerError) {
            return {
              success: false,
              message: "Failed to create customer from lead",
              error: customerError.message,
              duration: Date.now() - startTime,
              testName: "Lead to Customer Conversion",
              category: "Sales Lifecycle",
              priority: "Critical", 
              module: "Sales"
            };
          }

          // Update lead with customer reference
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              customer_id: customer.id,
              status: 'closed_won'
            })
            .eq('id', lead.id);

          return {
            success: !updateError,
            message: updateError ? "Failed to link lead to customer" : "Lead successfully converted to customer",
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { leadId: lead.id, customerId: customer.id },
            testName: "Lead to Customer Conversion",
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Lead to customer conversion test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Lead to Customer Conversion", 
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Quotation Generation",
      category: "Sales Lifecycle",
      description: "Test creating quotations with multiple products and pricing tiers",
      module: "Sales", 
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get customer and products
          const [customerResult, productsResult] = await Promise.all([
            supabase.from('customers').select('id').limit(1),
            supabase.from('products').select('id, standard_selling_price').limit(3)
          ]);

          if (!customerResult.data?.length || !productsResult.data?.length) {
            return {
              success: false,
              message: "No customers or products found for quotation",
              duration: Date.now() - startTime,
              testName: "Quotation Generation",
              category: "Sales Lifecycle",
              priority: "High", 
              module: "Sales"
            };
          }

          // Create quotation
          const { data: quotation, error: quotationError } = await supabase
            .from('quotations')
            .insert({
              quote_number: `QUOTE-${Date.now()}`,
              customer_name: 'Test Customer',
              customer_email: 'test@example.com',
              customer_phone: '+1234567890',
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'draft',
              subtotal: 0,
              tax_amount: 0,
              total_amount: 0,
              notes: 'Test quotation with multiple products'
            })
            .select()
            .single();

          if (quotationError) {
            return {
              success: false,
              message: "Failed to create quotation",
              error: quotationError.message,
              duration: Date.now() - startTime,
              testName: "Quotation Generation",
              category: "Sales Lifecycle",
              priority: "High",
              module: "Sales"
            };
          }

          // Add quotation items
          const quotationItems = productsResult.data.map((product, index) => ({
            quotation_id: quotation.id,
            product_id: product.id,
            product_name: `Test Product ${index + 1}`,
            quantity: (index + 1) * 2,
            unit_price: product.standard_selling_price || 500,
            line_total: (index + 1) * 2 * (product.standard_selling_price || 500),
            description: `Test quotation item ${index + 1}`
          }));

          const { error: itemsError } = await supabase
            .from('quotation_items')
            .insert(quotationItems);

          // Calculate totals
          const subtotal = quotationItems.reduce((sum, item) => sum + item.line_total, 0);
          const taxAmount = subtotal * 0.1; // 10% tax
          const totalAmount = subtotal + taxAmount;

          // Update quotation with totals
          const { error: updateError } = await supabase
            .from('quotations')
            .update({
              subtotal: subtotal,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              status: 'sent'
            })
            .eq('id', quotation.id);

          return {
            success: !itemsError && !updateError,
            message: itemsError || updateError ? "Failed to complete quotation" : "Quotation created successfully with items",
            error: itemsError?.message || updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              quotationId: quotation.id, 
              itemCount: quotationItems.length, 
              totalAmount 
            },
            testName: "Quotation Generation",
            category: "Sales Lifecycle",
            priority: "High",
            module: "Sales"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Quotation generation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Quotation Generation",
            category: "Sales Lifecycle", 
            priority: "High",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Quotation to Sale Conversion",
      category: "Sales Lifecycle",
      description: "Test converting approved quotations to sales orders",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get quotation with items
          const { data: quotation } = await supabase
            .from('quotations')
            .select(`
              id, customer_id, total_amount, subtotal, tax_amount,
              quotation_items(product_id, quantity, unit_price, line_total)
            `)
            .eq('status', 'sent')
            .limit(1)
            .single();

          if (!quotation || !quotation.quotation_items?.length) {
            return {
              success: false,
              message: "No quotations with items found to convert",
              duration: Date.now() - startTime,
              testName: "Quotation to Sale Conversion",
              category: "Sales Lifecycle",
              priority: "Critical",
              module: "Sales"
            };
          }

          // Get staff member for sales rep
          const { data: staff } = await supabase
            .from('staff')
            .select('id')
            .eq('role', 'sales_rep')
            .limit(1)
            .single();

          // Create sale from quotation
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: quotation.customer_id,
              sales_rep_id: staff?.id,
              sale_date: new Date().toISOString().split('T')[0],
              subtotal: quotation.subtotal,
              tax_amount: quotation.tax_amount,
              total_amount: quotation.total_amount,
              payment_status: 'pending',
              fulfillment_status: 'pending',
              invoice_number: `INV-${Date.now()}`,
              notes: `Converted from quotation ${quotation.id}`
            })
            .select()
            .single();

          if (saleError) {
            return {
              success: false,
              message: "Failed to create sale from quotation",
              error: saleError.message,
              duration: Date.now() - startTime,
              testName: "Quotation to Sale Conversion",
              category: "Sales Lifecycle",
              priority: "Critical",
              module: "Sales"
            };
          }

          // Create sale items from quotation items
          const saleItems = quotation.quotation_items.map(item => ({
            sale_id: sale.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total
          }));

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems);

          // Update quotation status
          const { error: quotationUpdateError } = await supabase
            .from('quotations')
            .update({ status: 'accepted' })
            .eq('id', quotation.id);

          return {
            success: !itemsError && !quotationUpdateError,
            message: itemsError || quotationUpdateError ? "Failed to complete quotation conversion" : "Quotation successfully converted to sale",
            error: itemsError?.message || quotationUpdateError?.message,
            duration: Date.now() - startTime,
            details: { 
              quotationId: quotation.id, 
              saleId: sale.id,
              itemCount: saleItems.length 
            },
            testName: "Quotation to Sale Conversion",
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Quotation to sale conversion test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Quotation to Sale Conversion",
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Sale Inventory Deduction",
      category: "Sales Lifecycle",
      description: "Test automatic inventory deduction when sales are processed",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get product with stock and create a small sale
          const { data: product } = await supabase
            .from('products')
            .select('id, current_stock')
            .gt('current_stock', 5)
            .limit(1)
            .single();

          if (!product) {
            return {
              success: false,
              message: "No products with sufficient stock found",
              duration: Date.now() - startTime,
              testName: "Sale Inventory Deduction",
              category: "Sales Lifecycle",
              priority: "Critical",
              module: "Sales"
            };
          }

          const initialStock = product.current_stock;
          const saleQuantity = 3;

          // Get customer
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .limit(1)
            .single();

          if (!customer) {
            return {
              success: false,
              message: "No customers found",
              duration: Date.now() - startTime,
              testName: "Sale Inventory Deduction",
              category: "Sales Lifecycle",
              priority: "Critical", 
              module: "Sales"
            };
          }

          // Create sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              sale_date: new Date().toISOString().split('T')[0],
              subtotal: 1500,
              tax_amount: 150,
              total_amount: 1650,
              payment_status: 'pending',
              fulfillment_status: 'pending',
              invoice_number: `TEST-INV-${Date.now()}`
            })
            .select()
            .single();

          if (saleError) {
            return {
              success: false,
              message: "Failed to create sale",
              error: saleError.message,
              duration: Date.now() - startTime,
              testName: "Sale Inventory Deduction",
              category: "Sales Lifecycle",
              priority: "Critical",
              module: "Sales"
            };
          }

          // Add sale item (this should trigger inventory deduction)
          const { error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: saleQuantity,
              unit_price: 500,
              line_total: saleQuantity * 500
            });

          if (itemError) {
            return {
              success: false,
              message: "Failed to create sale item",
              error: itemError.message,
              duration: Date.now() - startTime,
              testName: "Sale Inventory Deduction",
              category: "Sales Lifecycle",
              priority: "Critical",
              module: "Sales"
            };
          }

          // Check if inventory was reduced
          const { data: updatedProduct } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', product.id)
            .single();

          const expectedStock = initialStock - saleQuantity;
          const inventoryReduced = updatedProduct && updatedProduct.current_stock === expectedStock;

          return {
            success: inventoryReduced,
            message: inventoryReduced ? "Inventory successfully deducted from sale" : "Inventory deduction failed or incorrect",
            duration: Date.now() - startTime,
            details: { 
              initialStock, 
              saleQuantity, 
              expectedStock,
              actualStock: updatedProduct?.current_stock,
              saleId: sale.id
            },
            testName: "Sale Inventory Deduction",
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Sale inventory deduction test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Sale Inventory Deduction",
            category: "Sales Lifecycle",
            priority: "Critical",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Sales Fulfillment Workflow",
      category: "Sales Lifecycle",
      description: "Test sales fulfillment status progression",
      module: "Sales",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get pending sale
          const { data: sale } = await supabase
            .from('sales')
            .select('id')
            .eq('fulfillment_status', 'pending')
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No pending sales found for fulfillment test",
              duration: Date.now() - startTime,
              testName: "Sales Fulfillment Workflow",
              category: "Sales Lifecycle",
              priority: "High",
              module: "Sales"
            };
          }

          // Progress through fulfillment stages
          const fulfillmentStages = ['picking', 'packed', 'shipped', 'delivered'];
          let currentStage = 'pending';

          for (const stage of fulfillmentStages) {
            const updateData: any = { fulfillment_status: stage };
            
            if (stage === 'delivered') {
              updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
            }

            const { error } = await supabase
              .from('sales')
              .update(updateData)
              .eq('id', sale.id);

            if (error) {
              return {
                success: false,
                message: `Failed to update fulfillment status to ${stage}`,
                error: error.message,
                duration: Date.now() - startTime,
                testName: "Sales Fulfillment Workflow",
                category: "Sales Lifecycle",
                priority: "High",
                module: "Sales"
              };
            }
            currentStage = stage;
          }

          return {
            success: true,
            message: `Sale fulfillment progressed through all stages to ${currentStage}`,
            duration: Date.now() - startTime,
            details: { saleId: sale.id, finalStage: currentStage },
            testName: "Sales Fulfillment Workflow",
            category: "Sales Lifecycle",
            priority: "High",
            module: "Sales"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Sales fulfillment workflow test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Sales Fulfillment Workflow",
            category: "Sales Lifecycle",
            priority: "High", 
            module: "Sales"
          };
        }
      }
    }
  ];

  return { createComprehensiveSalesTests };
};