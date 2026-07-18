// @ts-nocheck
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, Trash2, Package, Plus, CheckCircle, Clock } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { format } from "date-fns";
import PurchaseOrderItemsDialog from "./PurchaseOrderItemsDialog";
import { PurchaseOrderDialog } from "./PurchaseOrderDialog";
import { DeleteConfirmationDialog } from "@/components/admin/DeleteConfirmationDialog";
import { useDeletionImpactAnalysis } from "@/hooks/useDeletionImpactAnalysis";
import { BulkDeletePurchaseOrders } from "./BulkDeletePurchaseOrders";

const PurchaseOrdersSection = () => {
  const { purchaseOrders, isLoading, deletePurchaseOrder, updatePurchaseOrder } = usePurchaseOrders();
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [receivingMode, setReceivingMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { 
    isAnalyzing, 
    analyzePurchaseOrderDeletion 
  } = useDeletionImpactAnalysis();
  
  const [impactAnalysis, setImpactAnalysis] = useState<any>(null);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'received':
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'in_transit':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleDeleteClick = async (order: any) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
    
    // Analyze deletion impact
    try {
      const analysis = await analyzePurchaseOrderDeletion(order.id);
      setImpactAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await deletePurchaseOrder(orderToDelete.id);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      setImpactAnalysis(null);
    } catch (error) {
      console.error('Failed to delete purchase order:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
    setImpactAnalysis(null);
  };

  const handleManageItems = (orderId: string, isReceiving = false) => {
    setSelectedOrderId(orderId);
    setReceivingMode(isReceiving);
    setItemsDialogOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  };

  const handleConfirmArrival = async (orderId: string) => {
    if (window.confirm('Confirm that this container/order has arrived?')) {
      await updatePurchaseOrder(orderId, { 
        status: 'received',
        actual_delivery_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BulkDeletePurchaseOrders purchaseOrders={purchaseOrders} />
      
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase orders found. Create your first purchase order to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.supplier_name || 'Unknown Supplier'}</TableCell>
                    <TableCell>
                      {order.container_id ? (
                        <Badge variant="secondary" className="text-xs">
                          {order.container_number || 'Container Assigned'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No Container
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(order.order_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy') : 'Not set'}
                    </TableCell>
                    <TableCell>${order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{order.items_count || 0} items</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageItems(order.id)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status?.toUpperCase() || 'DRAFT'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewOrder(order)}
                          title="View Order"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEditOrder(order)}
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleConfirmArrival(order.id)}
                            title="Confirm Arrival"
                            className="text-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {order.status === 'received' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleManageItems(order.id, true)}
                            title="Process Receipt"
                            className="text-primary"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteClick(order)}
                          className="text-destructive hover:text-destructive"
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PurchaseOrderItemsDialog
        open={itemsDialogOpen}
        onOpenChange={setItemsDialogOpen}
        purchaseOrderId={selectedOrderId}
        isReceiving={receivingMode}
      />

      <PurchaseOrderDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        purchaseOrder={selectedOrder}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Purchase Order"
        itemName={orderToDelete?.order_number}
        isLoading={isDeleting}
        impactAnalysis={impactAnalysis}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
};

export default PurchaseOrdersSection;