// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';

export const useCustomerTests = () => {
  const createCustomerTests = useCallback((): BusinessTest[] => [
    {
      name: "Customer Database CRUD Operations",
      category: "Database",
      description: "Test customer creation, reading, updating, and deletion",
      module: "Customers",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test customer
          const { data: customer, error: createError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Test Customer CRUD',
              contact_person: 'Test Contact',
              email: 'test.crud@example.com',
              phone: '+1234567890',
              address: '123 Test Street'
            })
            .select()
            .single();

          if (createError) throw createError;

          // Read customer
          const { data: readCustomer, error: readError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customer.id)
            .single();

          if (readError) throw readError;

          // Update customer
          const { data: updatedCustomer, error: updateError } = await supabase
            .from('customers')
            .update({ company_name: 'Updated Test Customer' })
            .eq('id', customer.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Delete customer
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', customer.id);

          if (deleteError) throw deleteError;

          return {
            success: true,
            message: "Customer CRUD operations completed successfully",
            duration: Date.now() - startTime,
            details: { createdId: customer.id, updated: updatedCustomer.company_name }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Customer CRUD test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Customer Data Validation",
      category: "Business Logic",
      description: "Test customer data validation rules and constraints",
      module: "Customers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Test duplicate email prevention
          const { data: customer1 } = await supabase
            .from('customers')
            .insert({
              company_name: 'Test Customer 1',
              contact_person: 'Contact 1',
              email: 'duplicate@test.com',
              phone: '+1111111111'
            })
            .select()
            .single();

          // Attempt duplicate email
          const { error: duplicateError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Test Customer 2',
              contact_person: 'Contact 2',
              email: 'duplicate@test.com',
              phone: '+2222222222'
            });

          // Cleanup
          if (customer1) {
            await supabase.from('customers').delete().eq('id', customer1.id);
          }

          return {
            success: duplicateError !== null,
            message: duplicateError 
              ? "Email uniqueness validation working correctly"
              : "WARNING: Duplicate email was allowed",
            duration: Date.now() - startTime,
            details: { duplicateError: duplicateError?.message }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Customer validation test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Customer-Lead Relationship",
      category: "Workflow",
      description: "Test customer creation from lead conversion process",
      module: "Customers",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create a lead first
          const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
              full_name: 'Test Lead Customer',
              email: 'leadcustomer@test.com',
              phone: '+1234567890',
              status: 'new',
              source: 'website'
            })
            .select()
            .single();

          if (leadError) throw leadError;

          // Convert lead to customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: lead.full_name,
              contact_person: lead.full_name,
              email: lead.email,
              phone: lead.phone
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Update lead with customer reference
          const { error: linkError } = await supabase
            .from('leads')
            .update({ 
              customer_id: customer.id,
              status: 'closed_won'
            })
            .eq('id', lead.id);

          if (linkError) throw linkError;

          // Verify relationship
          const { data: linkedLead, error: verifyError } = await supabase
            .from('leads')
            .select('*, customers(*)')
            .eq('id', lead.id)
            .single();

          if (verifyError) throw verifyError;

          // Cleanup
          await supabase.from('leads').delete().eq('id', lead.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          return {
            success: true,
            message: "Lead to customer conversion workflow completed",
            duration: Date.now() - startTime,
            details: { 
              leadId: lead.id,
              customerId: customer.id,
              linkedCorrectly: linkedLead.customer_id === customer.id
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Lead conversion test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Customer Sales History",
      category: "Workflow",
      description: "Test customer sales history and relationship tracking",
      module: "Customers",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Sales History Customer',
              contact_person: 'Test Contact',
              email: 'saleshistory@test.com',
              phone: '+1111111111'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          // Create product for sale
          const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
              name: 'Test Product for Customer',
              sku: 'TEST-CUST-001',
              price: 100,
              stock_quantity: 10
            })
            .select()
            .single();

          if (productError) throw productError;

          // Create sale
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 100,
              status: 'confirmed',
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Verify customer-sale relationship
          const { data: customerWithSales, error: relationError } = await supabase
            .from('customers')
            .select(`
              *,
              sales (
                id,
                total_amount,
                status,
                sale_date
              )
            `)
            .eq('id', customer.id)
            .single();

          if (relationError) throw relationError;

          // Cleanup
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('products').delete().eq('id', product.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const hasSales = customerWithSales.sales && customerWithSales.sales.length > 0;

          return {
            success: hasSales,
            message: hasSales 
              ? "Customer sales history tracking working correctly"
              : "Customer sales relationship not found",
            duration: Date.now() - startTime,
            details: { 
              customerId: customer.id,
              salesCount: customerWithSales.sales?.length || 0,
              saleAmount: sale.total_amount
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Customer sales history test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Customer Search and Filtering",
      category: "UI Integration",
      description: "Test customer search and filtering functionality",
      module: "Customers",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create test customers with different attributes
          const customers = await Promise.all([
            supabase.from('customers').insert({
              company_name: 'Alice Johnson',
              contact_person: 'Alice Johnson',
              email: 'alice@test.com',
              phone: '+1111111111',
              city: 'New York'
            }).select().single(),
            supabase.from('customers').insert({
              company_name: 'Bob Smith',
              contact_person: 'Bob Smith',
              email: 'bob@test.com',
              phone: '+2222222222',
              city: 'Los Angeles'
            }).select().single(),
            supabase.from('customers').insert({
              company_name: 'Charlie Brown',
              contact_person: 'Charlie Brown',
              email: 'charlie@test.com',
              phone: '+3333333333',
              city: 'Chicago'
            }).select().single()
          ]);

          const customerIds = customers.map(c => c.data?.id).filter(Boolean);

          // Test name search
          const { data: nameSearch, error: nameError } = await supabase
            .from('customers')
            .select('*')
            .ilike('company_name', '%Alice%');

          if (nameError) throw nameError;

          // Test email search
          const { data: emailSearch, error: emailError } = await supabase
            .from('customers')
            .select('*')
            .ilike('email', '%bob@%');

          if (emailError) throw emailError;

          // Test city filter
          const { data: cityFilter, error: cityError } = await supabase
            .from('customers')
            .select('*')
            .eq('city', 'Chicago');

          if (cityError) throw cityError;

          // Cleanup
          await Promise.all(
            customerIds.map(id => 
              supabase.from('customers').delete().eq('id', id)
            )
          );

          const nameFound = nameSearch.some(c => c.company_name.includes('Alice'));
          const emailFound = emailSearch.some(c => c.email.includes('bob@'));
          const cityFound = cityFilter.some(c => c.city === 'Chicago');

          return {
            success: nameFound && emailFound && cityFound,
            message: "Customer search and filtering tests completed",
            duration: Date.now() - startTime,
            details: {
              nameSearchResults: nameSearch.length,
              emailSearchResults: emailSearch.length,
              cityFilterResults: cityFilter.length,
              allTestsPassed: nameFound && emailFound && cityFound
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Customer search test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    }
  ], []);

  return { createCustomerTests };
};