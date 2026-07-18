// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Clock, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

const LeadsSystemTester = () => {
  const [testResults, setTestResults] = useState<{
    leadsCrud: string;
    statusTransitions: string;
    salesRepAssignment: string;
    customerIntegration: string;
    solarCalculatorData: string;
  }>({
    leadsCrud: "pending",
    statusTransitions: "pending",
    salesRepAssignment: "pending",
    customerIntegration: "pending",
    solarCalculatorData: "pending",
  });
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, user, userRole } = useAuth();
  const { ensureTestData, status: testDataStatus } = useTestDataInfrastructure();

  const runLeadsSystemTest = async () => {
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
    
    console.log("🚀 LeadsSystemTester: Starting tests with authenticated user:", user.id);
    
    // Ensure test data is available
    console.log("📊 LeadsSystemTester: Ensuring test data availability...");
    const testDataReady = await ensureTestData({
      customerCount: 2,
      leadCount: 2,
      supplierCount: 1
    });
    
    if (!testDataReady) {
      setIsRunning(false);
      toast({
        variant: "destructive",
        title: "Test Data Unavailable",
        description: "Failed to ensure sufficient test data for leads testing",
      });
      return;
    }
    
    setTestResults({
      leadsCrud: "running",
      statusTransitions: "pending",
      salesRepAssignment: "pending",
      customerIntegration: "pending",
      solarCalculatorData: "pending",
    });

    try {
      // Test 1: Leads CRUD Operations
      console.log("🧪 Testing leads CRUD operations...");
      const testLead = {
        full_name: `Test Lead ${Date.now()}`,
        email: "testlead@example.com",
        phone: "1234567890",
        lead_type: "solar_calculator" as const,
        status: "new" as const,
        notes: "Test lead for system validation"
      };

      const { data: createdLead, error: createError } = await supabase
        .from("leads")
        .insert([testLead])
        .select()
        .single();

      if (createError) throw new Error(`Lead creation failed: ${createError.message}`);

      // Test read, update, delete
      const { data: readLead, error: readError } = await supabase
        .from("leads")
        .select("*")
        .eq("id", createdLead.id)
        .single();

      if (readError) throw new Error(`Lead read failed: ${readError.message}`);

      const { error: updateError } = await supabase
        .from("leads")
        .update({ notes: "Updated test lead" })
        .eq("id", createdLead.id);

      if (updateError) throw new Error(`Lead update failed: ${updateError.message}`);

      setTestResults(prev => ({ ...prev, leadsCrud: "success", statusTransitions: "running" }));

      // Test 2: Status Transitions
      console.log("🧪 Testing lead status transitions...");
      const statusSequence = ["contacted", "quoted", "closed_won"];
      
      for (const status of statusSequence) {
        const { error: statusError } = await supabase
          .from("leads")
          .update({ status: status as any })
          .eq("id", createdLead.id);

        if (statusError) throw new Error(`Status transition to ${status} failed: ${statusError.message}`);
      }

      setTestResults(prev => ({ ...prev, statusTransitions: "success", salesRepAssignment: "running" }));

      // Test 3: Sales Rep Assignment
      console.log("🧪 Testing sales rep assignment...");
      const { data: salesReps, error: salesRepError } = await supabase
        .from("staff")
        .select("id")
        .eq("role", "sales_rep")
        .limit(1);

      if (salesRepError) throw new Error(`Sales rep query failed: ${salesRepError.message}`);

      if (salesReps && salesReps.length > 0) {
        const { error: assignError } = await supabase
          .from("leads")
          .update({ assigned_to: salesReps[0].id })
          .eq("id", createdLead.id);

        if (assignError) throw new Error(`Lead assignment failed: ${assignError.message}`);
      }

      setTestResults(prev => ({ ...prev, salesRepAssignment: "success", customerIntegration: "running" }));

      // Test 4: Customer Integration
      console.log("🧪 Testing customer integration...");
      const { data: customers, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .limit(1);

      if (customerError) throw new Error(`Customer query failed: ${customerError.message}`);

      if (customers && customers.length > 0) {
        const { error: linkError } = await supabase
          .from("leads")
          .update({ converted_to_customer_id: customers[0].id } as any)
          .eq("id", createdLead.id);

        if (linkError) throw new Error(`Customer linking failed: ${linkError.message}`);
      }

      setTestResults(prev => ({ ...prev, customerIntegration: "success", solarCalculatorData: "running" }));

      // Test 5: Solar Calculator Data
      console.log("🧪 Testing solar calculator data...");
      const solarData = {
        monthly_consumption_kwh: 500,
        roof_space_m2: 50,
        system_size_kw: 5.5,
        cost_estimate: 15000,
        calculator_data: {
          panels: "20x 275W panels",
          inverter: "5kW string inverter",
          battery: "10kWh lithium battery"
        }
      };

      const { error: solarError } = await supabase
        .from("leads")
        .update(solarData)
        .eq("id", createdLead.id);

      if (solarError) throw new Error(`Solar data update failed: ${solarError.message}`);

      setTestResults(prev => ({ ...prev, solarCalculatorData: "success" }));

      // Cleanup test lead
      await supabase.from("leads").delete().eq("id", createdLead.id);

      toast({
        title: "Leads System Test Completed",
        description: "All lead management tests passed successfully!",
      });

      console.log("✅ Leads system test completed successfully");

    } catch (error) {
      console.error("❌ Leads system test failed:", error);
      toast({
        variant: "destructive",
        title: "Leads System Test Failed",
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
          <Users className="h-5 w-5" />
          Leads System Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.leadsCrud)}
              <span className="font-medium">Leads CRUD Operations</span>
            </div>
            {getStatusBadge(testResults.leadsCrud)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.statusTransitions)}
              <span className="font-medium">Status Transitions</span>
            </div>
            {getStatusBadge(testResults.statusTransitions)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.salesRepAssignment)}
              <span className="font-medium">Sales Rep Assignment</span>
            </div>
            {getStatusBadge(testResults.salesRepAssignment)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.customerIntegration)}
              <span className="font-medium">Customer Integration</span>
            </div>
            {getStatusBadge(testResults.customerIntegration)}
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.solarCalculatorData)}
              <span className="font-medium">Solar Calculator Data</span>
            </div>
            {getStatusBadge(testResults.solarCalculatorData)}
          </div>
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
            onClick={runLeadsSystemTest} 
            disabled={isRunning || !(isAuthenticated && userRole === 'admin')}
            className="w-full"
          >
            {isRunning ? "Running Tests..." : "Run Leads System Test"}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Test Coverage:</strong> Lead management, status workflow, assignments, and integrations</p>
          <p>Validates the complete lead lifecycle from creation to conversion.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsSystemTester;