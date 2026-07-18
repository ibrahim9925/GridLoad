// @ts-nocheck
import React from 'react';
import { Container } from '@/hooks/useContainers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Package, Truck, Ship, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface ContainerStatusTimelineProps {
  container: Container;
}

const statusConfig = {
  ordered: { label: 'Ordered', icon: Package, color: 'bg-gray-500', dateField: 'order_date' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-blue-500', dateField: 'confirmed_date' },
  shipped: { label: 'Shipped', icon: Ship, color: 'bg-purple-500', dateField: 'shipped_date' },
  in_transit: { label: 'In Transit', icon: Truck, color: 'bg-orange-500', dateField: 'in_transit_date' },
  port_arrival: { label: 'Port Arrival', icon: MapPin, color: 'bg-yellow-500', dateField: 'port_arrival_date' },
  customs_processing: { label: 'Customs Processing', icon: Clock, color: 'bg-amber-500', dateField: 'customs_start_date' },
  customs_cleared: { label: 'Customs Cleared', icon: CheckCircle, color: 'bg-green-500', dateField: 'customs_completion_date' },
  local_transit: { label: 'Local Transit', icon: Truck, color: 'bg-indigo-500', dateField: 'local_transit_start_date' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: 'bg-cyan-500', dateField: 'out_for_delivery_date' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-emerald-500', dateField: 'delivered_date' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-600', dateField: 'completed_date' },
};

const statusOrder = [
  'ordered', 'confirmed', 'shipped', 'in_transit', 'port_arrival', 
  'customs_processing', 'customs_cleared', 'local_transit', 'out_for_delivery', 
  'delivered', 'completed'
] as const;

export const ContainerStatusTimeline: React.FC<ContainerStatusTimelineProps> = ({ container }) => {
  const currentStatusIndex = statusOrder.indexOf(container.status);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return null;
    }
  };

  const getStatusDate = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const dateField = config.dateField as keyof Container;
    return formatDate(container[dateField] as string);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Container Lifecycle Timeline
        </CardTitle>
        <CardDescription>
          Track the complete journey of container {container.container_number}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusOrder.map((status, index) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            const isPassed = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const statusDate = getStatusDate(status);

            return (
              <div key={status} className="flex items-center space-x-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isPassed ? config.color : 'bg-gray-200'
                } transition-colors`}>
                  <Icon className={`h-4 w-4 ${isPassed ? 'text-white' : 'text-gray-400'}`} />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${isPassed ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {config.label}
                    </p>
                    {isCurrent && (
                      <Badge variant="outline" className="ml-2">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  {statusDate && (
                    <p className="text-xs text-muted-foreground">{statusDate}</p>
                  )}
                  
                  {status === 'in_transit' && container.tracking_number && (
                    <p className="text-xs text-muted-foreground">
                      Tracking: {container.tracking_number}
                    </p>
                  )}
                  
                  {status === 'shipped' && container.carrier && (
                    <p className="text-xs text-muted-foreground">
                      Carrier: {container.carrier}
                    </p>
                  )}
                </div>
                
                {index < statusOrder.length - 1 && (
                  <div className={`ml-4 h-8 w-px ${isPassed ? 'bg-primary' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        
        {container.estimated_delivery_date && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Clock className="inline h-4 w-4 mr-1" />
              Estimated Delivery: {formatDate(container.estimated_delivery_date)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};