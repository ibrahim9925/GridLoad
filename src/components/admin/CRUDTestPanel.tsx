// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CRUDTestPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addTestResult = (result: string, isSuccess: boolean = true) => {
    const prefix = isSuccess ? "✅" : "❌";
    setTestResults(prev => [...prev, `${prefix} ${result}`]);
  };

  const testCustomerCRUD = async () => {
    try {
      addTestResult("Testing customer creation...");
      
      // Test customer creation
      const customerData = {
        contact_person: "Test Customer",
        company_name: "Test Company Ltd",
        email: "test@testcompany.com",
        phone: "+1234567890",
        address: "123 Test Street"
      };

      const { data: customer, error: createError } = await supabase
        .from("customers")
        .insert([customerData])
        .select()
        .single();

      if (createError) {
        addTestResult(`Customer creation failed: ${createError.message}`, false);
        return;
      }

      addTestResult(`Customer created successfully with ID: ${customer.id}`);

      // Test customer update
      const { error: updateError } = await supabase
        .from("customers")
        .update({ company_name: "Updated Test Company" })
        .eq("id", customer.id);

      if (updateError) {
        addTestResult(`Customer update failed: ${updateError.message}`, false);
      } else {
        addTestResult("Customer updated successfully");
      }

      // Cleanup - delete test customer
      await supabase.from("customers").delete().eq("id", customer.id);
      addTestResult("Test customer cleaned up");
      
    } catch (error: any) {
      addTestResult(`Customer test error: ${error.message}`, false);
    }
  };

  const testProductCRUD = async () => {
    try {
      addTestResult("Testing product creation...");
      
      // Test product creation
      const productData = {
        name: "Test Solar Panel",
        sku: "TSP-001",
        description: "A test solar panel for validation",
        standard_selling_price: 299.99,
        cost_price: 199.99,
        current_stock: 50,
        category: "solar_panels",
        is_active: true
      };

      const { data: product, error: createError } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();

      if (createError) {
        addTestResult(`Product creation failed: ${createError.message}`, false);
        return;
      }

      addTestResult(`Product created successfully with ID: ${product.id}`);

      // Test product update
      const { error: updateError } = await supabase
        .from("products")
        .update({ standard_selling_price: 349.99 })
        .eq("id", product.id);

      if (updateError) {
        addTestResult(`Product update failed: ${updateError.message}`, false);
      } else {
        addTestResult("Product updated successfully");
      }

      // Cleanup
      await supabase.from("products").delete().eq("id", product.id);
      addTestResult("Test product cleaned up");
      
    } catch (error: any) {
      addTestResult(`Product test error: ${error.message}`, false);
    }
  };

  const testSaleCRUD = async () => {
    try {
      addTestResult("Testing sales creation...");
      
      // First create a test customer and product
      const { data: customer } = await supabase
        .from("customers")
        .insert([{
          contact_person: "Sale Test Customer",
          email: "saletest@example.com",
          phone: "+1234567890"
        }])
        .select()
        .single();

      const { data: product } = await supabase
        .from("products")
        .insert([{
          name: "Test Sale Product",
          sku: "TSP-SALE-001",
          standard_selling_price: 199.99,
          current_stock: 10,
          category: "batteries"
        }])
        .select()
        .single();

      if (!customer || !product) {
        addTestResult("Failed to create test data for sale", false);
        return;
      }

      // Test sale creation
      const saleData = {
        customer_id: customer.id,
        sale_date: new Date().toISOString().split('T')[0],
        total_amount: 199.99,
        payment_status: 'pending',
        notes: "Test sale for validation"
      };

      const { data: sale, error: createError } = await supabase
        .from("sales")
        .insert([saleData])
        .select()
        .single();

      if (createError) {
        addTestResult(`Sale creation failed: ${createError.message}`, false);
      } else {
        addTestResult(`Sale created successfully with ID: ${sale.id}`);
      }

      // Cleanup
      if (sale) await supabase.from("sales").delete().eq("id", sale.id);
      await supabase.from("products").delete().eq("id", product.id);
      await supabase.from("customers").delete().eq("id", customer.id);
      addTestResult("Test sale data cleaned up");
      
    } catch (error: any) {
      addTestResult(`Sale test error: ${error.message}`, false);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addTestResult("🧪 Starting CRUD validation tests...");
      
      await testCustomerCRUD();
      await testProductCRUD();
      await testSaleCRUD();
      
      addTestResult("🎉 All tests completed!");
      
      toast({
        title: "CRUD Tests Complete",
        description: "Check results above. Green checkmarks mean success!",
      });
      
    } catch (error: any) {
      addTestResult(`Test suite error: ${error.message}`, false);
      toast({
        variant: "destructive",
        title: "Test Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🧪 CRUD Operations Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAllTests} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Running Tests..." : "Test All CRUD Operations"}
        </Button>
        
        {testResults.length > 0 && (
          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CRUDTestPanel;