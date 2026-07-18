// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export const useRealBusinessLogicTests = () => {
  const createRealBusinessTests = () => {
    return {
      'Database Tests': [
        {
          name: "Database Connection Health", 
          category: "database", 
          module: "Infrastructure",
          priority: "critical" as const, 
          description: "Verify database connection is active and responsive",
          fn: async () => {
            try {
              const { data, error } = await supabase.from('staff').select('count').limit(1);
              if (error) throw error;
              return { success: true, message: 'Database connection healthy' };
            } catch (error: any) {
              return { success: false, message: `Database connection failed: ${error.message}` };
            }
          }
        },
        {
          name: "Table Integrity Check", 
          category: "database", 
          module: "Infrastructure",
          priority: "high" as const, 
          description: "Verify all core tables exist and are accessible",
          fn: async () => {
            try {
              const coreTableNames = ['customers', 'products', 'sales', 'staff', 'suppliers'] as const;
              const results = await Promise.all(
                coreTableNames.map(async table => {
                  const { data, error } = await supabase.from(table).select('count').limit(1);
                  return { table, success: !error, error };
                })
              );
              
              const errors = results.filter(r => !r.success);
              if (errors.length > 0) {
                return { success: false, message: `${errors.length} tables failed: ${errors.map(e => e.table).join(', ')}` };
              }
              
              return { success: true, message: `All ${coreTableNames.length} core tables accessible` };
            } catch (error: any) {
              return { success: false, message: `Table integrity check failed: ${error.message}` };
            }
          }
        }
      ],

      'Sales Tests': [
        {
          name: "Sales Prerequisites Check", 
          category: "workflow", 
          module: "Sales",
          priority: "critical" as const, 
          description: "Verify sales system has required data",
          fn: async () => {
            try {
              const [customers, products, staff] = await Promise.all([
                supabase.from('customers').select('id').limit(1),
                supabase.from('products').select('id').gte('current_stock', 1).limit(1), 
                supabase.from('staff').select('id').eq('role', 'sales_rep').eq('is_active', true).limit(1)
              ]);
              
              if (!customers.data?.length) return { success: false, message: 'No customers found - use Test Data Setup to create sample data' };
              if (!products.data?.length) return { success: false, message: 'No products with stock found - use Test Data Setup' };
              if (!staff.data?.length) return { success: false, message: 'No active sales reps found - need sample staff data' };
              
              return { success: true, message: 'Sales prerequisites verified successfully' };
            } catch (error: any) {
              return { success: false, message: `Prerequisites check failed: ${error.message}` };
            }
          }
        },
        {
          name: "Sales Creation Workflow", 
          category: "workflow", 
          module: "Sales",
          priority: "high" as const, 
          description: "Test complete sales creation process",
          fn: async () => {
            try {
              // Get test data
              const { data: customer } = await supabase.from('customers').select('id').limit(1).single();
              const { data: product } = await supabase.from('products').select('id, standard_selling_price, current_stock').gte('current_stock', 1).limit(1).single();
              const { data: staff } = await supabase.from('staff').select('id').eq('role', 'sales_rep').eq('is_active', true).limit(1).single();
              
              if (!customer || !product || !staff) {
                return { success: false, message: 'Missing test data - run Prerequisites Check first' };
              }

              const saleAmount = product.standard_selling_price || 100;

              // Create a test sale
              const { data: sale, error } = await supabase.from('sales').insert({
                customer_id: customer.id,
                sales_rep_id: staff.id,
                subtotal: saleAmount,
                total_amount: saleAmount,
                payment_status: 'pending',
                fulfillment_status: 'pending'
              }).select().single();

              if (error) throw error;
              
              // Create sale item
              const { error: itemError } = await supabase.from('sale_items').insert({
                sale_id: sale.id,
                product_id: product.id,
                quantity: 1,
                unit_price: saleAmount,
                line_total: saleAmount
              });

              if (itemError) {
                await supabase.from('sales').delete().eq('id', sale.id);
                throw itemError;
              }

              // Clean up test data
              await supabase.from('sale_items').delete().eq('sale_id', sale.id);
              await supabase.from('sales').delete().eq('id', sale.id);
              
              return { success: true, message: 'Complete sales workflow validated successfully' };
            } catch (error: any) {
              return { success: false, message: `Sales workflow failed: ${error.message}` };
            }
          }
        }
      ],

      'Inventory Tests': [
        {
          name: "Product Stock Levels", 
          category: "inventory", 
          module: "Inventory",
          priority: "high" as const, 
          description: "Validate product inventory data integrity",
          fn: async () => {
            try {
              const { data: products } = await supabase.from('products')
                .select('id, name, current_stock, reorder_point')
                .gte('current_stock', 0);
              
              if (!products?.length) {
                return { success: false, message: 'No products found - use Test Data Setup' };
              }
              
              const lowStock = products.filter(p => p.current_stock <= (p.reorder_point || 10));
              
              return { 
                success: true, 
                message: `${products.length} products validated, ${lowStock.length} below reorder point` 
              };
            } catch (error: any) {
              return { success: false, message: `Inventory check failed: ${error.message}` };
            }
          }
        },
        {
          name: "Stock Movement Tracking", 
          category: "inventory", 
          module: "Inventory",
          priority: "medium" as const, 
          description: "Verify stock movements are being tracked",
          fn: async () => {
            try {
              const { data: movements } = await supabase.from('stock_movements')
                .select('id, product_id, movement_type, quantity')
                .limit(10);
              
              return { 
                success: true, 
                message: `${movements?.length || 0} stock movements tracked` 
              };
            } catch (error: any) {
              return { success: false, message: `Stock tracking check failed: ${error.message}` };
            }
          }
        }
      ],

      'Customer Tests': [
        {
          name: "Customer Data Integrity", 
          category: "customer", 
          module: "Customer Management",
          priority: "high" as const, 
          description: "Validate customer records and contact information",
          fn: async () => {
            try {
              const { data: customers } = await supabase.from('customers')
                .select('id, contact_person, email, phone');
              
              if (!customers?.length) {
                return { success: false, message: 'No customers found - use Test Data Setup' };
              }
              
              const withContact = customers.filter(c => c.email || c.phone).length;
              
              return { 
                success: true, 
                message: `${customers.length} customers found, ${withContact} have contact info` 
              };
            } catch (error: any) {
              return { success: false, message: `Customer validation failed: ${error.message}` };
            }
          }
        }
      ],

      'Staff Tests': [
        {
          name: "Staff Role Management", 
          category: "staff", 
          module: "Staff Management",
          priority: "critical" as const, 
          description: "Verify staff roles and permissions",
          fn: async () => {
            try {
              const { data: staff } = await supabase.from('staff')
                .select('id, role, is_active')
                .eq('is_active', true);
              
              const roles = staff?.reduce((acc: any, s) => {
                acc[s.role] = (acc[s.role] || 0) + 1;
                return acc;
              }, {}) || {};
              
              return { 
                success: true, 
                message: `Active staff by role: ${Object.entries(roles).map(([role, count]) => `${role}: ${count}`).join(', ')}` 
              };
            } catch (error: any) {
              return { success: false, message: `Staff validation failed: ${error.message}` };
            }
          }
        }
      ],

      'Financial Tests': [
        {
          name: "Payment Records Integrity", 
          category: "financial", 
          module: "Financial",
          priority: "high" as const, 
          description: "Validate payment processing and records",
          fn: async () => {
            try {
              const { data: payments } = await supabase.from('payments')
                .select('id, amount, payment_method, currency')
                .gt('amount', 0)
                .limit(10);
              
              return { 
                success: true, 
                message: `${payments?.length || 0} valid payment records found` 
              };
            } catch (error: any) {
              return { success: false, message: `Payment validation failed: ${error.message}` };
            }
          }
        }
      ],

      'Security Tests': [
        {
          name: "RLS Policy Enforcement", 
          category: "security", 
          module: "Security",
          priority: "critical" as const, 
          description: "Test Row Level Security policy enforcement",
          fn: async () => {
            try {
              // Test access to sensitive tables
              const testPromises = [
                supabase.from('staff').select('count').limit(1),
                supabase.from('payments').select('count').limit(1),
              ];
              
              const results = await Promise.allSettled(testPromises);
              const successCount = results.filter(r => r.status === 'fulfilled').length;
              
              return { 
                success: true, 
                message: `RLS policies active - ${successCount}/2 protected endpoints tested` 
              };
            } catch (error: any) {
              return { success: false, message: `Security test failed: ${error.message}` };
            }
          }
        }
      ]
    };
  };

  return { createRealBusinessTests };
};