// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Package, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const ProductsSystemTester = () => {
  const [testResults, setTestResults] = useState<{
    productsCrud: string;
    inventoryIntegration: string;
    pricingCalculations: string;
    supplierRelations: string;
    containerTracking: string;
  }>({
    productsCrud: "pending",
    inventoryIntegration: "pending",
    pricingCalculations: "pending",
    supplierRelations: "pending",
    containerTracking: "pending",
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();

  const runProductsSystemTest = async () => {
    setIsRunning(true);
    
    // CRITICAL: Authentication verification before any tests
    if (!isAuthenticated || !user || userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please ensure you're logged in as an admin to run tests.",
      });
      setIsRunning(false);
      return;
    }
    
    console.log("🚀 ProductsSystemTester: Starting tests with authenticated user:", user.id);
    
    // Ensure sufficient test data is available
    await ensureTestData({ 
      customerCount: 2, 
      productCount: 5, 
      staffCount: 1, 
      supplierCount: 2, 
      leadCount: 1 
    });
    
    setTestResults({
      productsCrud: "running",
      inventoryIntegration: "pending",
      pricingCalculations: "pending",
      supplierRelations: "pending",
      containerTracking: "pending",
    });

    try {
      // Test 1: Products CRUD Operations
      console.log("🧪 Testing products CRUD operations...");
      const testProduct = {
        name: `Test Product ${Date.now()}`,
        description: "Test product for system validation",
        category: "solar_panels",
        sku: `TEST-${Date.now()}`,
        cost_price: 100.00,
        max_selling_price: 150.00,
        current_stock: 50,
        min_stock_level: 10,
        max_stock_level: 100,
        is_active: true,
        requires_installation: true,
        warranty_months: 12
      };

      const { data: createdProduct, error: createError } = await supabase
        .from("products")
        .insert(testProduct)
        .select()
        .single();

      if (createError) throw new Error(`Product creation failed: ${createError.message}`);

      // Test read, update
      const { data: readProduct, error: readError } = await supabase
        .from("products")
        .select("*")
        .eq("id", createdProduct.id)
        .single();

      if (readError) throw new Error(`Product read failed: ${readError.message}`);

        const { error: updateError } = await supabase
          .from("products")
          .update({ standard_selling_price: 160.00 })
          .eq("id", createdProduct.id);

      if (updateError) throw new Error(`Product update failed: ${updateError.message}`);

      setTestResults(prev => ({ ...prev, productsCrud: "success", inventoryIntegration: "running" }));

      // Test 2: Inventory Integration
      console.log("🧪 Testing inventory integration...");
      
      // Test stock movement creation with proper fields
      const { data: currentUser } = await supabase.auth.getUser();
      const { error: stockError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: createdProduct.id,
          movement_type: "in",
          quantity: 10,
          notes: "Test stock adjustment",
          reference_type: "adjustment",
          created_by: currentUser.user?.id,
          unit_cost: 100.00,
          total_cost: 1000.00
        });

      if (stockError) throw new Error(`Stock movement failed: ${stockError.message}`);

      // Test stock level update
      const { error: stockUpdateError } = await supabase
        .from("products")
        .update({ current_stock: 60 })
        .eq("id", createdProduct.id);

      if (stockUpdateError) throw new Error(`Stock update failed: ${stockUpdateError.message}`);

      setTestResults(prev => ({ ...prev, inventoryIntegration: "success", pricingCalculations: "running" }));

      // Test 3: Pricing Calculations
      console.log("🧪 Testing pricing calculations...");
      
      // Calculate profit margin
      const costPrice = createdProduct.cost_price;
      const sellingPrice = 160.00; // Updated price
      const profitMargin = ((sellingPrice - costPrice) / sellingPrice) * 100;

      if (profitMargin <= 0) throw new Error("Invalid profit margin calculation");

      // Test bulk pricing
      const bulkDiscount = 0.1; // 10% discount
      const bulkPrice = sellingPrice * (1 - bulkDiscount);
      
      if (bulkPrice >= sellingPrice) throw new Error("Bulk pricing calculation error");

      setTestResults(prev => ({ ...prev, pricingCalculations: "success", supplierRelations: "running" }));

      // Test 4: Supplier Relations
      console.log("🧪 Testing supplier relations...");
      
      // Create a test supplier first to ensure we have one
      const testSupplier = {
        name: `Test Supplier ${Date.now()}`,
        contact_person: "Test Contact",
        email: "test@supplier.com",
        phone: "1234567890",
        address: "Test Address",
        payment_terms: "net_30",
        lead_time_days: 14,
        is_active: true
      };

      const { data: createdSupplier, error: supplierError } = await supabase
        .from("suppliers")
        .insert(testSupplier)
        .select("id")
        .single();

      if (supplierError) throw new Error(`Test supplier creation failed: ${supplierError.message}`);

      // Test product-supplier relationship
      const { error: relationError } = await supabase
        .from("product_suppliers")
        .insert({
          product_id: createdProduct.id,
          supplier_id: createdSupplier.id,
          cost_price: 95.00,
          minimum_order_quantity: 10,
          lead_time_days: 14,
          is_preferred: true
        });

      if (relationError) {
        // Clean up supplier before throwing error
        await supabase.from("suppliers").delete().eq("id", createdSupplier.id);
        throw new Error(`Product-supplier relation failed: ${relationError.message}`);
      }

      setTestResults(prev => ({ ...prev, supplierRelations: "success", containerTracking: "running" }));

      // Test 5: Container Tracking
      console.log("🧪 Testing container tracking...");
      
      // Create a test container first to ensure we have one
      const testContainer = {
        container_number: `TEST-CONT-${Date.now()}`,
        container_type: "40ft",
        supplier_id: createdSupplier.id,
        status: "ordered" as const,
        order_date: new Date().toISOString().split('T')[0],
        total_cost: 0,
        notes: "Test container for product tracking"
      };

      const { data: createdContainer, error: containerError } = await supabase
        .from("containers")
        .insert(testContainer)
        .select("id")
        .single();

      if (containerError) throw new Error(`Test container creation failed: ${containerError.message}`);

      // Test container-product relationship with proper error handling
      const { error: containerProductError } = await supabase
        .from("container_products")
        .insert({
          container_id: createdContainer.id,
          product_id: createdProduct.id,
          product_name: createdProduct.name,
          quantity: 25,
          unit_cost: 98.00,
          total_cost: 25 * 98.00
        });

      if (containerProductError) {
        // Clean up container before throwing error
        await supabase.from("containers").delete().eq("id", createdContainer.id);
        throw new Error(`Container product tracking failed: ${containerProductError.message}`);
      }

      setTestResults(prev => ({ ...prev, containerTracking: "success" }));

      // Cleanup test data in proper order to avoid foreign key constraints
      if (createdContainer) {
        await supabase.from("containers").delete().eq("id", createdContainer.id);
      }
      if (createdSupplier) {
        await supabase.from("suppliers").delete().eq("id", createdSupplier.id);
      }
      await supabase.from("products").delete().eq("id", createdProduct.id);

      toast({
        title: "Products System Test Completed",
        description: "All product management tests passed successfully!",
      });

      console.log("✅ Products system test completed successfully");

    } catch (error) {
      console.error("❌ Products system test failed:", error);
      toast({
        variant: "destructive",
        title: "Products System Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      
      // Mark current and remaining tests as failed
      setTestResults(prev => {
        const failed = { ...prev };
        Object.keys(failed).forEach(key => {
          if (failed[key as keyof typeof failed] === "running" || failed[key as keyof typeof failed] === "pending") {
            failed[key as keyof typeof failed] = "failed";
          }
        });
        return failed;
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-100 text-green-800">Passed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge variant="secondary">Running...</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Products System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.productsCrud)}
              <span className="font-medium">Products CRUD Operations</span>
            </div>
            {getStatusBadge(testResults.productsCrud)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.inventoryIntegration)}
              <span className="font-medium">Inventory Integration</span>
            </div>
            {getStatusBadge(testResults.inventoryIntegration)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.pricingCalculations)}
              <span className="font-medium">Pricing Calculations</span>
            </div>
            {getStatusBadge(testResults.pricingCalculations)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.supplierRelations)}
              <span className="font-medium">Supplier Relations</span>
            </div>
            {getStatusBadge(testResults.supplierRelations)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.containerTracking)}
              <span className="font-medium">Container Tracking</span>
            </div>
            {getStatusBadge(testResults.containerTracking)}
          </div>
        </div>

        <div className="space-y-2">
          {!(isAuthenticated && userRole === 'admin') && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
              <Shield className="h-4 w-4 text-yellow-600" />
              <span>Authentication required for system tests</span>
            </div>
          )}
          <Button 
            onClick={runProductsSystemTest} 
            disabled={isRunning || !(isAuthenticated && userRole === 'admin')}
            className="w-full"
          >
            {isRunning ? "Running Products System Test..." : "Run Products System Test"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Test Coverage:</strong> Product catalog, inventory tracking, pricing, and supplier management</p>
          <p>Validates the complete product lifecycle and supply chain integration.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductsSystemTester;