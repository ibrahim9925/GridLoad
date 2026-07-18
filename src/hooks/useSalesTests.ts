// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';

export const useSalesTests = () => {
  const createSalesTests = useCallback((): BusinessTest[] => [
    {
      name: "Complete Sales Cycle Workflow",
      category: "Workflow",
      description: "Test full sales process from lead to payment",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Step 1: Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Sales Cycle Customer',
              contact_person: 'John Doe',
              email: 'salescycle@test.com',
              phone: '+1234567890'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Step 2: Create product
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Sales Test Product',
              sku: 'SALES-TEST-001',
              standard_selling_price: 500,
              cost_price: 400,
              current_stock: 10
            })
            .select()
            .single();

          if (productError) throw productError;

          // Step 3: Create sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 1000,
              status: 'confirmed',
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Step 4: Create sale items
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: 2,
              unit_price: 500,
              line_total: 1000
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Step 5: Create payment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: 1000,
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'cash'
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Step 6: Verify complete workflow
          const { data: completeSale, error: verifyError } = await supabase
            .from('sales')
            .select(`
              *,
              customers(*),
              sale_items(*, products(*)),
              payments(*)
            `)
            .eq('id', sale.id)
            .single();

          if (verifyError) throw verifyError;

          // Cleanup
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sale_items').delete().eq('id', saleItem.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const isComplete = completeSale.customers && 
                           completeSale.sale_items?.length > 0 && 
                           completeSale.payments?.length > 0;

          return {
            success: isComplete,
            message: "Complete sales cycle workflow executed successfully",
            duration: Date.now() - startTime,
            details: {
              saleId: sale.id,
              customerId: customer.id,
              productId: product.id,
              paymentId: payment.id,
              saleItemsCount: completeSale.sale_items?.length || 0,
              paymentsCount: completeSale.payments?.length || 0
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Sales cycle workflow failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Sales Commission Calculation",
      category: "Business Logic", 
      description: "Test automatic commission calculation for sales",
      module: "Sales",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Use enhanced test prerequisites for proper data setup
          const { TestDatabaseUtils } = await import('@/utils/testDatabaseUtils');
          const prerequisites = await TestDatabaseUtils.createTestPrerequisites();
          const { staff, customer } = prerequisites;

          // Verify staff has commission rate
          if (!staff.commission_rate || staff.commission_rate <= 0) {
            throw new Error('Staff member missing commission rate');
          }

          // Create sale with commission calculation
          const saleAmount = 10000;
          const expectedCommission = saleAmount * (staff.commission_rate / 100); // Convert percentage

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              sales_rep_id: staff.id,
              total_amount: saleAmount,
              subtotal: saleAmount,
              payment_status: 'pending',
              fulfillment_status: 'pending',
              commission_amount: expectedCommission,
              sale_date: new Date().toISOString().split('T')[0],
              invoice_number: TestDatabaseUtils.generateUniqueId('INV')
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Verify commission calculation accuracy
          const calculatedCommission = sale.commission_amount;
          const isCorrect = Math.abs(calculatedCommission - expectedCommission) < 0.01;

          // Cleanup test data
          await TestDatabaseUtils.cleanupTestData();

          return {
            success: isCorrect,
            message: isCorrect 
              ? `Commission calculation working correctly: $${calculatedCommission.toFixed(2)} (${staff.commission_rate}%)`
              : `Commission mismatch: expected $${expectedCommission.toFixed(2)}, got $${calculatedCommission.toFixed(2)}`,
            duration: Date.now() - startTime,
            details: {
              saleAmount,
              expectedCommission: expectedCommission.toFixed(2),
              calculatedCommission: calculatedCommission.toFixed(2),
              commissionRate: staff.commission_rate,
              staffId: staff.id,
              saleId: sale.id
            }
          };
        } catch (error: any) {
          const { TestErrorHandler } = await import('@/utils/testErrorHandler');
          TestErrorHandler.handleTestError(error, 'Sales Commission Calculation');
          return {
            success: false,
            message: `Commission calculation test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Sales Inventory Integration",
      category: "Integration",
      description: "Test stock reduction when sales are confirmed",
      module: "Sales",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create product with initial stock
          const initialStock = 20;
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Stock Test Product',
              sku: 'STOCK-TEST-001',
              standard_selling_price: 100,
              cost_price: 80,
              current_stock: initialStock
            })
            .select()
            .single();

          if (productError) throw productError;

          // Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Stock Test Customer',
              contact_person: 'Bob Johnson',
              email: 'stock@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create sale
          const saleQuantity = 5;
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 500,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create sale item
          const { data: saleItem, error: itemError } = await supabase
            .from('sale_items')
            .insert({
              sale_id: sale.id,
              product_id: product.id,
              quantity: saleQuantity,
              unit_price: 100,
              line_total: 500
            })
            .select()
            .single();

          if (itemError) throw itemError;

          // Create stock movement for the sale
          const { data: stockMovement, error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: product.id,
              movement_type: 'out',
              quantity: saleQuantity,
              reference_id: sale.id,
              reference_type: 'sale'
            })
            .select()
            .single();

          if (movementError) throw movementError;

          // Update product stock
          const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update({ current_stock: initialStock - saleQuantity })
            .eq('id', product.id)
            .select()
            .single();

          if (updateError) throw updateError;

          const expectedStock = initialStock - saleQuantity;
          const actualStock = updatedProduct.current_stock;
          const stockCorrect = actualStock === expectedStock;

          // Cleanup
          await supabase.from('stock_movements').delete().eq('id', stockMovement.id);
          await supabase.from('sale_items').delete().eq('id', saleItem.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          return {
            success: stockCorrect,
            message: stockCorrect 
              ? "Sales inventory integration working correctly"
              : `Stock mismatch: expected ${expectedStock}, got ${actualStock}`,
            duration: Date.now() - startTime,
            details: {
              initialStock,
              saleQuantity,
              expectedStock,
              actualStock,
              stockMovementId: stockMovement.id
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Sales inventory integration test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Sales Payment Tracking",
      category: "Financial",
      description: "Test payment tracking and outstanding balance calculation",
      module: "Sales",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Tracking Customer',
              contact_person: 'Alice Brown',
              email: 'payment@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create sale
          const totalAmount = 5000;
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: totalAmount,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create partial payments
          const payment1Amount = 2000;
          const payment2Amount = 1500; // Still owes 1500

          const { data: payment1, error: payment1Error } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: payment1Amount,
              payment_method: 'cash'
            })
            .select()
            .single();

          if (payment1Error) throw payment1Error;

          const { data: payment2, error: payment2Error } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: payment2Amount,
              payment_method: 'bank_transfer'
            })
            .select()
            .single();

          if (payment2Error) throw payment2Error;

          // Calculate outstanding balance
          const { data: saleWithPayments, error: calculateError } = await supabase
            .from('sales')
            .select(`
              *,
              payments(amount)
            `)
            .eq('id', sale.id)
            .single();

          if (calculateError) throw calculateError;

          const totalPaid = saleWithPayments.payments.reduce(
            (sum: number, payment: any) => sum + payment.amount, 
            0
          );
          const outstandingBalance = totalAmount - totalPaid;
          const expectedBalance = 1500;

          // Cleanup
          await supabase.from('payments').delete().eq('sale_id', sale.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const balanceCorrect = Math.abs(outstandingBalance - expectedBalance) < 0.01;

          return {
            success: balanceCorrect,
            message: balanceCorrect 
              ? "Payment tracking and balance calculation working correctly"
              : `Balance mismatch: expected ${expectedBalance}, calculated ${outstandingBalance}`,
            duration: Date.now() - startTime,
            details: {
              totalAmount,
              totalPaid,
              outstandingBalance,
              expectedBalance,
              paymentsCount: saleWithPayments.payments.length
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Payment tracking test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Sales Performance Analytics",
      category: "Analytics",
      description: "Test sales performance metrics and reporting",
      module: "Sales",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test sales for analytics
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Analytics Customer',
              contact_person: 'Charlie Davis',
              email: 'analytics@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create multiple sales for different dates
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);

          const salesData = [
            { amount: 1000, date: today.toISOString().split('T')[0] },
            { amount: 1500, date: yesterday.toISOString().split('T')[0] },
            { amount: 2000, date: lastWeek.toISOString().split('T')[0] }
          ];

          const createdSales = [];
          for (const saleData of salesData) {
            const { data: sale, error: saleError } = await supabase
              .from('sales')
              .insert({
                customer_id: customer.id,
                total_amount: saleData.amount,
                sale_date: saleData.date,
                status: 'confirmed'
              })
              .select()
              .single();

            if (saleError) throw saleError;
            createdSales.push(sale);
          }

          // Test analytics queries
          // Total sales
          const { data: totalSales, error: totalError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('customer_id', customer.id);

          if (totalError) throw totalError;

          // Sales this week
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const { data: weekSales, error: weekError } = await supabase
            .from('sales')
            .select('total_amount')
            .eq('customer_id', customer.id)
            .gte('sale_date', weekAgo.toISOString().split('T')[0]);

          if (weekError) throw weekError;

          // Calculate metrics
          const totalRevenue = totalSales.reduce((sum, sale) => sum + sale.total_amount, 0);
          const weekRevenue = weekSales.reduce((sum, sale) => sum + sale.total_amount, 0);
          const expectedTotal = 4500; // 1000 + 1500 + 2000
          const expectedWeek = 2500; // 1000 + 1500 (today + yesterday)

          // Cleanup
          await Promise.all(
            createdSales.map(sale => 
              supabase.from('sales').delete().eq('id', sale.id)
            )
          );
          await supabase.from('customers').delete().eq('id', customer.id);

          const totalCorrect = Math.abs(totalRevenue - expectedTotal) < 0.01;
          const weekCorrect = Math.abs(weekRevenue - expectedWeek) < 0.01;

          return {
            success: totalCorrect && weekCorrect,
            message: "Sales analytics calculations completed",
            duration: Date.now() - startTime,
            details: {
              totalRevenue,
              weekRevenue,
              expectedTotal,
              expectedWeek,
              salesCount: createdSales.length,
              analyticsAccurate: totalCorrect && weekCorrect
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Sales analytics test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    }
  ], []);

  return { createSalesTests };
};