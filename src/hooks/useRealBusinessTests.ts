// @ts-nocheck
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
  duration?: number;
}

interface BusinessTest {
  name: string;
  category: string;
  description: string;
  module: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fn: () => Promise<TestResult>;
}

export const useRealBusinessTests = () => {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  // ===== CRITICAL INFRASTRUCTURE TESTS =====
  const createCriticalTests = (): BusinessTest[] => [
    {
      name: "Database Connection",
      category: "infrastructure", 
      module: "Core",
      priority: "critical",
      description: "Verify database connectivity and basic queries work",
      fn: async () => {
        const start = Date.now();
        try {
          const { data, error } = await supabase.from('products').select('count').limit(1);
          const duration = Date.now() - start;
          return { 
            success: !error, 
            message: error ? `DB Error: ${error.message}` : 'Database connected successfully',
            duration
          };
        } catch (error: any) {
          return { success: false, message: `Connection failed: ${error.message}` };
        }
      }
    },
    {
      name: "Authentication Status",
      category: "auth",
      module: "Security", 
      priority: "critical",
      description: "Verify user authentication is working",
      fn: async () => {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          return { 
            success: !!user && !error, 
            message: user ? `Authenticated as: ${user.email}` : 'Not authenticated',
            details: { userId: user?.id, email: user?.email }
          };
        } catch (error: any) {
          return { success: false, message: `Auth error: ${error.message}` };
        }
      }
    }
  ];

  // ===== PRODUCT MANAGEMENT TESTS =====
  const createProductTests = (): BusinessTest[] => [
    {
      name: "Product Creation Test",
      category: "products",
      module: "Product Management",
      priority: "critical", 
      description: "Test creating a new product with all required fields",
      fn: async () => {
        const testProduct = {
          name: `TEST_PRODUCT_${Date.now()}`,
          category: "Solar Panels",
          sku: `TEST-${Date.now()}`,
          cost_price: 100,
          standard_selling_price: 150,
          current_stock: 10,
          status: "Active",
          is_active: true
        };

        try {
          const { data, error } = await supabase
            .from('products')
            .insert(testProduct)
            .select()
            .single();

          if (error) throw error;

          // Clean up test data
          await supabase.from('products').delete().eq('id', data.id);

          return { 
            success: true, 
            message: `Product created successfully: ${data.name}`,
            details: { productId: data.id, name: data.name }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Product creation failed: ${error.message}`,
            errors: [error.message]
          };
        }
      }
    },
    {
      name: "Product Deletion Test",
      category: "products", 
      module: "Product Management",
      priority: "high",
      description: "Test product deletion handles constraints properly",
      fn: async () => {
        // First create a test product
        const testProduct = {
          name: `DELETE_TEST_${Date.now()}`,
          category: "Test Category",
          cost_price: 50,
          standard_selling_price: 75,
          current_stock: 5,
          is_active: true
        };

        try {
          const { data: product, error: createError } = await supabase
            .from('products')
            .insert(testProduct)
            .select()
            .single();

          if (createError) throw createError;

          // Now test deletion
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', product.id);

          return { 
            success: !deleteError, 
            message: deleteError ? `Delete failed: ${deleteError.message}` : 'Product deletion working',
            details: { productId: product.id }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Deletion test failed: ${error.message}`,
            errors: [error.message]
          };
        }
      }
    },
    {
      name: "Product Stock Validation",
      category: "inventory",
      module: "Product Management", 
      priority: "high",
      description: "Verify products have valid stock levels and pricing",
      fn: async () => {
        try {
          const { data: products, error } = await supabase
            .from('products')
            .select('id, name, current_stock, cost_price, standard_selling_price')
            .eq('is_active', true)
            .limit(10);

          if (error) throw error;

          if (!products || products.length === 0) {
            return { 
              success: false, 
              message: 'No active products found - cannot test stock validation'
            };
          }

          const issues = [];
          let validProducts = 0;

          for (const product of products) {
            if (product.current_stock < 0) {
              issues.push(`${product.name}: Negative stock (${product.current_stock})`);
            }
            if ((product.cost_price || 0) <= 0) {
              issues.push(`${product.name}: Invalid cost price (${product.cost_price})`);
            }
            if ((product.standard_selling_price || 0) <= (product.cost_price || 0)) {
              issues.push(`${product.name}: Selling price not higher than cost`);
            }
            if (issues.length === 0) validProducts++;
          }

          return {
            success: issues.length === 0,
            message: issues.length === 0 
              ? `All ${validProducts} products have valid data`
              : `Found ${issues.length} product data issues`,
            details: { validProducts, totalChecked: products.length, issues }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Stock validation failed: ${error.message}`
          };
        }
      }
    }
  ];

  // ===== CUSTOMER MANAGEMENT TESTS =====
  const createCustomerTests = (): BusinessTest[] => [
    {
      name: "Customer Creation Test",
      category: "customers",
      module: "Customer Management",
      priority: "critical",
      description: "Test creating new customer records",
      fn: async () => {
        const testCustomer = {
          company_name: `TEST_CUSTOMER_${Date.now()}`,
          contact_person: "Test Person",
          email: `test${Date.now()}@example.com`,
          phone: "+1234567890",
          address: "123 Test Street"
        };

        try {
          const { data, error } = await supabase
            .from('customers')
            .insert(testCustomer)
            .select()
            .single();

          if (error) throw error;

          // Clean up
          await supabase.from('customers').delete().eq('id', data.id);

          return { 
            success: true, 
            message: `Customer created successfully: ${data.company_name}`,
            details: { customerId: data.id }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Customer creation failed: ${error.message}`,
            errors: [error.message]
          };
        }
      }
    },
    {
      name: "Customer Data Integrity", 
      category: "customers",
      module: "Customer Management",
      priority: "high",
      description: "Verify customer records have complete contact information",
      fn: async () => {
        try {
          const { data: customers, error } = await supabase
            .from('customers')
            .select('id, company_name, contact_person, email, phone')
            .limit(20);

          if (error) throw error;

          if (!customers || customers.length === 0) {
            return { success: false, message: 'No customers found to validate' };
          }

          const incomplete = customers.filter(c => 
            !c.contact_person || (!c.email && !c.phone)
          );

          const completionRate = ((customers.length - incomplete.length) / customers.length) * 100;

          return {
            success: completionRate >= 80, // 80% completion threshold
            message: `Customer data ${completionRate.toFixed(1)}% complete (${customers.length - incomplete.length}/${customers.length})`,
            details: { 
              total: customers.length, 
              complete: customers.length - incomplete.length,
              completionRate,
              incompleteCustomers: incomplete.map(c => c.company_name)
            }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Customer validation failed: ${error.message}`
          };
        }
      }
    }
  ];

  // ===== STAFF MANAGEMENT TESTS =====
  const createStaffTests = (): BusinessTest[] => [
    {
      name: "Staff Authentication Test",
      category: "staff",
      module: "Staff Management", 
      priority: "critical",
      description: "Verify staff records and role assignments",
      fn: async () => {
        try {
          const { data: staff, error } = await supabase
            .from('staff')
            .select('id, full_name, email, role, is_active')
            .eq('is_active', true);

          if (error) throw error;

          if (!staff || staff.length === 0) {
            return { 
              success: false, 
              message: 'No active staff found - staff management not working'
            };
          }

          const adminCount = staff.filter(s => s.role === 'admin').length;
          const salesRepCount = staff.filter(s => s.role === 'sales_rep').length;

          return {
            success: adminCount > 0,
            message: `Found ${staff.length} active staff (${adminCount} admin, ${salesRepCount} sales)`,
            details: { 
              totalStaff: staff.length, 
              admins: adminCount,
              salesReps: salesRepCount,
              roles: staff.map(s => s.role)
            }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Staff validation failed: ${error.message}`
          };
        }
      }
    },
    {
      name: "Commission Settings Test",
      category: "financial",
      module: "Staff Management",
      priority: "high", 
      description: "Verify sales reps have commission rates configured",
      fn: async () => {
        try {
          const { data: salesReps, error } = await supabase
            .from('staff')
            .select('id, full_name, commission_rate')
            .eq('role', 'sales_rep')
            .eq('is_active', true);

          if (error) throw error;

          if (!salesReps || salesReps.length === 0) {
            return { success: false, message: 'No active sales representatives found' };
          }

          const withCommission = salesReps.filter(rep => 
            rep.commission_rate && rep.commission_rate > 0
          );

          const configurationRate = (withCommission.length / salesReps.length) * 100;

          return {
            success: configurationRate >= 80,
            message: `Commission rates: ${configurationRate.toFixed(1)}% configured (${withCommission.length}/${salesReps.length})`,
            details: {
              totalReps: salesReps.length,
              configured: withCommission.length,
              configurationRate,
              repsWithoutCommission: salesReps.filter(r => !r.commission_rate).map(r => r.full_name)
            }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Commission test failed: ${error.message}`
          };
        }
      }
    }
  ];

  // ===== SALES WORKFLOW TESTS =====
  const createSalesTests = (): BusinessTest[] => [
    {
      name: "Sales Prerequisites Test",
      category: "sales",
      module: "Sales Management",
      priority: "critical",
      description: "Verify all prerequisites for creating sales exist",
      fn: async () => {
        try {
          const [customersResult, productsResult, staffResult] = await Promise.all([
            supabase.from('customers').select('id').limit(1),
            supabase.from('products').select('id').gt('current_stock', 0).eq('is_active', true).limit(1),
            supabase.from('staff').select('id').eq('role', 'sales_rep').eq('is_active', true).limit(1)
          ]);

          const issues = [];
          if (customersResult.error) issues.push(`Customers: ${customersResult.error.message}`);
          if (productsResult.error) issues.push(`Products: ${productsResult.error.message}`);
          if (staffResult.error) issues.push(`Staff: ${staffResult.error.message}`);

          if (!customersResult.data?.length) issues.push('No customers available');
          if (!productsResult.data?.length) issues.push('No products with stock available');
          if (!staffResult.data?.length) issues.push('No active sales representatives');

          return {
            success: issues.length === 0,
            message: issues.length === 0 
              ? 'All sales prerequisites available' 
              : `Missing sales prerequisites: ${issues.join(', ')}`,
            details: {
              customers: customersResult.data?.length || 0,
              productsWithStock: productsResult.data?.length || 0,
              salesReps: staffResult.data?.length || 0,
              issues
            }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Sales prerequisites check failed: ${error.message}`
          };
        }
      }
    }
  ];

  // ===== PAYMENT SYSTEM TESTS =====
  const createPaymentTests = (): BusinessTest[] => [
    {
      name: "Payment Recording Test",
      category: "financial",
      module: "Payment Management",
      priority: "critical",
      description: "Test payment recording and status updates",
      fn: async () => {
        try {
          // Check if we have sales with balance due
          const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select('id, total_amount, balance_due, payment_status')
            .gt('balance_due', 0)
            .limit(1);

          if (salesError) throw salesError;

          if (!sales || sales.length === 0) {
            return { 
              success: false, 
              message: 'No sales with outstanding balance found - cannot test payment recording'
            };
          }

          const testSale = sales[0];

          // Test creating a small test payment
          const testPayment = {
            sale_id: testSale.id,
            amount: 0.01, // Minimal test amount
            payment_method: 'cash',
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'TEST_PAYMENT_AUTO_GENERATED'
          };

          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert(testPayment)
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Clean up test payment
          await supabase.from('payments').delete().eq('id', payment.id);

          return {
            success: true,
            message: 'Payment recording system working correctly',
            details: { testSaleId: testSale.id, testAmount: 0.01 }
          };
        } catch (error: any) {
          return { 
            success: false, 
            message: `Payment test failed: ${error.message}`,
            errors: [error.message]
          };
        }
      }
    }
  ];

  // Combine all test suites
  const getAllTestSuites = useCallback(() => {
    return {
      'Critical Infrastructure': createCriticalTests(),
      'Product Management': createProductTests(),
      'Customer Management': createCustomerTests(), 
      'Staff Management': createStaffTests(),
      'Sales Workflows': createSalesTests(),
      'Payment Systems': createPaymentTests()
    };
  }, []);

  const runIndividualTest = useCallback(async (test: BusinessTest): Promise<TestResult> => {
    setIsRunning(true);
    const start = Date.now();
    
    try {
      const result = await test.fn();
      const duration = Date.now() - start;
      
      return {
        ...result,
        duration: result.duration || duration
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Test execution failed: ${error.message}`,
        errors: [error.message],
        duration: Date.now() - start
      };
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runTestSuite = useCallback(async (suiteName: string, tests: BusinessTest[]) => {
    setIsRunning(true);
    const results: Array<TestResult & { testName: string }> = [];
    
    try {
      for (const test of tests) {
        const result = await runIndividualTest(test);
        results.push({ ...result, testName: test.name });
      }
      
      const passed = results.filter(r => r.success).length;
      const failed = results.length - passed;
      
      toast({
        title: `${suiteName} Complete`,
        description: `${passed} passed, ${failed} failed`,
        variant: failed > 0 ? "destructive" : "default"
      });
      
      return results;
    } finally {
      setIsRunning(false);
    }
  }, [runIndividualTest, toast]);

  return {
    getAllTestSuites,
    runIndividualTest,
    runTestSuite,
    isRunning
  };
};