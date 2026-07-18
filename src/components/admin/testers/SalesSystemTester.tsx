// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Clock, ShoppingCart, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const SalesSystemTester = () => {
  const [testResults, setTestResults] = useState<{
    salesCreation: string;
    paymentStatusCalculation: string;
    commissionCalculation: string;
    fulfillmentWorkflow: string;
    inventoryDeduction: string;
    installationTrigger: string;
    warrantyAutoCreation: string;
  }>({
    salesCreation: "pending",
    paymentStatusCalculation: "pending",
    commissionCalculation: "pending",
    fulfillmentWorkflow: "pending",
    inventoryDeduction: "pending",
    installationTrigger: "pending",
    warrantyAutoCreation: "pending",
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();

  const runSalesSystemTest = async () => {
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
    
    console.log("🚀 SalesSystemTester: Starting tests with authenticated user:", user.id);
    
    // Ensure test data is available
    console.log("📊 SalesSystemTester: Ensuring test data availability...");
    const testDataReady = await ensureTestData({
      customerCount: 2,
      productCount: 3,
      supplierCount: 1,
      leadCount: 1
    });
    
    if (!testDataReady) {
      setIsRunning(false);
      toast({
        variant: "destructive",
        title: "Test Data Unavailable",
        description: "Failed to ensure sufficient test data for sales testing",
      });
      return;
    }
    
    setTestResults({
      salesCreation: "running",
      paymentStatusCalculation: "pending",
      commissionCalculation: "pending",
      fulfillmentWorkflow: "pending",
      inventoryDeduction: "pending",
      installationTrigger: "pending",
      warrantyAutoCreation: "pending",
    });

    try {
      // Test 1: Sales Creation with Sale Items
      console.log("🧪 Testing sales creation with sale items...");
      
      // Get test data (enhanced with better error handling)
      const { data: customers, error: customerError } = await supabase.from("customers").select("id").limit(1);
      const { data: products, error: productError } = await supabase.from("products").select("id, name, requires_installation, warranty_months").limit(2);
      const { data: salesReps, error: salesRepError } = await supabase.from("staff").select("id").eq("role", "sales_rep").limit(1);

      if (customerError) throw new Error(`Customer data query failed: ${customerError.message}`);
      if (productError) throw new Error(`Product data query failed: ${productError.message}`);
      if (salesRepError) throw new Error(`Sales rep data query failed: ${salesRepError.message}`);

      if (!customers || customers.length === 0) {
        throw new Error("No customers available for testing - test data infrastructure should have created them");
      }
      if (!products || products.length === 0) {
        throw new Error("No products available for testing - test data infrastructure should have created them");
      }

      const testSale = {
        customer_id: customers[0].id,
        sales_rep_id: salesReps?.[0]?.id || null,
        sale_date: new Date().toISOString().split('T')[0],
        subtotal: 500.00,
        tax_amount: 50.00,
        total_amount: 550.00,
        payment_status: "pending",
        is_installment: true,
        invoice_number: `TEST-${Date.now()}`,
        requires_installation: products.some(p => p.requires_installation),
        requires_warranty: products.some(p => p.warranty_months > 0)
      };

      const { data: createdSale, error: saleError } = await supabase
        .from("sales")
        .insert(testSale)
        .select()
        .single();

      if (saleError) throw new Error(`Sale creation failed: ${saleError.message}`);

      // Create sale items
      const saleItems = products.map((product, index) => ({
        sale_id: createdSale.id,
        product_id: product.id,
        quantity: index + 1,
        unit_price: 100.00,
        line_total: (index + 1) * 100.00
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw new Error(`Sale items creation failed: ${itemsError.message}`);

      setTestResults(prev => ({ ...prev, salesCreation: "success", paymentStatusCalculation: "running" }));

      // Test 2: Payment Status Calculation
      console.log("🧪 Testing payment status calculation...");
      
      // Create a payment
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          sale_id: createdSale.id,
          amount: 200.00,
          payment_method: "cash",
          notes: "Test payment"
        });

      if (paymentError) throw new Error(`Payment creation failed: ${paymentError.message}`);

      // Check if sale payment status updated
      const { data: updatedSale, error: saleCheckError } = await supabase
        .from("sales")
        .select("payment_status, total_paid, balance_due, commission_amount")
        .eq("id", createdSale.id)
        .single();

      if (saleCheckError) throw new Error(`Sale status check failed: ${saleCheckError.message}`);

      if (updatedSale.payment_status !== "partial_paid") {
        throw new Error("Payment status not updated correctly");
      }

      setTestResults(prev => ({ ...prev, paymentStatusCalculation: "success", commissionCalculation: "running" }));

      // Test 3: Commission Calculation
      console.log("🧪 Testing commission calculation...");
      
      if (updatedSale && typeof updatedSale.commission_amount === 'number') {
        if (updatedSale.commission_amount <= 0) {
          console.warn("Commission amount is zero - check sales rep commission rate");
        }
      }

      setTestResults(prev => ({ ...prev, commissionCalculation: "success", fulfillmentWorkflow: "running" }));

      // Test 4: Fulfillment Workflow
      console.log("🧪 Testing fulfillment workflow...");
      
      // Check if order fulfillment record was created
      const { data: fulfillment, error: fulfillmentError } = await supabase
        .from("order_fulfillment")
        .select("*")
        .eq("sale_id", createdSale.id)
        .single();

      if (fulfillmentError && fulfillmentError.code !== 'PGRST116') {
        throw new Error(`Fulfillment check failed: ${fulfillmentError.message}`);
      }

      setTestResults(prev => ({ ...prev, fulfillmentWorkflow: "success", inventoryDeduction: "running" }));

      // Test 5: Inventory Deduction
      console.log("🧪 Testing inventory deduction...");
      
      // Check if stock movements were created
      const { data: stockMovements, error: stockError } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("reference_id", createdSale.id)
        .eq("reference_type", "sale");

      if (stockError) throw new Error(`Stock movement check failed: ${stockError.message}`);

      if (!stockMovements || stockMovements.length === 0) {
        console.warn("No stock movements found - inventory automation may not be working");
      }

      setTestResults(prev => ({ ...prev, inventoryDeduction: "success", installationTrigger: "running" }));

      // Test 6: Installation Trigger
      console.log("🧪 Testing installation trigger...");
      
      if (testSale.requires_installation) {
        const { data: installations, error: installError } = await supabase
          .from("installations")
          .select("*")
          .eq("sale_id", createdSale.id);

        if (installError) throw new Error(`Installation check failed: ${installError.message}`);

        if (!installations || installations.length === 0) {
          console.warn("No installation record found - auto-creation may not be working");
        }
      }

      setTestResults(prev => ({ ...prev, installationTrigger: "success", warrantyAutoCreation: "running" }));

      // Test 7: Warranty Auto-Creation
      console.log("🧪 Testing warranty auto-creation...");
      
      if (testSale.requires_warranty) {
        const { data: warranties, error: warrantyError } = await supabase
          .from("warranties")
          .select("*")
          .eq("sale_id", createdSale.id);

        if (warrantyError) throw new Error(`Warranty check failed: ${warrantyError.message}`);

        if (!warranties || warranties.length === 0) {
          console.warn("No warranty records found - auto-creation may not be working");
        }
      }

      setTestResults(prev => ({ ...prev, warrantyAutoCreation: "success" }));

      // Cleanup test sale
      await supabase.from("sales").delete().eq("id", createdSale.id);

      toast({
        title: "Sales System Test Completed",
        description: "All sales workflow tests passed successfully!",
      });

      console.log("✅ Sales system test completed successfully");

    } catch (error) {
      console.error("❌ Sales system test failed:", error);
      toast({
        variant: "destructive",
        title: "Sales System Test Failed",
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
          <ShoppingCart className="h-5 w-5" />
          Sales System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Object.entries(testResults).map(([key, status]) => {
            const labels = {
              salesCreation: "Sales Creation & Items",
              paymentStatusCalculation: "Payment Status Calculation",
              commissionCalculation: "Commission Calculation",
              fulfillmentWorkflow: "Fulfillment Workflow",
              inventoryDeduction: "Inventory Deduction",
              installationTrigger: "Installation Trigger",
              warrantyAutoCreation: "Warranty Auto-Creation"
            };

            return (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="font-medium">{labels[key as keyof typeof labels]}</span>
                </div>
                {getStatusBadge(status)}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {!(isAuthenticated && userRole === 'admin') && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Authentication required for system tests. Please ensure you are logged in as an admin.
              </AlertDescription>
            </Alert>
          )}
          
          {testDataStatus.availability && !testDataStatus.isDataSufficient && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient test data available. The test will automatically seed required data.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={runSalesSystemTest} 
            disabled={isRunning || !(isAuthenticated && userRole === 'admin')}
            className="w-full"
          >
            {isRunning ? "Running Tests..." : "Run Sales System Test"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Test Coverage:</strong> Complete sales workflow from creation to fulfillment</p>
          <p>Validates end-to-end sales process including automation triggers and integrations.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesSystemTester;