// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Container } from '@/hooks/useContainers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Truck, Edit, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ContainerStatusUpdaterProps {
  container: Container;
  onStatusUpdate: () => void;
}

const statusFlow = [
  'ordered', 'confirmed', 'shipped', 'in_transit', 'port_arrival', 
  'customs_processing', 'customs_cleared', 'local_transit', 'out_for_delivery', 
  'delivered', 'completed'
] as const;

const statusLabels = {
  ordered: 'Ordered',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  in_transit: 'In Transit',
  port_arrival: 'Port Arrival',
  customs_processing: 'Customs Processing',
  customs_cleared: 'Customs Cleared',
  local_transit: 'Local Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
};

export const ContainerStatusUpdater: React.FC<ContainerStatusUpdaterProps> = ({
  container,
  onStatusUpdate,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Container['status']>(container.status);
  const [notes, setNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState(container.tracking_number || '');
  const [carrier, setCarrier] = useState(container.carrier || '');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    container.estimated_delivery_date ? format(new Date(container.estimated_delivery_date), 'yyyy-MM-dd') : ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const getCurrentStatusIndex = () => statusFlow.indexOf(container.status);
  const getNextStatuses = () => {
    const currentIndex = getCurrentStatusIndex();
    return statusFlow.slice(currentIndex, currentIndex + 3); // Allow current + next 2 statuses
  };

  const handleStatusUpdate = async () => {
    try {
      setIsUpdating(true);
      
      const updateData: Partial<Container> = {
        status: selectedStatus,
        tracking_number: trackingNumber || null,
        carrier: carrier || null,
        estimated_delivery_date: estimatedDeliveryDate || null,
      };

      // Remove empty strings to avoid overwriting existing data
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof Container] === '') {
          delete updateData[key as keyof Container];
        }
      });

      const { error } = await supabase
        .from('containers')
        .update(updateData)
        .eq('id', container.id);

      if (error) throw error;

      // Add status history entry with notes if provided
      if (notes) {
        await supabase
          .from('container_status_history')
          .insert({
            container_id: container.id,
            status: selectedStatus,
            notes: notes,
            automatic_change: false,
          });
      }

      toast({
        title: "Success",
        description: `Container status updated to ${statusLabels[selectedStatus]}.`,
      });

      setIsDialogOpen(false);
      setNotes('');
      onStatusUpdate();
    } catch (error: any) {
      console.error('Error updating container status:', error);
      toast({
        title: "Error",
        description: "Failed to update container status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered': return 'bg-gray-500';
      case 'confirmed': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'in_transit': return 'bg-orange-500';
      case 'port_arrival': return 'bg-yellow-500';
      case 'customs_processing': return 'bg-amber-500';
      case 'customs_cleared': return 'bg-green-500';
      case 'local_transit': return 'bg-indigo-500';
      case 'out_for_delivery': return 'bg-cyan-500';
      case 'delivered': return 'bg-emerald-500';
      case 'completed': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  const canUpdateStatus = (targetStatus: string) => {
    const currentIndex = getCurrentStatusIndex();
    const targetIndex = statusFlow.indexOf(targetStatus as any);
    return targetIndex >= currentIndex && targetIndex <= currentIndex + 2;
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Update Container Status
          </DialogTitle>
          <DialogDescription>
            Update the status and tracking information for container {container.container_number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <Badge className={`${getStatusColor(container.status)} text-white`}>
              {statusLabels[container.status]}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value: Container['status']) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getNextStatuses().map((status) => (
                  <SelectItem 
                    key={status} 
                    value={status}
                    disabled={!canUpdateStatus(status)}
                  >
                    {statusLabels[status]}
                    {status === container.status && ' (Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(selectedStatus === 'shipped' || selectedStatus === 'in_transit') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number</Label>
                <Input
                  id="tracking_number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="e.g., Maersk, COSCO, etc."
                />
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="estimated_delivery">Estimated Delivery Date</Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="estimated_delivery"
                type="date"
                value={estimatedDeliveryDate}
                onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this status change..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate} 
            disabled={isUpdating || selectedStatus === container.status}
          >
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};