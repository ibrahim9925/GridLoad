// @ts-nocheck
import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Package,
  Building,
  UserCheck,
  Target
} from "lucide-react";
import { useTestDataInfrastructure } from "@/hooks/useTestDataInfrastructure";

/**
 * TestDataInfrastructurePanel - Manages test data for system testing
 * Provides seeding, cleanup, and availability checking
 */
const TestDataInfrastructurePanel = () => {
  const {
    status,
    isAuthReady,
    checkDataAvailability,
    seedBasicData,
    seedComprehensiveData,
    cleanupTestData,
    ensureTestData,
    getAvailabilitySummary
  } = useTestDataInfrastructure();

  // Check data availability on component mount
  useEffect(() => {
    if (isAuthReady) {
      checkDataAvailability();
    }
  }, [isAuthReady, checkDataAvailability]);

  const handleSeedBasicData = async () => {
    await seedBasicData({
      customerCount: 3,
      productCount: 5,
      supplierCount: 2,
      leadCount: 4,
      cleanup: true // Clean existing test data first
    });
  };

  const handleSeedComprehensiveData = async () => {
    await seedComprehensiveData();
  };

  const handleEnsureTestData = async () => {
    await ensureTestData();
  };

  const getDataAvailabilityIcon = (count: number, minimum: number = 1) => {
    if (count >= minimum) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getDataAvailabilityBadge = (count: number, minimum: number = 1) => {
    if (count >= minimum) {
      return <Badge variant="default" className="bg-green-100 text-green-800">{count}</Badge>;
    }
    return <Badge variant="destructive">{count}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Infrastructure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Authentication Status */}
        {!isAuthReady && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Authentication required for test data management. Please ensure you are logged in as an admin.
            </AlertDescription>
          </Alert>
        )}

        {/* Data Availability Status */}
        {status.availability && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Current Data Availability:</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.customers)}
                  <span className="text-sm">Customers</span>
                </div>
                {getDataAvailabilityBadge(status.availability.customers)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.products)}
                  <span className="text-sm">Products</span>
                </div>
                {getDataAvailabilityBadge(status.availability.products)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.staff)}
                  <span className="text-sm">Staff</span>
                </div>
                {getDataAvailabilityBadge(status.availability.staff)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.suppliers)}
                  <span className="text-sm">Suppliers</span>
                </div>
                {getDataAvailabilityBadge(status.availability.suppliers)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.leads)}
                  <span className="text-sm">Leads</span>
                </div>
                {getDataAvailabilityBadge(status.availability.leads)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.salesReps)}
                  <span className="text-sm">Sales Reps</span>
                </div>
                {getDataAvailabilityBadge(status.availability.salesReps)}
              </div>
            </div>

            {/* Specialized Product Availability */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 border rounded bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.warrantyProducts)}
                  <span className="text-sm">Warranty Products</span>
                </div>
                {getDataAvailabilityBadge(status.availability.warrantyProducts)}
              </div>

              <div className="flex items-center justify-between p-2 border rounded bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {getDataAvailabilityIcon(status.availability.installationProducts)}
                  <span className="text-sm">Installation Products</span>
                </div>
                {getDataAvailabilityBadge(status.availability.installationProducts)}
              </div>
            </div>
          </div>
        )}

        {/* Data Sufficiency Status */}
        {status.availability && (
          <Alert variant={status.isDataSufficient ? "default" : "destructive"}>
            <Database className="h-4 w-4" />
            <AlertDescription>
              {status.isDataSufficient 
                ? "✅ Sufficient test data available for system testing"
                : "❌ Insufficient test data - seeding recommended before running tests"
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleSeedBasicData}
              disabled={status.isLoading || !isAuthReady}
              variant="default"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Seed Basic Data
            </Button>

            <Button 
              onClick={handleSeedComprehensiveData}
              disabled={status.isLoading || !isAuthReady}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Seed Comprehensive
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleEnsureTestData}
              disabled={status.isLoading || !isAuthReady}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Ensure Data
            </Button>

            <Button 
              onClick={cleanupTestData}
              disabled={status.isLoading || !isAuthReady}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Cleanup Test Data
            </Button>
          </div>

          <Button 
            onClick={checkDataAvailability}
            disabled={status.isLoading || !isAuthReady}
            variant="ghost"
            className="w-full flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${status.isLoading ? 'animate-spin' : ''}`} />
            Refresh Availability
          </Button>
        </div>

        {/* Last Seeded Info */}
        {status.lastSeeded && (
          <div className="text-sm text-muted-foreground text-center">
            Last seeded: {status.lastSeeded.toLocaleString()}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Basic Data:</strong> Creates minimal test data for standard testing</p>
          <p><strong>Comprehensive:</strong> Creates complex scenarios with relationships</p>
          <p><strong>Ensure Data:</strong> Seeds only if insufficient data exists</p>
          <p><strong>Cleanup:</strong> Removes all test data (prefixed with TEST_)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestDataInfrastructurePanel;