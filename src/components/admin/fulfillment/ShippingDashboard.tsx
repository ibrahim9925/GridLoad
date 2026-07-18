// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Package, MapPin, Clock, Search, ExternalLink, Printer } from 'lucide-react';
import { useFulfillmentData } from '@/hooks/useFulfillmentData';
import { useFulfillmentOperations } from '@/hooks/useFulfillmentOperations';
import { format } from 'date-fns';

const carrierColors = {
  fedex: 'bg-purple-100 text-purple-800',
  ups: 'bg-yellow-100 text-yellow-800',
  dhl: 'bg-red-100 text-red-800',
  usps: 'bg-blue-100 text-blue-800',
  local_delivery: 'bg-green-100 text-green-800'
};

const carrierLogos = {
  fedex: '📦',
  ups: '🚚',
  dhl: '✈️',
  usps: '📮',
  local_delivery: '🏠'
};

export const ShippingDashboard = () => {
  const { orderFulfillments, isLoading } = useFulfillmentData();
  const [searchTerm, setSearchTerm] = useState('');

  const shippedOrders = orderFulfillments.filter(order => 
    order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered'
  );

  const readyToShip = orderFulfillments.filter(order => order.fulfillment_status === 'packed');

  const filteredOrders = shippedOrders.filter(order =>
    searchTerm === '' ||
    order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sale?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fulfillmentOps = useFulfillmentOperations();

  const generateShippingLabel = async (orderId: string) => {
    await fulfillmentOps.generateShippingLabel(orderId);
  };

  const trackPackage = (trackingNumber: string) => {
    fulfillmentOps.trackPackage(trackingNumber);
  };

  const markAsShipped = async (orderId: string) => {
    await fulfillmentOps.markAsShipped(orderId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shipping Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shipping Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{readyToShip.length}</div>
            <p className="text-xs text-muted-foreground">Packed and ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orderFulfillments.filter(order => order.fulfillment_status === 'shipped').length}
            </div>
            <p className="text-xs text-muted-foreground">On the way</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <MapPin className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orderFulfillments.filter(order => 
                order.fulfillment_status === 'delivered' && 
                order.delivered_at && 
                new Date(order.delivered_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transit Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">2.5d</div>
            <p className="text-xs text-muted-foreground">Days average</p>
          </CardContent>
        </Card>
      </div>

      {/* Ready to Ship */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Ready to Ship
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readyToShip.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No packages ready</h3>
              <p className="text-muted-foreground">Complete packing to see packages here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readyToShip.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      Order {order.sale?.invoice_number || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer?.contact_person || 'N/A'} • ${order.sale?.total_amount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Packed: {order.packed_at ? format(new Date(order.packed_at), 'MMM dd, HH:mm') : 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateShippingLabel(order.sale_id)}>
                      <Printer className="h-4 w-4 mr-1" />
                      Label
                    </Button>
                    <Button size="sm" onClick={() => markAsShipped(order.sale_id)}>
                      <Truck className="h-4 w-4 mr-1" />
                      Ship
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipped Orders Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Tracking
          </CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number, order, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm pl-10"
              />
            </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shipments found</h3>
              <p className="text-muted-foreground">No shipments match your search criteria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipped Date</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">
                        {order.sale?.invoice_number || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${order.sale?.total_amount?.toFixed(2) || '0.00'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {order.customer?.contact_person || 'N/A'}
                      </div>
                      {order.customer?.company_name && (
                        <div className="text-sm text-muted-foreground">
                          {order.customer.company_name}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {order.carrier && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {carrierLogos[order.carrier as keyof typeof carrierLogos] || '📦'}
                          </span>
                          <Badge 
                            className={carrierColors[order.carrier as keyof typeof carrierColors] || 'bg-gray-100 text-gray-800'}
                            variant="secondary"
                          >
                            {order.carrier.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {order.tracking_number ? (
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {order.tracking_number}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        className={order.fulfillment_status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                        variant="secondary"
                      >
                        {order.fulfillment_status === 'delivered' ? 'Delivered' : 'In Transit'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {order.shipped_at ? (
                        format(new Date(order.shipped_at), 'MMM dd, yyyy')
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {order.estimated_delivery ? (
                        format(new Date(order.estimated_delivery), 'MMM dd, yyyy')
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.tracking_number && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => trackPackage(order.tracking_number!)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Carrier Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Carrier Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">📦</div>
              <div className="font-semibold">FedEx</div>
              <div className="text-sm text-muted-foreground">98% On-time</div>
              <div className="text-sm text-muted-foreground">2.1 days avg</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">🚚</div>
              <div className="font-semibold">UPS</div>
              <div className="text-sm text-muted-foreground">96% On-time</div>
              <div className="text-sm text-muted-foreground">2.3 days avg</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-semibold">Local Delivery</div>
              <div className="text-sm text-muted-foreground">100% On-time</div>
              <div className="text-sm text-muted-foreground">Same day</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};