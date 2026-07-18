// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Search,
  Scan,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PickingItem {
  id: string;
  product_id: string;
  quantity: number;
  picked_quantity: number;
  product: {
    name: string;
    sku: string;
    current_stock: number;
  };
}

interface PickingOrder {
  id: string;
  sale_id: string;
  status: string;
  created_at: string;
  items: PickingItem[];
  customer: {
    contact_person: string;
    company_name?: string;
  };
}

interface PickingInterfaceProps {
  onOrderComplete?: (orderId: string) => void;
}

const PickingInterface = ({ onOrderComplete }: PickingInterfaceProps) => {
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPickingOrders();
  }, []);

  const fetchPickingOrders = async () => {
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
              company_name
            ),
            sale_items!sale_items_sale_id_fkey (
              id,
              product_id,
              quantity,
              products!sale_items_product_id_fkey (
                name,
                sku,
                current_stock
              )
            )
          )
        `)
        .eq('fulfillment_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to match interface
      const transformedOrders = (fulfillmentOrders || []).map(order => ({
        id: order.id,
        sale_id: order.sale_id,
        status: order.fulfillment_status,
        created_at: order.created_at,
        customer: (order.sales as any)?.customers || { contact_person: 'Unknown', company_name: '' },
        items: ((order.sales as any)?.sale_items || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          picked_quantity: 0,
          product: item.products || { name: 'Unknown', sku: '', current_stock: 0 }
        }))
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching picking orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch picking orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanInput = (value: string) => {
    setScanInput(value);
    if (selectedOrder && value) {
      // Find item by SKU or product name
      const item = selectedOrder.items.find(
        item => item.product.sku === value || item.product.name.toLowerCase().includes(value.toLowerCase())
      );
      
      if (item) {
        updatePickedQuantity(item.id, item.picked_quantity + 1);
        setScanInput('');
        toast({
          title: "Item Scanned",
          description: `Added ${item.product.name} to picking list`,
        });
      }
    }
  };

  const updatePickedQuantity = (itemId: string, newQuantity: number) => {
    if (!selectedOrder) return;
    
    const updatedItems = selectedOrder.items.map(item => 
      item.id === itemId 
        ? { ...item, picked_quantity: Math.min(newQuantity, item.quantity) }
        : item
    );
    
    setSelectedOrder({
      ...selectedOrder,
      items: updatedItems
    });
  };

  const completeOrder = async () => {
    if (!selectedOrder) return;

    try {
      // Check if all items are picked
      const allItemsPicked = selectedOrder.items.every(item => 
        item.picked_quantity === item.quantity
      );

      if (!allItemsPicked) {
        toast({
          title: "Incomplete Picking",
          description: "Please pick all items before completing the order",
          variant: "destructive",
        });
        return;
      }

      // Update fulfillment status to 'picked'
      const { error } = await supabase
        .from('order_fulfillment')
        .update({ 
          fulfillment_status: 'picking',
          picking_started_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Order Complete",
        description: "Order has been successfully picked and is ready for packing",
      });

      onOrderComplete?.(selectedOrder.id);
      setSelectedOrder(null);
      setNotes('');
      fetchPickingOrders();
    } catch (error) {
      console.error('Error completing order:', error);
      toast({
        title: "Error",
        description: "Failed to complete picking order",
        variant: "destructive",
      });
    }
  };

  const getItemStatus = (item: PickingItem) => {
    if (item.picked_quantity === 0) return 'pending';
    if (item.picked_quantity < item.quantity) return 'partial';
    return 'complete';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      partial: 'default',
      complete: 'default'
    } as const;
    
    const icons = {
      pending: Clock,
      partial: AlertTriangle,
      complete: CheckCircle
    };
    
    const Icon = icons[status as keyof typeof icons] || Clock;
    
    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading picking orders...</p>
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
              Orders Ready for Picking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No orders ready for picking
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
                      <Badge variant="outline">
                        {new Date(order.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Picking Interface */}
        {selectedOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Pick Items - {selectedOrder.customer.contact_person}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scan Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Scan or search item SKU/name..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleScanInput(scanInput);
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => handleScanInput(scanInput)}>
                  Add
                </Button>
              </div>

              {/* Items to Pick */}
              <div className="space-y-3">
                <h4 className="font-medium">Items to Pick:</h4>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product.sku} • Stock: {item.product.current_stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePickedQuantity(item.id, item.picked_quantity - 1)}
                          disabled={item.picked_quantity === 0}
                        >
                          -
                        </Button>
                        <span className="text-sm font-medium min-w-[60px] text-center">
                          {item.picked_quantity} / {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePickedQuantity(item.id, item.picked_quantity + 1)}
                          disabled={item.picked_quantity >= item.quantity}
                        >
                          +
                        </Button>
                      </div>
                      {getStatusBadge(getItemStatus(item))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium">Picking Notes:</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the picking process..."
                  className="mt-1"
                />
              </div>

              {/* Complete Button */}
              <Button 
                onClick={completeOrder} 
                className="w-full"
                disabled={!selectedOrder.items.every(item => item.picked_quantity === item.quantity)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Picking
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PickingInterface;