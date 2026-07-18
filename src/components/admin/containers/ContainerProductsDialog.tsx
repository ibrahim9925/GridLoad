// @ts-nocheck
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Package } from "lucide-react";
import { useContainerProducts } from "@/hooks/useContainerProducts";
import { Container } from "@/hooks/useContainers";

interface ContainerProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: Container | null;
}

const ContainerProductsDialog = ({ open, onOpenChange, container }: ContainerProductsDialogProps) => {
  const { containerProducts, addContainerProduct, updateContainerProduct, removeContainerProduct, processContainerArrival } = useContainerProducts(container?.id);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    quantity: 0,
    unit_cost: 0,
    warranty_start_serial: "",
    warranty_end_serial: "",
  });

  const handleAddProduct = async () => {
    if (!newProduct.product_name || newProduct.quantity <= 0 || newProduct.unit_cost <= 0) {
      return;
    }

    try {
      await addContainerProduct({
        ...newProduct,
        received_quantity: 0,
        container_id: container.id,
      });
      setNewProduct({
        product_name: "",
        quantity: 0,
        unit_cost: 0,
        warranty_start_serial: "",
        warranty_end_serial: "",
      });
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  const handleReceiveProduct = async (productId: string, receivedQty: number) => {
    try {
      await updateContainerProduct(productId, { received_quantity: receivedQty });
    } catch (error) {
      console.error("Failed to update received quantity:", error);
    }
  };

  const handleProcessArrival = async () => {
    if (!container) return;
    
    try {
      await processContainerArrival(container.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to process arrival:", error);
    }
  };

  if (!container) return null;

  const totalValue = containerProducts.reduce((sum, product) => sum + product.total_cost, 0);
  const allReceived = containerProducts.length > 0 && containerProducts.every(p => p.received_quantity >= p.quantity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {container.container_number} - Products
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Container Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Container Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{container.container_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium capitalize">{container.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Products:</span>
                  <p className="font-medium">{containerProducts.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Value:</span>
                  <p className="font-medium">${totalValue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Product to Container</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="Product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newProduct.quantity || ""}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.unit_cost || ""}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Start</Label>
                  <Input
                    value={newProduct.warranty_start_serial}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, warranty_start_serial: e.target.value }))}
                    placeholder="Serial start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty End</Label>
                  <Input
                    value={newProduct.warranty_end_serial}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, warranty_end_serial: e.target.value }))}
                    placeholder="Serial end"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleAddProduct}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Container Products</CardTitle>
            </CardHeader>
            <CardContent>
              {containerProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No products added to this container yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {containerProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.product_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Qty: {product.quantity} × ${product.unit_cost} = ${product.total_cost.toLocaleString()}
                        </p>
                        {product.warranty_start_serial && (
                          <p className="text-xs text-muted-foreground">
                            Warranty: {product.warranty_start_serial} - {product.warranty_end_serial}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Received:</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={product.received_quantity || ""}
                          onChange={(e) => handleReceiveProduct(product.id, parseInt(e.target.value) || 0)}
                          max={product.quantity}
                        />
                        <span className="text-xs text-muted-foreground">/ {product.quantity}</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeContainerProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {containerProducts.length > 0 && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button 
                onClick={handleProcessArrival}
                disabled={!allReceived || container.status === 'completed'}
                className="bg-green-600 hover:bg-green-700"
              >
                Process Container Arrival
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContainerProductsDialog;