// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, User, MapPin, Calendar, Search, Eye, ArrowRight } from 'lucide-react';
import { useFulfillmentData } from '@/hooks/useFulfillmentData';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-orange-100 text-orange-800',
  picking: 'bg-blue-100 text-blue-800', 
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  pending: 'Pending',
  picking: 'Picking',
  packed: 'Packed',
  shipped: 'Shipped', 
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const OrderFulfillmentDashboard = () => {
  const { orderFulfillments, isLoading, updateFulfillmentStatus } = useFulfillmentData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = orderFulfillments.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.sale?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.fulfillment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (saleId: string, newStatus: string) => {
    await updateFulfillmentStatus(saleId, newStatus as "pending" | "picking" | "packed" | "shipped" | "delivered" | "cancelled");
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = ['pending', 'picking', 'packed', 'shipped', 'delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Fulfillment Dashboard</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Fulfillment Pipeline
        </CardTitle>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="picking">Picking</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">No orders match your current filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const nextStatus = getNextStatus(order.fulfillment_status);
                
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium">
                        {order.sale?.invoice_number || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {order.sale_id.slice(0, 8)}...
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
                      <Badge 
                        className={statusColors[order.fulfillment_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                        variant="secondary"
                      >
                        {statusLabels[order.fulfillment_status as keyof typeof statusLabels] || order.fulfillment_status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        ${order.sale?.total_amount?.toFixed(2) || '0.00'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {order.sale?.sale_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(order.sale.sale_date), 'MMM dd, yyyy')}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {order.assigned_staff ? (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {order.assigned_staff.full_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {nextStatus && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusChange(order.sale_id, nextStatus)}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            {statusLabels[nextStatus as keyof typeof statusLabels]}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};