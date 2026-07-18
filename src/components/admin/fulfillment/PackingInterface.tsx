// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  CheckCircle, 
  Truck, 
  Weight,
  Ruler,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PackingOrder {
  id: string;
  sale_id: string;
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    product: {
      name: string;
      sku: string;
    };
  }>;
  customer: {
    contact_person: string;
    company_name?: string;
    address?: string;
  };
}

interface PackingInterfaceProps {
  onOrderComplete?: (orderId: string) => void;
}

const PackingInterface = ({ onOrderComplete }: PackingInterfaceProps) => {
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PackingOrder | null>(null);
  const [packingData, setPackingData] = useState({
    package_weight: '',
    package_dimensions: '',
    carrier_service: 'fedex',
    tracking_number: '',
    shipping_cost: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPackingOrders();
  }, []);

  const fetchPackingOrders = async () => {
    try {
      const { data: fulfillmentOrders, error } = await supabase
        .from('order_fulfillment')
        .select(`
          id,
          sale_id,
          fulfillment_status,
          created_at,
          sales!order_fulfillment_sale_id_fkey (
            id,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name,
              address
            ),
            sale_items!sale_items_sale_id_fkey (
              id,
              product_id,
              quantity,
              products!sale_items_product_id_fkey (
                name,
                sku
              )
            )
          )
        `)
        .eq('fulfillment_status', 'picking')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to match interface
      const transformedOrders = (fulfillmentOrders || []).map(order => ({
        id: order.id,
        sale_id: order.sale_id,
        status: order.fulfillment_status,
        created_at: order.created_at,
        customer: (order.sales as any)?.customers || { 
          contact_person: 'Unknown', 
          company_name: '',
          address: ''
        },
        items: ((order.sales as any)?.sale_items || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.products || { name: 'Unknown', sku: '' }
        }))
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching packing orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch packing orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPackingData(prev => ({ ...prev, [field]: value }));
  };

  const completePacking = async () => {
    if (!selectedOrder) return;

    try {
      // Create packing slip record
      const { error: packingError } = await supabase
        .from('packing_slips')
        .insert({
          sale_id: selectedOrder.sale_id,
          packed_by: (await supabase.auth.getUser()).data.user?.id,
          package_weight: parseFloat(packingData.package_weight) || null,
          package_dimensions: packingData.package_dimensions || null,
          carrier_service: packingData.carrier_service,
          tracking_number: packingData.tracking_number || null,
          shipping_cost: parseFloat(packingData.shipping_cost) || 0
        });

      if (packingError) throw packingError;

      // Update fulfillment status to 'packed'
      const { error: fulfillmentError } = await supabase
        .from('order_fulfillment')
        .update({ 
          fulfillment_status: 'packed',
          packed_at: new Date().toISOString(),
          package_weight: parseFloat(packingData.package_weight) || null,
          package_dimensions: packingData.package_dimensions || null,
          carrier_service: packingData.carrier_service,
          tracking_number: packingData.tracking_number || null,
          shipping_cost: parseFloat(packingData.shipping_cost) || 0,
          notes: packingData.notes
        })
        .eq('id', selectedOrder.id);

      if (fulfillmentError) throw fulfillmentError;

      toast({
        title: "Packing Complete",
        description: "Order has been packed and is ready for shipping",
      });

      onOrderComplete?.(selectedOrder.id);
      setSelectedOrder(null);
      setPackingData({
        package_weight: '',
        package_dimensions: '',
        carrier_service: 'fedex',
        tracking_number: '',
        shipping_cost: '',
        notes: ''
      });
      fetchPackingOrders();
    } catch (error) {
      console.error('Error completing packing:', error);
      toast({
        title: "Error",
        description: "Failed to complete packing",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading packing orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Orders Ready for Packing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No orders ready for packing
                </p>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{order.customer.contact_person}</h4>
                        {order.customer.company_name && (
                          <p className="text-sm text-muted-foreground">
                            {order.customer.company_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {order.items.length} items • Order #{order.sale_id.substring(0, 8)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        Ready to Pack
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Packing Interface */}
        {selectedOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pack Order - {selectedOrder.customer.contact_person}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items Summary */}
              <div>
                <h4 className="font-medium mb-2">Items to Pack:</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                      </div>
                      <Badge variant="outline">Qty: {item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Details */}
              <div className="space-y-3">
                <h4 className="font-medium">Package Details:</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={packingData.package_weight}
                        onChange={(e) => handleInputChange('package_weight', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="dimensions">Dimensions (LxWxH cm)</Label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="dimensions"
                        placeholder="30x20x15"
                        value={packingData.package_dimensions}
                        onChange={(e) => handleInputChange('package_dimensions', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="carrier">Carrier Service</Label>
                  <select
                    id="carrier"
                    value={packingData.carrier_service}
                    onChange={(e) => handleInputChange('carrier_service', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="fedex">FedEx</option>
                    <option value="dhl">DHL</option>
                    <option value="ups">UPS</option>
                    <option value="aramex">Aramex</option>
                    <option value="pickup">Customer Pickup</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="tracking"
                      placeholder="Enter tracking number"
                      value={packingData.tracking_number}
                      onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="shipping_cost">Shipping Cost ($)</Label>
                  <Input
                    id="shipping_cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={packingData.shipping_cost}
                    onChange={(e) => handleInputChange('shipping_cost', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Packing Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any special packing instructions or notes..."
                    value={packingData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Complete Button */}
              <Button 
                onClick={completePacking} 
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Packing
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PackingInterface;