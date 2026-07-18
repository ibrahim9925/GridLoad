// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Search, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useContainerProducts } from "@/hooks/useContainerProducts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContainerArrivalWizard } from "./ContainerArrivalWizard";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface Product {
  id: string;
  name: string;
  warranty_months: number;
  cost_price: number;
}

interface ContainerProduct {
  id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  warranty_start_serial?: string;
  warranty_end_serial?: string;
  received_quantity: number;
  warranty_start_date?: Date;
  warranty_end_date?: Date;
}

interface EnhancedContainerProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: any;
}

const EnhancedContainerProductsDialog = ({ open, onOpenChange, container }: EnhancedContainerProductsDialogProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<ContainerProduct>({
    product_name: '',
    quantity: 0,
    unit_cost: 0,
    total_cost: 0,
    received_quantity: 0,
    warranty_start_date: undefined,
    warranty_end_date: undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();
  const { containerProducts, processContainerArrival, refetch } = useContainerProducts(container?.id);

  useEffect(() => {
    if (open) {
      fetchProducts();
      refetch();
    }
  }, [open, container]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, warranty_months, cost_price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };


  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setNewProduct({
      ...newProduct,
      product_id: product.id,
      product_name: product.name,
      unit_cost: product.cost_price || 0,
      total_cost: newProduct.quantity * (product.cost_price || 0),
      warranty_start_date: container?.expected_arrival_date ? new Date(container.expected_arrival_date) : new Date(),
      warranty_end_date: container?.expected_arrival_date && product.warranty_months 
        ? new Date(new Date(container.expected_arrival_date).setMonth(new Date(container.expected_arrival_date).getMonth() + product.warranty_months))
        : undefined,
    });
    setSearchOpen(false);
  };

  const handleNewProductEntry = () => {
    setSelectedProduct(null);
    setNewProduct({
      product_name: '',
      quantity: 0,
      unit_cost: 0,
      total_cost: 0,
      received_quantity: 0,
      warranty_start_date: container?.expected_arrival_date ? new Date(container.expected_arrival_date) : new Date(),
      warranty_end_date: undefined,
    });
  };

  const calculateWarrantyEndDate = (startDate: Date, warrantyMonths: number) => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + warrantyMonths);
    return endDate;
  };

  const handleWarrantyStartDateChange = (date: Date | undefined) => {
    setNewProduct(prev => {
      const warrantyMonths = selectedProduct?.warranty_months || 12;
      return {
        ...prev,
        warranty_start_date: date,
        warranty_end_date: date ? calculateWarrantyEndDate(date, warrantyMonths) : undefined,
      };
    });
  };

  const handleQuantityChange = (quantity: number) => {
    setNewProduct(prev => ({
      ...prev,
      quantity,
      total_cost: quantity * prev.unit_cost,
    }));
  };

  const handleUnitCostChange = (unitCost: number) => {
    setNewProduct(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: prev.quantity * unitCost,
    }));
  };

  const addProduct = async () => {
    if (!container?.id || !newProduct.product_name || newProduct.quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    setIsLoading(true);
    try {
      const productData = {
        container_id: container.id,
        product_id: selectedProduct?.id || null,
        product_name: newProduct.product_name,
        quantity: newProduct.quantity,
        unit_cost: newProduct.unit_cost,
        total_cost: newProduct.total_cost,
        received_quantity: newProduct.received_quantity,
        warranty_start_serial: newProduct.warranty_start_serial || null,
        warranty_end_serial: newProduct.warranty_end_serial || null,
      };

      const { error } = await supabase
        .from('container_products')
        .insert([productData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setNewProduct({
        product_name: '',
        quantity: 0,
        unit_cost: 0,
        total_cost: 0,
        received_quantity: 0,
      });
      setSelectedProduct(null);
      refetch();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add product",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('container_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product removed successfully",
      });
      refetch();
    } catch (error) {
      console.error('Error removing product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove product",
      });
    }
  };

  const totalValue = containerProducts.reduce((sum, product) => sum + product.total_cost, 0);

  const [showArrivalWizard, setShowArrivalWizard] = useState(false);
  
  const handleProcessArrival = () => {
    setShowArrivalWizard(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Container Products - {container?.container_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Product Section */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Product</h3>
                <div className="flex gap-2">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-1" />
                        Find Existing
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No products found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((product) => (
                              <CommandItem
                                key={product.id}
                                onSelect={() => handleProductSelect(product)}
                                className="cursor-pointer"
                              >
                                <Package className="mr-2 h-4 w-4" />
                                <div>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    ${product.cost_price} • {product.warranty_months}mo warranty
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="sm" onClick={handleNewProductEntry}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Product
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                {selectedProduct && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="font-medium">{selectedProduct.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Cost: ${selectedProduct.cost_price} • Warranty: {selectedProduct.warranty_months} months
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="product_name">Product Name</Label>
                  <Input
                    id="product_name"
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newProduct.quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit Cost ($)</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.unit_cost}
                      onChange={(e) => handleUnitCostChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warranty_start_serial">Warranty Start Serial</Label>
                    <Input
                      id="warranty_start_serial"
                      value={newProduct.warranty_start_serial || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, warranty_start_serial: e.target.value })}
                      placeholder="e.g., WS001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty_end_serial">Warranty End Serial</Label>
                    <Input
                      id="warranty_end_serial"
                      value={newProduct.warranty_end_serial || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, warranty_end_serial: e.target.value })}
                      placeholder="e.g., WS050"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warranty Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newProduct.warranty_start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newProduct.warranty_start_date 
                            ? format(newProduct.warranty_start_date, "PPP")
                            : "Pick a date"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newProduct.warranty_start_date}
                          onSelect={handleWarrantyStartDateChange}
                          className="pointer-events-auto"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Warranty End Date</Label>
                    <div className="p-2 border rounded-md bg-muted text-sm">
                      {newProduct.warranty_end_date 
                        ? format(newProduct.warranty_end_date, "PPP")
                        : "Auto-calculated"
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Cost</Label>
                  <div className="p-2 border rounded-md bg-muted font-medium">
                    ${newProduct.total_cost.toFixed(2)}
                  </div>
                </div>

                <Button 
                  onClick={addProduct} 
                  disabled={isLoading || !newProduct.product_name || newProduct.quantity <= 0}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Container Contents</h3>
              <Badge variant="outline">
                {containerProducts.length} products • ${totalValue.toFixed(2)} total
              </Badge>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {containerProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products added yet
                </div>
              ) : (
                containerProducts.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {product.quantity} × ${product.unit_cost} = ${product.total_cost}
                          </div>
                           {(product.warranty_start_serial || product.warranty_end_serial) && (
                            <div className="text-xs text-muted-foreground">
                              Serial: {product.warranty_start_serial} - {product.warranty_end_serial}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeProduct(product.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Action Buttons */}
            {containerProducts.length > 0 && container?.status !== 'completed' && (
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Ready to process container arrival?
                </div>
                <Button 
                  onClick={handleProcessArrival}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Process Container Arrival
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <ContainerArrivalWizard 
        open={showArrivalWizard}
        onOpenChange={setShowArrivalWizard}
        container={container}
        onProcessed={() => {
          refetch();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
};

export default EnhancedContainerProductsDialog;