// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder?: any;
}

export const PurchaseOrderDialog: React.FC<PurchaseOrderDialogProps> = ({
  open,
  onOpenChange,
  purchaseOrder
}) => {
  const { createPurchaseOrder, updatePurchaseOrder } = usePurchaseOrders();
  const { suppliers } = useSuppliers();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: purchaseOrder?.supplier_id || '',
    order_number: purchaseOrder?.order_number || `PO-${Date.now()}`,
    order_date: purchaseOrder?.order_date ? new Date(purchaseOrder.order_date) : new Date(),
    expected_delivery_date: purchaseOrder?.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date) : null,
    subtotal: Number(purchaseOrder?.subtotal || 0),
    tax_amount: Number(purchaseOrder?.tax_amount || 0),
    total_amount: Number(purchaseOrder?.total_amount || 0),
    status: purchaseOrder?.status || 'draft',
    notes: purchaseOrder?.notes || '',
  });

  // Automatic total calculation
  useEffect(() => {
    const newTotal = Number(formData.subtotal) + Number(formData.tax_amount);
    if (newTotal !== formData.total_amount) {
      setFormData(prev => ({
        ...prev,
        total_amount: newTotal
      }));
    }
  }, [formData.subtotal, formData.tax_amount]);
  
  const [showItemsDialog, setShowItemsDialog] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation with authentication check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create purchase orders.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.supplier_id) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier.",
        variant: "destructive",
      });
      return;
    }
    
    if (Number(formData.subtotal) <= 0) {
      toast({
        title: "Validation Error", 
        description: "Subtotal must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        subtotal: Number(formData.subtotal),
        tax_amount: Number(formData.tax_amount),
        total_amount: Number(formData.total_amount),
        order_date: format(formData.order_date, 'yyyy-MM-dd'),
        expected_delivery_date: formData.expected_delivery_date 
          ? format(formData.expected_delivery_date, 'yyyy-MM-dd') 
          : null,
      };

      if (purchaseOrder) {
        await updatePurchaseOrder(purchaseOrder.id, submitData);
      } else {
        await createPurchaseOrder(submitData);
        // Reset form for new order
        setFormData({
          supplier_id: '',
          order_number: `PO-${Date.now()}`,
          order_date: new Date(),
          expected_delivery_date: null,
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          status: 'draft',
          notes: '',
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save purchase order. Please check all fields and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchaseOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number *</Label>
              <Input
                id="order_number"
                value={formData.order_number}
                onChange={(e) => handleInputChange('order_number', e.target.value)}
                placeholder="Enter order number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(value) => handleInputChange('supplier_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Order Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.order_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.order_date ? format(formData.order_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.order_date}
                    onSelect={(date) => handleInputChange('order_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expected_delivery_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_delivery_date 
                      ? format(formData.expected_delivery_date, "PPP") 
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expected_delivery_date}
                    onSelect={(date) => handleInputChange('expected_delivery_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal *</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                min="0"
                value={formData.subtotal || ''}
                onChange={(e) => handleInputChange('subtotal', e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Enter subtotal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_amount">Tax Amount</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.tax_amount || ''}
                onChange={(e) => handleInputChange('tax_amount', e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Enter tax amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount (Calculated)</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount || ''}
                readOnly
                className="bg-muted"
                placeholder="Automatically calculated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : purchaseOrder ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};