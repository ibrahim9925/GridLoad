// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { usePurchaseOrderItems } from "@/hooks/usePurchaseOrderItems";
import { useProductsData } from "@/hooks/useProductsData";
import { useToast } from "@/hooks/use-toast";

interface PurchaseOrderItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  isReceiving?: boolean;
}

const PurchaseOrderItemsDialog = ({ 
  open, 
  onOpenChange, 
  purchaseOrderId, 
  isReceiving = false 
}: PurchaseOrderItemsDialogProps) => {
  const { items, isLoading, addItem, updateItem, removeItem, reloadItems, processReceiving } = usePurchaseOrderItems(purchaseOrderId);
  const { products } = useProductsData();
  const { toast } = useToast();
  
  const [newItem, setNewItem] = useState({
    product_id: "",
    quantity: 1,
    unit_cost: 0
  });

  useEffect(() => {
    if (open && purchaseOrderId) {
      reloadItems();
    }
  }, [open, purchaseOrderId, reloadItems]);

  const handleAddItem = async () => {
    if (!newItem.product_id || newItem.quantity <= 0 || newItem.unit_cost <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    try {
      await addItem({
        product_id: newItem.product_id,
        quantity: newItem.quantity,
        unit_cost: newItem.unit_cost,
        received_quantity: 0
      });
      
      setNewItem({ product_id: "", quantity: 1, unit_cost: 0 });
      toast({
        title: "Success",
        description: "Item added to purchase order.",
      });
    } catch (error) {
      console.error("Failed to add item:", error);
    }
  };

  const handleUpdateReceived = async (itemId: string, receivedQuantity: number) => {
    try {
      await updateItem(itemId, { received_quantity: receivedQuantity });
    } catch (error) {
      console.error("Failed to update received quantity:", error);
    }
  };

  const handleProcessReceiving = async () => {
    try {
      await processReceiving();
      toast({
        title: "Success",
        description: "Purchase order receiving processed. Inventory has been updated.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to process receiving:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalValue = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_cost), 0);
  };

  const getSelectedProduct = () => {
    return products.find(p => p.id === newItem.product_id);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReceiving ? "Process Purchase Order Receipt" : "Manage Purchase Order Items"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Items:</span> {items.length}
                </div>
                <div>
                  <span className="font-medium">Total Quantity:</span> {items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <div>
                  <span className="font-medium">Total Value:</span> {formatCurrency(getTotalValue())}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Item Section (only if not receiving) */}
          {!isReceiving && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Product</Label>
                    <Select
                      value={newItem.product_id}
                      onValueChange={(value) => setNewItem(prev => ({ ...prev, product_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.unit_cost}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <Button onClick={handleAddItem} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
                
                {getSelectedProduct() && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Selected Product Details:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">Name:</span> {getSelectedProduct()?.name}</div>
                      <div><span className="font-medium">SKU:</span> {getSelectedProduct()?.sku}</div>
                      <div><span className="font-medium">Current Stock:</span> {getSelectedProduct()?.current_stock || 0}</div>
                      <div><span className="font-medium">Category:</span> {getSelectedProduct()?.category || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items added to this purchase order yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Line Total</TableHead>
                      {isReceiving && <TableHead>Received</TableHead>}
                      {!isReceiving && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product?.name || 'Unknown Product'}</TableCell>
                        <TableCell>{item.product?.sku || 'N/A'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell>{formatCurrency(item.quantity * item.unit_cost)}</TableCell>
                        {isReceiving && (
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.received_quantity || 0}
                              onChange={(e) => handleUpdateReceived(item.id, Number(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                        )}
                        {!isReceiving && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {isReceiving && items.length > 0 && (
            <Button 
              onClick={handleProcessReceiving}
              disabled={items.every(item => (item.received_quantity || 0) === 0)}
            >
              Process Receipt
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderItemsDialog;