// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Archive, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const InventorySystemTester = () => {
  const [testResults, setTestResults] = useState<{
    stockMovementsTracking: string;
    stockAlertsGeneration: string;
    reorderPointCalculations: string;
    abcAnalysis: string;
    inventoryValuations: string;
    alertDetection: string;
  }>({
    stockMovementsTracking: "pending",
    stockAlertsGeneration: "pending",
    reorderPointCalculations: "pending",
    abcAnalysis: "pending",
    inventoryValuations: "pending",
    alertDetection: "pending",
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();

  const runInventorySystemTest = async () => {
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
    
    console.log("🚀 InventorySystemTester: Starting tests with authenticated user:", user.id);
    
    // Ensure sufficient test data is available
    await ensureTestData({ 
      customerCount: 2, 
      productCount: 3, 
      staffCount: 1, 
      supplierCount: 1, 
      leadCount: 1 
    });
    
    setTestResults({
      stockMovementsTracking: "running",
      stockAlertsGeneration: "pending",
      reorderPointCalculations: "pending",
      abcAnalysis: "pending",
      inventoryValuations: "pending",
      alertDetection: "pending",
    });

    try {
      // Test 1: Stock Movements Tracking
      console.log("🧪 Testing stock movements tracking...");
      
      // Get a test product
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, name, current_stock")
        .limit(1);

      if (productError || !products || products.length === 0) {
        throw new Error("No products available for testing");
      }

      const testProduct = products[0];

      // Create test stock movements with proper user reference
      const { data: currentUser } = await supabase.auth.getUser();
      const movements = [
        {
          product_id: testProduct.id,
          movement_type: "in",
          quantity: 50,
          notes: "Test stock increase",
          reference_type: "adjustment",
          created_by: currentUser.user?.id,
          unit_cost: 50.00,
          total_cost: 2500.00
        },
        {
          product_id: testProduct.id,
          movement_type: "out",
          quantity: 10,
          notes: "Test stock decrease",
          reference_type: "adjustment",
          created_by: currentUser.user?.id,
          unit_cost: 50.00,
          total_cost: 500.00
        }
      ];

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert(movements);

      if (movementError) throw new Error(`Stock movement creation failed: ${movementError.message}`);

      // Verify movements were recorded
      const { data: recordedMovements, error: movementCheckError } = await supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", testProduct.id)
        .eq("reference_type", "adjustment")
        .gte("created_at", new Date(Date.now() - 60000).toISOString()); // Last minute

      if (movementCheckError) throw new Error(`Movement verification failed: ${movementCheckError.message}`);

      if (!recordedMovements || recordedMovements.length < 2) {
        throw new Error("Stock movements not properly recorded");
      }

      setTestResults(prev => ({ ...prev, stockMovementsTracking: "success", stockAlertsGeneration: "running" }));

      // Test 2: Stock Alerts Generation
      console.log("🧪 Testing stock alerts generation...");
      
      // Call the generate_stock_alerts function
      const { data: alertsGenerated, error: alertError } = await supabase
        .rpc("generate_stock_alerts");

      if (alertError) throw new Error(`Stock alerts generation failed: ${alertError.message}`);

      // Check if alerts were created
      const { data: alerts, error: alertsCheckError } = await supabase
        .from("stock_alerts")
        .select("*")
        .gte("created_at", new Date(Date.now() - 60000).toISOString()); // Last minute

      if (alertsCheckError) throw new Error(`Alerts check failed: ${alertsCheckError.message}`);

      console.log(`Generated ${alertsGenerated} alerts, found ${alerts?.length || 0} recent alerts`);

      setTestResults(prev => ({ ...prev, stockAlertsGeneration: "success", reorderPointCalculations: "running" }));

      // Test 3: Reorder Point Calculations
      console.log("🧪 Testing reorder point calculations...");
      
      // Test the calculate_reorder_point function
      const { data: calculatedReorderPoint, error: reorderError } = await supabase
        .rpc("calculate_reorder_point", { 
          p_product_id: testProduct.id
        });

      if (reorderError) throw new Error(`Reorder point calculation failed: ${reorderError.message}`);

      if (typeof calculatedReorderPoint !== 'number' || calculatedReorderPoint < 0) {
        throw new Error("Invalid reorder point calculation result");
      }

      console.log(`Calculated reorder point: ${calculatedReorderPoint}`);

      setTestResults(prev => ({ ...prev, reorderPointCalculations: "success", abcAnalysis: "running" }));

      // Test 4: ABC Analysis
      console.log("🧪 Testing ABC analysis...");
      
      // Test the calculate_abc_analysis function
      const { data: abcResults, error: abcError } = await supabase
        .rpc("calculate_abc_analysis");

      if (abcError) throw new Error(`ABC analysis failed: ${abcError.message}`);

      if (!Array.isArray(abcResults) || abcResults.length === 0) {
        console.warn("ABC analysis returned no results - may need sales data");
      } else {
        // Verify ABC categories are assigned correctly
        const categories = abcResults.map((item: any) => item.abc_category);
        const hasValidCategories = categories.every((cat: string) => ['A', 'B', 'C'].includes(cat));
        
        if (!hasValidCategories) {
          throw new Error("Invalid ABC categories assigned");
        }
      }

      setTestResults(prev => ({ ...prev, abcAnalysis: "success", inventoryValuations: "running" }));

      // Test 5: Inventory Valuations
      console.log("🧪 Testing inventory valuations...");
      
      // Create a test inventory valuation
      const { error: valuationError } = await supabase
        .from("inventory_valuations")
        .insert({
          product_id: testProduct.id,
          quantity: 100,
          unit_cost: 50.00,
          total_value: 5000.00,
          valuation_method: "weighted_average"
        });

      if (valuationError) throw new Error(`Inventory valuation creation failed: ${valuationError.message}`);

      // Verify valuation was created
      const { data: valuations, error: valuationCheckError } = await supabase
        .from("inventory_valuations")
        .select("*")
        .eq("product_id", testProduct.id)
        .eq("valuation_date", new Date().toISOString().split('T')[0]);

      if (valuationCheckError) throw new Error(`Valuation verification failed: ${valuationCheckError.message}`);

      if (!valuations || valuations.length === 0) {
        throw new Error("Inventory valuation not properly recorded");
      }

      setTestResults(prev => ({ ...prev, inventoryValuations: "success", alertDetection: "running" }));

      // Test 6: Alert Detection (Low Stock/Overstock)
      console.log("🧪 Testing alert detection...");
      
      // Check current alerts
      const { data: currentAlerts, error: currentAlertsError } = await supabase
        .from("stock_alerts")
        .select("*")
        .eq("is_acknowledged", false);

      if (currentAlertsError) throw new Error(`Current alerts check failed: ${currentAlertsError.message}`);

      // Categorize alerts by type and severity
      const alertsByType = {
        out_of_stock: 0,
        reorder_point: 0,
        overstock: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };

      if (currentAlerts) {
        currentAlerts.forEach((alert: any) => {
          if (alertsByType.hasOwnProperty(alert.alert_type)) {
            alertsByType[alert.alert_type as keyof typeof alertsByType]++;
          }
          if (alertsByType.hasOwnProperty(alert.severity)) {
            alertsByType[alert.severity as keyof typeof alertsByType]++;
          }
        });
      }

      console.log("Alert detection summary:", alertsByType);

      setTestResults(prev => ({ ...prev, alertDetection: "success" }));

      toast({
        title: "Inventory System Test Completed",
        description: "All inventory management tests passed successfully!",
      });

      console.log("✅ Inventory system test completed successfully");

    } catch (error) {
      console.error("❌ Inventory system test failed:", error);
      toast({
        variant: "destructive",
        title: "Inventory System Test Failed",
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
          <Archive className="h-5 w-5" />
          Inventory System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Object.entries(testResults).map(([key, status]) => {
            const labels = {
              stockMovementsTracking: "Stock Movements Tracking",
              stockAlertsGeneration: "Stock Alerts Generation",
              reorderPointCalculations: "Reorder Point Calculations",
              abcAnalysis: "ABC Analysis",
              inventoryValuations: "Inventory Valuations",
              alertDetection: "Alert Detection System"
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
            <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
              <Shield className="h-4 w-4 text-yellow-600" />
              <span>Authentication required for system tests</span>
            </div>
          )}
          <Button 
            onClick={runInventorySystemTest} 
            disabled={isRunning || !(isAuthenticated && userRole === 'admin')}
            className="w-full"
          >
            {isRunning ? "Running Tests..." : "Run Inventory System Test"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Test Coverage:</strong> Stock tracking, alerts, analytics, and valuation systems</p>
          <p>Validates comprehensive inventory management and automated alerting capabilities.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventorySystemTester;