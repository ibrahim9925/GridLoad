// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  ArrowRight, 
  Lightbulb,
  Container,
  ShoppingCart
} from 'lucide-react';
import { useContainerPORelationship, SmartSuggestion } from '@/hooks/useContainerPORelationship';
import { useContainers } from '@/hooks/useContainers';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface SmartContainerDashboardProps {
  onCreateContainer: () => void;
  onCreatePurchaseOrder: () => void;
  onEditContainer: (container: any) => void;
}

export const SmartContainerDashboard: React.FC<SmartContainerDashboardProps> = ({
  onCreateContainer,
  onCreatePurchaseOrder,
  onEditContainer
}) => {
  const { containers } = useContainers();
  const { purchaseOrders } = usePurchaseOrders();
  const { toast } = useToast();
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
  
  const {
    unassignedPOs,
    smartSuggestions,
    isLoading,
    assignPOToContainer,
    refreshData
  } = useContainerPORelationship();

  const activeContainers = containers.filter(c => c.status !== 'completed');
  const totalUnassignedValue = unassignedPOs.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);

  // Calculate container utilization
  const getContainerUtilization = (containerId: string) => {
    const assignedPOs = purchaseOrders.filter(po => po.container_id === containerId);
    const totalValue = assignedPOs.reduce((sum, po) => sum + Number(po.total_amount || 0), 0);
    const container = containers.find(c => c.id === containerId);
    
    // Estimate capacity based on container type
    const estimatedCapacity = container?.container_type === '40ft' ? 100000 : 60000;
    const percentage = Math.min((totalValue / estimatedCapacity) * 100, 100);
    
    return {
      totalValue,
      assignedPOs: assignedPOs.length,
      percentage,
      capacity: estimatedCapacity,
      remaining: estimatedCapacity - totalValue
    };
  };

  const handleQuickAssignment = async (poId: string, containerId: string) => {
    const success = await assignPOToContainer(poId, containerId);
    if (success) {
      await refreshData();
    }
  };

  const handleSuggestionAction = (suggestion: SmartSuggestion) => {
    switch (suggestion.type) {
      case 'create_container':
        onCreateContainer();
        break;
      case 'assign_to_existing':
        // Logic to batch assign multiple POs
        toast({
          title: "Feature Coming Soon",
          description: "Bulk assignment feature will be available soon.",
        });
        break;
      case 'split_across_containers':
        toast({
          title: "Feature Coming Soon", 
          description: "PO splitting feature will be available soon.",
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Containers</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContainers.length}</div>
            <p className="text-xs text-muted-foreground">
              {containers.filter(c => c.status === 'port_arrival').length} arrived this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned POs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedPOs.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalUnassignedValue.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Smart Suggestions</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{smartSuggestions.length}</div>
            <p className="text-xs text-muted-foreground">
              Optimization opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeContainers.length > 0 ? 
                Math.round(activeContainers.reduce((avg, container) => 
                  avg + getContainerUtilization(container.id).percentage, 0) / activeContainers.length
                ) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all containers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" />
              Smart Workflow Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered recommendations to optimize your container and purchase order workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {smartSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleSuggestionAction(suggestion)}
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Apply
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Container Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Container Overview</CardTitle>
              <Button size="sm" onClick={onCreateContainer}>
                <Plus className="h-4 w-4 mr-1" />
                New Container
              </Button>
            </div>
            <CardDescription>
              Active containers and their utilization status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeContainers.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active containers</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={onCreateContainer}
                >
                  Create First Container
                </Button>
              </div>
            ) : (
              activeContainers.map((container) => {
                const utilization = getContainerUtilization(container.id);
                return (
                  <div key={container.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{container.container_number}</h4>
                        <p className="text-sm text-muted-foreground">
                          {container.container_type} • {container.supplier?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={container.status === 'port_arrival' ? 'default' : 'secondary'}
                          className="mb-1"
                        >
                          {container.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {utilization.assignedPOs} PO{utilization.assignedPOs !== 1 ? 's' : ''} assigned
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Capacity Utilization</span>
                        <span>{Math.round(utilization.percentage)}%</span>
                      </div>
                      <Progress 
                        value={utilization.percentage} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${utilization.totalValue.toLocaleString()}</span>
                        <span>${utilization.capacity.toLocaleString()} capacity</span>
                      </div>
                    </div>
                    
                    {utilization.percentage > 90 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertTriangle className="h-3 w-3" />
                        Near capacity limit
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onEditContainer(container)}
                    >
                      Manage Container
                    </Button>
                    
                    {container !== activeContainers[activeContainers.length - 1] && <Separator />}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Unassigned Purchase Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Unassigned Purchase Orders</CardTitle>
              <Button size="sm" onClick={onCreatePurchaseOrder}>
                <Plus className="h-4 w-4 mr-1" />
                New PO
              </Button>
            </div>
            <CardDescription>
              Purchase orders that need container assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unassignedPOs.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">All purchase orders assigned</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create new purchase orders to see them here
                </p>
              </div>
            ) : (
              unassignedPOs.map((po) => (
                <div key={po.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{po.order_number}</h4>
                      <p className="text-sm text-muted-foreground">
                        {po.supplier?.name} • ${Number(po.total_amount).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={po.status === 'confirmed' ? 'default' : 'secondary'}>
                      {po.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Quick Assign to Container:</label>
                    <Select 
                      value=""
                      onValueChange={(containerId) => handleQuickAssignment(po.id, containerId)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select container..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeContainers
                          .filter(container => container.supplier_id === po.supplier_id)
                          .map((container) => {
                            const utilization = getContainerUtilization(container.id);
                            return (
                              <SelectItem key={container.id} value={container.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{container.container_number}</span>
                                  <Badge 
                                    variant={utilization.percentage > 80 ? 'destructive' : 'secondary'}
                                    className="ml-2"
                                  >
                                    {Math.round(utilization.percentage)}%
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {po !== unassignedPOs[unassignedPOs.length - 1] && <Separator />}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};