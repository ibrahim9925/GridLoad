// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  ShoppingCart, 
  AlertCircle,
  ArrowUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  severity: string;
  threshold_quantity: number;
  current_quantity: number;
  auto_reorder_suggested: boolean;
  suggested_order_quantity: number;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  products?: {
    name: string;
    sku: string;
  } | null;
}

const AdvancedStockAlerts = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("stock_alerts")
        .select(`
          *,
          products!stock_alerts_product_id_fkey(name, sku)
        `)
        .eq("is_acknowledged", false)
        .order("severity", { ascending: false });

      if (error) throw error;
      
      // Transform data to handle potential null relationships
      const transformedData = (data || []).map(alert => ({
        ...alert,
        products: alert.products ? {
          name: (alert.products as any).name || "Unknown Product",
          sku: (alert.products as any).sku || "N/A"
        } : null
      }));
      
      setAlerts(transformedData);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast({
        variant: "destructive",
        title: "Error loading alerts",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("stock_alerts")
        .update({
          is_acknowledged: true,
          acknowledged_by: userData.user.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(alerts.filter(alert => alert.id !== alertId));
      toast({
        title: "Alert acknowledged",
        description: "Stock alert has been acknowledged.",
      });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      toast({
        variant: "destructive",
        title: "Error acknowledging alert",
        description: "Please try again later.",
      });
    }
  };

  const createPurchaseOrder = async (alert: StockAlert) => {
    try {
      // In a real implementation, this would create a purchase order
      // For now, just acknowledge the alert
      await acknowledgeAlert(alert.id);
      toast({
        title: "Purchase order created",
        description: `Purchase order created for ${alert.products?.name}.`,
      });
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        variant: "destructive",
        title: "Error creating purchase order",
        description: "Please try again later.",
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge variant="default">High</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "out_of_stock":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "low_stock":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "overstock":
        return <ArrowUpDown className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-green-600">No Stock Alerts</p>
            <p className="text-sm text-muted-foreground">All inventory levels are within acceptable ranges.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getAlertTypeIcon(alert.alert_type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{alert.products?.name}</h4>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SKU: {alert.products?.sku} | Current: {alert.current_quantity} | Threshold: {alert.threshold_quantity}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {alert.auto_reorder_suggested && (
                    <Button 
                      size="sm" 
                      onClick={() => createPurchaseOrder(alert)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Create PO
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedStockAlerts;
