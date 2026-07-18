// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Truck, MapPin, Calendar, DollarSign } from "lucide-react";
import { useContainers } from "@/hooks/useContainers";
import { useDeletionImpactAnalysis } from "@/hooks/useDeletionImpactAnalysis";
import ContainerDialog from "./ContainerDialog";
import EnhancedContainerProductsDialog from "./EnhancedContainerProductsDialog";
import { DeleteConfirmationDialog } from "../DeleteConfirmationDialog";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { BulkContainerOperations } from './BulkContainerOperations';

const ContainerManagementSection = () => {
  const { containers, isLoading, createContainer, updateContainer, deleteContainer, refetch } = useContainers();
  const { isAnalyzing, analyzeSupplierDeletion } = useDeletionImpactAnalysis();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productsDialogOpen, setProductsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<any>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);

  const getStatusColor = (status: string) => {
    const colors = {
      ordered: "bg-blue-100 text-blue-800",
      shipped: "bg-yellow-100 text-yellow-800", 
      arrived: "bg-green-100 text-green-800",
      processing: "bg-purple-100 text-purple-800",
      completed: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const handleSaveContainer = async (containerData: any) => {
    if (selectedContainer) {
      await updateContainer(selectedContainer.id, containerData);
    } else {
      await createContainer(containerData);
    }
    setSelectedContainer(null);
  };

  const handleEditContainer = (container: any) => {
    setSelectedContainer(container);
    setDialogOpen(true);
  };

  const handleManageProducts = (container: any) => {
    setSelectedContainer(container);
    setProductsDialogOpen(true);
  };

  const handleDeleteContainer = async (container: any) => {
    setSelectedContainer(container);
    setDeleteDialogOpen(true);
    // Analyze deletion impact
    const analysis = await analyzeSupplierDeletion(container.id);
    setImpactAnalysis(analysis);
  };

  const confirmDeleteContainer = async () => {
    if (!selectedContainer) return;
    
    try {
      await deleteContainer(selectedContainer.id);
      setDeleteDialogOpen(false);
      setSelectedContainer(null);
      setImpactAnalysis(null);
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Container Management</h2>
        <p className="text-muted-foreground">
          Manage your bulk container orders and track product arrivals
        </p>
      </div>
      <Button onClick={() => setDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Container Order
      </Button>
    </div>

    {/* Bulk Operations */}
    <BulkContainerOperations 
      containers={containers} 
      onContainersUpdated={refetch} 
    />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {containers.map((container) => (
          <Card key={container.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{container.container_number}</CardTitle>
                <Badge className={getStatusColor(container.status)}>
                  {container.status}
                </Badge>
              </div>
              <CardDescription>
                {container.container_type} • {container.supplier?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Ordered: {new Date(container.order_date).toLocaleDateString()}</span>
                </div>
                {container.expected_arrival_date && (
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3 text-muted-foreground" />
                    <span>ETA: {new Date(container.expected_arrival_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span>Cost: ${container.total_cost.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span>Customs: {container.customs_cleared ? 'Cleared' : 'Pending'}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditContainer(container)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleManageProducts(container)}
                  className="flex-1"
                >
                  <Package className="mr-1 h-3 w-3" />
                  {container.status === 'completed' ? 'View Products' : 'Products'}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteContainer(container)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {containers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No containers</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first container order.
            </p>
            <div className="mt-6">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Container Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ContainerDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedContainer(null);
        }}
        container={selectedContainer}
        onSave={handleSaveContainer}
      />

      <EnhancedContainerProductsDialog
        open={productsDialogOpen}
        onOpenChange={(open) => {
          setProductsDialogOpen(open);
          if (!open) {
            setSelectedContainer(null);
            refetch(); // Refresh containers after dialog closes
          }
        }}
        container={selectedContainer}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedContainer(null);
          setImpactAnalysis(null);
        }}
        onConfirm={confirmDeleteContainer}
        title="Delete Container"
        itemName={selectedContainer?.container_number}
        impactAnalysis={impactAnalysis}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
};

export default ContainerManagementSection;