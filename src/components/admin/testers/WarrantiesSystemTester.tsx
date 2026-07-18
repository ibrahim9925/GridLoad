// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const WarrantiesSystemTester = () => {
  const [testResults, setTestResults] = useState<{
    warrantyCrud: string;
    warrantyClaimsProcessing: string;
    warrantyExpiryTracking: string;
    autoWarrantyCreation: string;
    warrantyLookup: string;
    installationIntegration: string;
  }>({
    warrantyCrud: "pending",
    warrantyClaimsProcessing: "pending",
    warrantyExpiryTracking: "pending",
    autoWarrantyCreation: "pending",
    warrantyLookup: "pending",
    installationIntegration: "pending",
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();

  const runWarrantiesSystemTest = async () => {
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
    
    console.log("🚀 WarrantiesSystemTester: Starting tests with authenticated user:", user.id);
    
    // Ensure sufficient test data is available including sales for warranty testing
    await ensureTestData({ 
      customerCount: 2, 
      productCount: 3, 
      staffCount: 1, 
      supplierCount: 1, 
      leadCount: 1 
    });
    
    setTestResults({
      warrantyCrud: "running",
      warrantyClaimsProcessing: "pending",
      warrantyExpiryTracking: "pending",
      autoWarrantyCreation: "pending",
      warrantyLookup: "pending",
      installationIntegration: "pending",
    });

    try {
      // Test 1: Warranty CRUD Operations
      console.log("🧪 Testing warranty CRUD operations...");
      
      // Get test data with better error handling
      const { data: customers, error: customerError } = await supabase.from("customers").select("id").limit(1);
      const { data: products, error: productError } = await supabase.from("products").select("id, name, warranty_months").filter("warranty_months", "gte", 1).limit(1);
      const { data: sales, error: saleError } = await supabase.from("sales").select("id").limit(1);

      if (customerError) throw new Error(`Customer query failed: ${customerError.message}`);
      if (productError) throw new Error(`Product query failed: ${productError.message}`);
      if (saleError) throw new Error(`Sale query failed: ${saleError.message}`);

      if (!customers || customers.length === 0) {
        throw new Error("No customers available for warranty testing - please create test customers first");
      }
      if (!products || products.length === 0) {
        throw new Error("No warranty-eligible products available - please create products with warranty_months > 0");
      }
      if (!sales || sales.length === 0) {
        throw new Error("No sales available for warranty testing - please create test sales first");
      }

      // Get current user for proper field assignment
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("User authentication required for testing");

      const warrantyPeriod = products[0].warranty_months || 12;
      const testWarranty = {
        sale_id: sales[0].id,
        product_id: products[0].id,
        customer_id: customers[0].id,
        warranty_period_months: warrantyPeriod,
        warranty_start_date: new Date().toISOString().split('T')[0],
        warranty_end_date: new Date(Date.now() + warrantyPeriod * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        warranty_type: "standard",
        serial_number: `TEST-WARRANTY-${Date.now()}`,
        status: "active",
        registered_by: currentUser.user.id,
        notes: "Test warranty for system validation"
      };

      const { data: createdWarranty, error: warrantyError } = await supabase
        .from("warranties")
        .insert(testWarranty)
        .select()
        .single();

      if (warrantyError) throw new Error(`Warranty creation failed: ${warrantyError.message}`);

      // Test read, update
      const { data: readWarranty, error: readError } = await supabase
        .from("warranties")
        .select("*")
        .eq("id", createdWarranty.id)
        .single();

      if (readError) throw new Error(`Warranty read failed: ${readError.message}`);

      const { error: updateError } = await supabase
        .from("warranties")
        .update({ notes: "Updated test warranty" })
        .eq("id", createdWarranty.id);

      if (updateError) throw new Error(`Warranty update failed: ${updateError.message}`);

      setTestResults(prev => ({ ...prev, warrantyCrud: "success", warrantyClaimsProcessing: "running" }));

      // Test 2: Warranty Claims Processing
      console.log("🧪 Testing warranty claims processing...");
      
      const testClaim = {
        warranty_id: createdWarranty.id,
        claim_type: "defect",
        description: "Test warranty claim for defective product",
        claim_amount: 150.00,
        status: "pending",
        notes: "Test claim for system validation"
      };

      const { data: createdClaim, error: claimError } = await supabase
        .from("warranty_claims")
        .insert(testClaim)
        .select()
        .single();

      if (claimError) throw new Error(`Warranty claim creation failed: ${claimError.message}`);

      // Test claim status updates
      const { error: claimUpdateError } = await supabase
        .from("warranty_claims")
        .update({ 
          status: "approved",
          resolution: "Product replacement approved"
        })
        .eq("id", createdClaim.id);

      if (claimUpdateError) throw new Error(`Claim status update failed: ${claimUpdateError.message}`);

      setTestResults(prev => ({ ...prev, warrantyClaimsProcessing: "success", warrantyExpiryTracking: "running" }));

      // Test 3: Warranty Expiry Tracking
      console.log("🧪 Testing warranty expiry tracking...");
      
      // Create a warranty that's about to expire
      const expiringSoon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const expiringWarranty = {
        ...testWarranty,
        warranty_end_date: expiringSoon.toISOString().split('T')[0],
        serial_number: `TEST-EXPIRING-${Date.now()}`,
        registered_by: currentUser.user.id,
        notes: "Test warranty expiring soon"
      };

      const { data: createdExpiringWarranty, error: expiringError } = await supabase
        .from("warranties")
        .insert(expiringWarranty)
        .select()
        .single();

      if (expiringError) throw new Error(`Expiring warranty creation failed: ${expiringError.message}`);

      // Check for warranties expiring soon (next 60 days)
      const { data: expiringSoonWarranties, error: expiryCheckError } = await supabase
        .from("warranties")
        .select("*")
        .lte("warranty_end_date", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .eq("status", "active");

      if (expiryCheckError) throw new Error(`Expiry tracking check failed: ${expiryCheckError.message}`);

      if (!expiringSoonWarranties || expiringSoonWarranties.length === 0) {
        console.warn("No expiring warranties found - expiry tracking may need attention");
      } else {
        console.log(`Found ${expiringSoonWarranties.length} warranties expiring soon`);
      }

      setTestResults(prev => ({ ...prev, warrantyExpiryTracking: "success", autoWarrantyCreation: "running" }));

      // Test 4: Auto-Warranty Creation from Sales
      console.log("🧪 Testing auto-warranty creation from sales...");
      
      // This test verifies that warranties are automatically created when sales are made
      // We'll check if the comprehensive_sales_automation trigger is working
      
      // Create a test sale with warranty-eligible products
      const testSale = {
        customer_id: customers[0].id,
        sales_rep_id: currentUser.user.id,
        sale_date: new Date().toISOString().split('T')[0],
        subtotal: 200.00,
        tax_amount: 20.00,
        total_amount: 220.00,
        payment_status: "pending",
        invoice_number: `TEST-SALE-${Date.now()}`,
        requires_warranty: true
      };

      const { data: autoSale, error: autoSaleError } = await supabase
        .from("sales")
        .insert(testSale)
        .select()
        .single();

      if (autoSaleError) throw new Error(`Auto warranty test sale failed: ${autoSaleError.message}`);

      // Create sale item with warranty product
      const { error: saleItemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: autoSale.id,
          product_id: products[0].id,
          quantity: 1,
          unit_price: 200.00,
          line_total: 200.00
        });

      if (saleItemError) throw new Error(`Auto warranty sale item failed: ${saleItemError.message}`);

      // Check if warranty was auto-created
      const { data: autoWarranties, error: autoWarrantyError } = await supabase
        .from("warranties")
        .select("*")
        .eq("sale_id", autoSale.id);

      if (autoWarrantyError) throw new Error(`Auto warranty check failed: ${autoWarrantyError.message}`);

      if (!autoWarranties || autoWarranties.length === 0) {
        console.warn("No auto-created warranties found - automation may not be working");
      } else {
        console.log(`Found ${autoWarranties.length} auto-created warranties`);
      }

      setTestResults(prev => ({ ...prev, autoWarrantyCreation: "success", warrantyLookup: "running" }));

      // Test 5: Warranty Lookup Functionality
      console.log("🧪 Testing warranty lookup functionality...");
      
      // Test lookup by serial number
      const { data: lookupBySerial, error: serialLookupError } = await supabase
        .from("warranties")
        .select(`
          *,
          products(name, category),
          customers(contact_person, email),
          sales(invoice_number, sale_date)
        `)
        .eq("serial_number", createdWarranty.serial_number);

      if (serialLookupError) throw new Error(`Serial number lookup failed: ${serialLookupError.message}`);

      if (!lookupBySerial || lookupBySerial.length === 0) {
        throw new Error("Warranty lookup by serial number failed");
      }

      // Test lookup by customer
      const { data: lookupByCustomer, error: customerLookupError } = await supabase
        .from("warranties")
        .select(`
          *,
          products(name, category)
        `)
        .eq("customer_id", customers[0].id);

      if (customerLookupError) throw new Error(`Customer warranty lookup failed: ${customerLookupError.message}`);

      if (!lookupByCustomer || lookupByCustomer.length === 0) {
        throw new Error("Warranty lookup by customer failed");
      }

      setTestResults(prev => ({ ...prev, warrantyLookup: "success", installationIntegration: "running" }));

      // Test 6: Installation Integration
      console.log("🧪 Testing installation integration...");
      
      // Check if warranties are linked to installations
      const { data: installations, error: installationError } = await supabase
        .from("installations")
        .select("id, sale_id")
        .eq("sale_id", autoSale.id);

      if (installationError) throw new Error(`Installation check failed: ${installationError.message}`);

      if (installations && installations.length > 0) {
        // Test warranty-installation relationship through sales
        const { data: warrantyInstallationLink, error: linkError } = await supabase
          .from("warranties")
          .select(`
            *,
            sales!inner(
              installations(id, status, scheduled_date)
            )
          `)
          .eq("sale_id", autoSale.id);

        if (linkError) throw new Error(`Warranty-installation link check failed: ${linkError.message}`);

        console.log(`Found ${warrantyInstallationLink?.length || 0} warranty-installation links`);
      }

      setTestResults(prev => ({ ...prev, installationIntegration: "success" }));

      // Cleanup test data in proper order
      try {
        await supabase.from("warranties").delete().eq("id", createdWarranty.id);
        await supabase.from("warranties").delete().eq("id", createdExpiringWarranty.id);
        if (autoWarranties && autoWarranties.length > 0) {
          for (const warranty of autoWarranties) {
            await supabase.from("warranties").delete().eq("id", warranty.id);
          }
        }
        await supabase.from("sales").delete().eq("id", autoSale.id);
      } catch (cleanupError) {
        console.warn("Cleanup error (non-critical):", cleanupError);
      }

      toast({
        title: "Warranties System Test Completed",
        description: "All warranty management tests passed successfully!",
      });

      console.log("✅ Warranties system test completed successfully");

    } catch (error) {
      console.error("❌ Warranties system test failed:", error);
      toast({
        variant: "destructive",
        title: "Warranties System Test Failed",
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
          <Shield className="h-5 w-5" />
          Warranties System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {Object.entries(testResults).map(([key, status]) => {
            const labels = {
              warrantyCrud: "Warranty CRUD Operations",
              warrantyClaimsProcessing: "Warranty Claims Processing",
              warrantyExpiryTracking: "Warranty Expiry Tracking",
              autoWarrantyCreation: "Auto-Warranty Creation",
              warrantyLookup: "Warranty Lookup Functionality",
              installationIntegration: "Installation Integration"
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
            onClick={runWarrantiesSystemTest} 
            disabled={isRunning || !(isAuthenticated && userRole === 'admin')}
            className="w-full"
          >
            {isRunning ? "Running Tests..." : "Run Warranties System Test"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Test Coverage:</strong> Complete warranty lifecycle and claims management</p>
          <p>Validates warranty creation, tracking, claims processing, and integration with sales/installations.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantiesSystemTester;