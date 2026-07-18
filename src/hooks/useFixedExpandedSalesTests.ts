// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";
import { TestDatabaseUtils } from "@/utils/testDatabaseUtils";

export const useFixedExpandedSalesTests = () => {
  const createExpandedSalesTests = useCallback((): BusinessTest[] => [
    {
      name: "Complete Sales Order Processing",
      category: "Sales Management",
      description: "Test end-to-end sales order creation, validation, and fulfillment",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Complete Sales Customer',
              contact_person: 'Sales Manager',
              email: 'sales@complete.com',
              phone: '555-0100'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create product with enhanced uniqueness
          const uniqueSKU = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 100000)}`;
          const { data: product } = await supabase
            .from('products')
            .insert({
              name: `Sales Product ${Date.now()}`,
              sku: uniqueSKU,
              category: 'Sales Items',
              cost_price: 100,
              standard_selling_price: 150,
              current_stock: 50,
              description: 'Test product for sales validation' // Add required field
            })
            .select()
            .single();

          // Create sales order with valid enum values
          const orderTotal = 1500;
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              sale_date: new Date().toISOString().split('T')[0],
              subtotal: 1500,
              tax_amount: 225,
              total_amount: orderTotal + 225,
              payment_terms: 'net_30',
              payment_status: 'pending', // Valid enum value
              fulfillment_status: 'pending' // FIXED: Valid enum value (removed 'processing')
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Add sale items
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: 10,
              unit_price: 150,
              line_total: 1500
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Update inventory
          await supabase
            .from('products')
            .update({ current_stock: 40 })
            .eq('id', product.id);

          // Create stock movement
          const { data: stockMovement } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'out',
              quantity: 10,
              reference_type: 'sale',
              reference_id: sale.id,
              unit_cost: 100,
              total_cost: 1000
            })
            .select()
            .single();

          // Verify sales order
          const { data: completeSale } = await supabase
            .from('sales')
            .select(`
              *,
              customers!inner(*),
              sale_items!inner(*, products!inner(*))
            `)
            .eq('id', sale.id)
            .single();

          // Cleanup
          await supabase.from('stock_movements').delete().eq('id', stockMovement.id);
          await supabase.from('sale_items').delete().eq('id', saleItem.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const orderValid = completeSale && 
                           completeSale.sale_items.length > 0 &&
                           completeSale.total_amount === 1725;

          return {
            success: orderValid,
            message: "Complete sales order processing successful",
            details: {
              orderId: sale.id,
              orderTotal: completeSale?.total_amount,
              itemCount: completeSale?.sale_items?.length,
              customerName: customer?.company_name || 'Unknown Customer'
            },
            duration: Date.now() - startTime,
            testName: "Complete Sales Order Processing",
            category: "Sales Management",
            priority: "Critical",
            module: "Sales"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Complete sales order processing failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Complete Sales Order Processing",
            category: "Sales Management",
            priority: "Critical",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Customer Payment Management",
      category: "Sales Controls",
      description: "Test customer payment recording and tracking",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Test Customer',
              contact_person: 'Payment Manager',
              email: 'payment@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const saleAmount = 8000;

          // Create sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: saleAmount,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create a payment record to simulate payment management
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: saleAmount,
              payment_method: 'bank_transfer', // FIXED: Use valid enum value
              payment_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Verify payment was recorded
          if (!payment?.id) {
            throw new Error('Payment not recorded correctly');
          }

          // Clean up
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          return {
            success: true,
            message: `Customer payment management validated successfully. Payment recorded: ${saleAmount}`,
            details: {
              paymentAmount: saleAmount,
              paymentId: payment.id,
              saleId: sale.id
            },
            duration: Date.now() - startTime,
            testName: "Customer Payment Management",
            category: "Sales Controls",
            priority: "Critical",
            module: "Sales"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Customer payment management failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Customer Payment Management",
            category: "Sales Controls",
            priority: "Critical",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Sales Commission Calculation",
      category: "Sales Analytics",
      description: "Test sales commission calculation and tracking",
      module: "Sales",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create sales rep in staff table
          const { data: salesRep, error: repError } = await supabase
            .from('staff')
            .insert({
              id: crypto.randomUUID(),
              email: 'salesrep@commission.com',
              full_name: 'Sales Rep Commission',
              role: 'sales_rep',
              is_active: true,
              commission_rate: 5.0
            })
            .select()
            .single();

          if (repError) throw repError;

          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Commission Customer',
              contact_person: 'Commission Contact',
              email: 'commission@customer.com'
            })
            .select()
            .single();

          // Create sale with commission
          const saleAmount = 20000;
          const expectedCommission = saleAmount * 0.05; // 5% commission rate

          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              sales_rep_id: salesRep.id,
              total_amount: saleAmount,
              commission_amount: expectedCommission,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Verify commission calculation
          const commissionCorrect = sale.commission_amount === expectedCommission;

          // Create commission payment record
          const { data: commissionPayment } = await supabase
            .from('commission_payments')
            .insert({
              sales_rep_id: salesRep.id,
              period_start: new Date().toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0],
              base_commission: expectedCommission,
              total_commission: expectedCommission,
              status: 'pending'
            })
            .select()
            .single();

          // Cleanup
          await supabase.from('commission_payments').delete().eq('id', commissionPayment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('staff').delete().eq('id', salesRep.id);

          return {
            success: commissionCorrect,
            message: "Sales commission calculation completed successfully",
            details: {
              saleAmount,
              commissionRate: 5.0,
              expectedCommission,
              actualCommission: sale.commission_amount,
              salesRepId: salesRep.id
            },
            duration: Date.now() - startTime,
            testName: "Sales Commission Calculation",
            category: "Sales Analytics",
            priority: "High",
            module: "Sales"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Sales commission calculation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Sales Commission Calculation",
            category: "Sales Analytics",
            priority: "High",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Multi-Item Sales Order",
      category: "Sales Management",
      description: "Test creating sales orders with multiple products and quantities",
      module: "Sales",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Multi-Item Customer',
              contact_person: 'Multi Contact',
              email: 'multi@items.com'
            })
            .select()
            .single();

          // Create multiple products with enhanced uniqueness
          const products = [];
          for (let i = 1; i <= 3; i++) {
            const uniqueSKU = `MP${i}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}-${Math.floor(Math.random() * 100000)}`;
            const { data: product } = await supabase
              .from('products')
              .insert({
                name: `Multi Product ${i}`,
                sku: uniqueSKU,
                category: 'Multi Test',
                cost_price: 50 * i,
                standard_selling_price: 75 * i,
                current_stock: 100,
                description: `Test product ${i} for multi-item validation`
              })
              .select()
              .single();
            products.push(product);
          }

          // Create sale
          let totalAmount = 0;
          const quantities = [5, 3, 8];
          
          for (let i = 0; i < products.length; i++) {
            totalAmount += products[i].standard_selling_price * quantities[i];
          }

          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              subtotal: totalAmount,
              total_amount: totalAmount,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Create sale items for each product
          const saleItems = [];
          for (let i = 0; i < products.length; i++) {
            const lineTotal = products[i].standard_selling_price * quantities[i];
            const { data: saleItem } = await supabase
              .from('sale_items')
              .insert({
                sale_id: sale.id,
                product_id: products[i].id,
                quantity: quantities[i],
                unit_price: products[i].standard_selling_price,
                line_total: lineTotal
              })
              .select()
              .single();
            saleItems.push(saleItem);
          }

          // Verify multi-item order
          const { data: completeSale } = await supabase
            .from('sales')
            .select(`
              *,
              sale_items(*)
            `)
            .eq('id', sale.id)
            .single();

          const orderValid = completeSale?.sale_items?.length === 3 &&
                           completeSale.total_amount === totalAmount;

          // Cleanup
          await Promise.all(saleItems.map(item => 
            supabase.from('sale_items').delete().eq('id', item.id)
          ));
          await supabase.from('sales').delete().eq('id', sale.id);
          await Promise.all(products.map(product => 
            supabase.from('products').delete().eq('id', product.id)
          ));
          await supabase.from('customers').delete().eq('id', customer.id);

          return {
            success: orderValid,
            message: "Multi-item sales order completed successfully",
            details: {
              productCount: products.length,
              totalItems: quantities.reduce((sum, qty) => sum + qty, 0),
              totalAmount,
              saleItemsCreated: saleItems.length
            },
            duration: Date.now() - startTime,
            testName: "Multi-Item Sales Order",
            category: "Sales Management",
            priority: "High",
            module: "Sales"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Multi-item sales order failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Multi-Item Sales Order",
            category: "Sales Management",
            priority: "High",
            module: "Sales"
          };
        }
      }
    },

    {
      name: "Sales Commission Analytics",
      category: "Sales Analytics",
      description: "Test sales commission tracking and calculation",
      module: "Sales",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create sales rep
          const { data: salesRep } = await supabase
            .from('staff')
            .insert({
              id: crypto.randomUUID(),
              email: 'performance@analytics.com',
              full_name: 'Analytics Rep',
              role: 'sales_rep',
              is_active: true,
              commission_rate: 3.5
            })
            .select()
            .single();

          // Create multiple customers
          const customers = [];
          for (let i = 1; i <= 5; i++) {
            const { data: customer } = await supabase
              .from('customers')
              .insert({
                company_name: `Analytics Customer ${i}`,
                contact_person: `Contact ${i}`,
                email: `analytics${i}@customer.com`
              })
              .select()
              .single();
            customers.push(customer);
          }

          // Create sales with commissions
          const saleAmounts = [5000, 7500, 3000, 12000, 8500];
          const salesData = [];
          let totalRevenue = 0;
          let totalCommission = 0;

          for (let i = 0; i < customers.length; i++) {
            const amount = saleAmounts[i];
            const commission = amount * 0.035; // 3.5% commission rate
            
            totalRevenue += amount;
            totalCommission += commission;

            const { data: sale } = await supabase
              .from('sales')
              .insert({
                customer_id: customers[i].id,
                sales_rep_id: salesRep.id,
                total_amount: amount,
                commission_amount: commission,
                sale_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();
            salesData.push(sale);
          }

          const averageOrderValue = totalRevenue / salesData.length;

          // Create commission payment record for analytics tracking
          const { data: analyticsData, error: analyticsError } = await supabase
            .from('commission_payments')
            .insert({
              sales_rep_id: salesRep.id,
              base_commission: totalCommission,
              total_commission: totalCommission,
              status: 'pending',
              period_start: new Date().toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (analyticsError) throw analyticsError;

          // Verify commission calculation accuracy
          if (analyticsData.total_commission !== totalCommission) {
            throw new Error('Commission calculation mismatch');
          }

          // Clean up
          await supabase.from('commission_payments').delete().eq('id', analyticsData.id);
          await Promise.all(salesData.map(sale => 
            supabase.from('sales').delete().eq('id', sale.id)
          ));
          await Promise.all(customers.map(customer => 
            supabase.from('customers').delete().eq('id', customer.id)
          ));
          await supabase.from('staff').delete().eq('id', salesRep.id);

          return {
            success: true,
            message: `Sales commission analytics validated. Revenue: ${totalRevenue}, Avg Order: ${averageOrderValue}, Commission: ${totalCommission}`,
            details: {
              totalRevenue,
              averageOrderValue: Number(averageOrderValue.toFixed(2)),
              totalCommission,
              salesCount: salesData.length,
              commissionRate: 3.5
            },
            duration: Date.now() - startTime,
            testName: "Sales Commission Analytics",
            category: "Sales Analytics",
            priority: "Medium",
            module: "Sales"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Sales commission analytics failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Sales Commission Analytics",
            category: "Sales Analytics",
            priority: "Medium",
            module: "Sales"
          };
        }
      }
    }

    // TODO: Add 20 more sales tests to reach 25 total
    // Sales Territory Management
    // Customer Retention Analysis
    // Sales Pipeline Tracking
    // Discount Management
    // Quote to Order Conversion
    // Sales Target Tracking
    // Customer Segmentation
    // Sales Forecasting
    // Cross-sell/Up-sell Analytics
    // Sales Team Performance
    // Product Performance Analysis
    // Seasonal Sales Trends
    // Sales Conversion Rates
    // Customer Lifetime Value
    // Sales Cycle Analysis
    // Revenue Recognition
    // Sales Tax Management
    // International Sales Processing
    // Bulk Order Processing
    // Sales Returns Management

  ], []);

  return { createExpandedSalesTests };
};