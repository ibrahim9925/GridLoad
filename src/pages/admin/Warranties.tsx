
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, AlertTriangle, Clock } from "lucide-react";
import WarrantyDialog from "@/components/admin/warranties/WarrantyDialog";
import WarrantyLookup from "@/components/admin/warranties/WarrantyLookup";
import SerialNumberManager from "@/components/admin/warranties/SerialNumberManager";
import WarrantyGeneration from "@/components/admin/warranties/WarrantyGeneration";
import WarrantyFaultLogWrapper from "@/components/admin/warranties/WarrantyFaultLogWrapper";
import { useWarrantyStats } from "@/hooks/useWarrantyStats";

const Warranties = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { 
    activeWarranties, 
    expiredWarranties, 
    expiringSoon, 
    pendingClaims, 
    loading, 
    error 
  } = useWarrantyStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Warranty Management</h1>
          <p className="text-muted-foreground">
            Manage product warranties, track claims, and monitor warranty status
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? "..." : activeWarranties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {loading ? "..." : expiringSoon}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold text-blue-600">
                  {loading ? "..." : pendingClaims}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? "..." : expiredWarranties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="ml-3">
                <h4 className="font-medium text-red-800">Error Loading Data</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="serial-numbers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="serial-numbers">Serial Numbers</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="lookup">Lookup</TabsTrigger>
          <TabsTrigger value="fault-log">Fault Log</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="serial-numbers">
          <SerialNumberManager />
        </TabsContent>

        <TabsContent value="certificates">
          <WarrantyGeneration />
        </TabsContent>

        <TabsContent value="lookup">
          <WarrantyLookup />
        </TabsContent>

        <TabsContent value="fault-log">
          <Card>
            <CardHeader>
              <CardTitle>Warranty Fault Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Select a sold device by serial number to view or log faults.
              </p>
              <WarrantyFaultLogWrapper />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>Warranty Claims Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Claims Management</h3>
                <p>Process warranty claims, track resolutions, and manage customer communications.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WarrantyDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
};

export default Warranties;
