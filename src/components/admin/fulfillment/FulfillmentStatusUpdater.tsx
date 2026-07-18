// @ts-nocheck
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Truck, CheckCircle } from 'lucide-react';

interface FulfillmentStatusUpdaterProps {
  saleId: string;
  currentStatus: string;
  onStatusUpdate?: (newStatus: string) => void;
}

const FulfillmentStatusUpdater: React.FC<FulfillmentStatusUpdaterProps> = ({
  saleId,
  currentStatus,
  onStatusUpdate
}) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const statusOptions = [
    { value: 'pending' as const, label: 'Pending', icon: Package, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'picking' as const, label: 'Picking', icon: Package, color: 'bg-blue-100 text-blue-800' },
    { value: 'packed' as const, label: 'Packed', icon: Package, color: 'bg-blue-100 text-blue-800' },
    { value: 'shipped' as const, label: 'Shipped', icon: Truck, color: 'bg-purple-100 text-purple-800' },
    { value: 'delivered' as const, label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  ];

  const updateFulfillmentStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      // Update sales record
      const { error: salesError } = await supabase
        .from('sales')
        .update({ 
          fulfillment_status: newStatus as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (salesError) throw salesError;

      // Update or create order fulfillment record
      const { error: fulfillmentError } = await supabase
        .from('order_fulfillment')
        .upsert({
          sale_id: saleId,
          fulfillment_status: newStatus as any,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'picking' && { picking_started_at: new Date().toISOString() }),
          ...(newStatus === 'shipped' && { shipped_at: new Date().toISOString() }),
          ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
        }, {
          onConflict: 'sale_id'
        });

      if (fulfillmentError) throw fulfillmentError;

      toast({
        title: "Status Updated",
        description: `Fulfillment status updated to ${newStatus}`,
      });

      onStatusUpdate?.(newStatus);
    } catch (error) {
      console.error('Error updating fulfillment status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update fulfillment status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCurrentStatusConfig = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0];
  };

  const statusConfig = getCurrentStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Fulfillment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Update Status:</label>
          <Select
            value={currentStatus}
            onValueChange={updateFulfillmentStatus}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Status Workflow:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              <span>Pending → Order received and confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              <span>Processing → Items being picked and packed</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-3 w-3" />
              <span>Shipped → Package dispatched to customer</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>Delivered → Package received by customer</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FulfillmentStatusUpdater;