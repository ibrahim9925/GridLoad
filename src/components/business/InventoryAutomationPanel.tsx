// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  ShoppingCart, 
  Clock,
  CheckCircle 
} from "lucide-react";
import { useInventoryAutomation } from "@/hooks/useInventoryAutomation";
import { useToast } from "@/hooks/use-toast";

const InventoryAutomationPanel = () => {
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const {
    generateReorderSuggestions,
    createAutoPurchaseOrder,
    calculateOptimalReorderQuantity
  } = useInventoryAutomation();
  const { toast } = useToast();

  useEffect(() => {
    loadReorderSuggestions();
  }, []);

  const loadReorderSuggestions = async () => {
    try {
      setIsLoading(true);
      const suggestions = await generateReorderSuggestions();
      setReorderSuggestions(suggestions);
    } catch (error) {
      console.error("Error loading reorder suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePurchaseOrder = async (suggestions: any[], supplierId: string) => {
    try {
      await createAutoPurchaseOrder(suggestions, supplierId);
      await loadReorderSuggestions(); // Refresh suggestions
    } catch (error) {
      console.error("Error creating purchase order:", error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="secondary">High</Badge>;
      default:
        return <Badge variant="outline">Medium</Badge>;
    }
  };

  const criticalItems = reorderSuggestions.filter(item => item.priority === "critical");
  const highPriorityItems = reorderSuggestions.filter(item => item.priority === "high");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading inventory automation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {criticalItems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalItems.length} products are out of stock</strong> and need immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalItems.length}</p>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{highPriorityItems.length}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{reorderSuggestions.length}</p>
                <p className="text-xs text-muted-foreground">Reorder Needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">Auto</p>
                <p className="text-xs text-muted-foreground">Management</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Automated Reorder Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reorderSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-600">All Stock Levels Optimal</p>
              <p className="text-sm text-muted-foreground">No reorders needed at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reorderSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{suggestion.product_name}</h4>
                      {getPriorityBadge(suggestion.priority)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Current: </span>
                        {suggestion.current_stock}
                      </div>
                      <div>
                        <span className="font-medium">Reorder Point: </span>
                        {suggestion.reorder_point}
                      </div>
                      <div>
                        <span className="font-medium">Suggested Qty: </span>
                        {suggestion.suggested_quantity}
                      </div>
                    </div>
                    {suggestion.supplier && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Supplier: {suggestion.supplier}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant={suggestion.priority === "critical" ? "destructive" : "outline"}
                      onClick={() => {
                        if (suggestion.supplier_id) {
                          handleCreatePurchaseOrder([suggestion], suggestion.supplier_id);
                        } else {
                          toast({
                            variant: "destructive",
                            title: "No supplier configured",
                            description: "Please configure a supplier for this product first.",
                          });
                        }
                      }}
                    >
                      Create PO
                    </Button>
                  </div>
                </div>
              ))}
              
              {reorderSuggestions.length > 1 && (
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Group by supplier and create multiple POs
                      const groupedBySupplier = reorderSuggestions.reduce((acc, suggestion) => {
                        const supplierId = suggestion.supplier_id || "unknown";
                        if (!acc[supplierId]) acc[supplierId] = [];
                        acc[supplierId].push(suggestion);
                        return acc;
                      }, {} as any);
                      
                      Object.entries(groupedBySupplier).forEach(([supplierId, suggestions]: [string, any]) => {
                        if (supplierId !== "unknown") {
                          handleCreatePurchaseOrder(suggestions, supplierId);
                        }
                      });
                    }}
                  >
                    Create Purchase Orders for All Items
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAutomationPanel;
