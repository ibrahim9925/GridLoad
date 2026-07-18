// @ts-nocheck
import React, { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useSuppliers } from '@/hooks/useSuppliers';

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: any;
}

export const SupplierDialog: React.FC<SupplierDialogProps> = ({
  open,
  onOpenChange,
  supplier
}) => {
  const { createSupplier, updateSupplier } = useSuppliers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    payment_terms: supplier?.payment_terms || 'net_30',
    lead_time_days: supplier?.lead_time_days || 7,
    quality_rating: supplier?.quality_rating || 5.0,
    delivery_rating: supplier?.delivery_rating || 5.0,
    min_order_amount: supplier?.min_order_amount || 0,
    is_active: supplier?.is_active ?? true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (supplier) {
        await updateSupplier(supplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        payment_terms: 'net_30',
        lead_time_days: 7,
        quality_rating: 5.0,
        delivery_rating: 5.0,
        min_order_amount: 0,
        is_active: true,
      });
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Edit Supplier' : 'Add New Supplier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person *</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                placeholder="Enter contact person name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Select 
                value={formData.payment_terms} 
                onValueChange={(value) => handleInputChange('payment_terms', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_45">Net 45</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
              <Input
                id="lead_time_days"
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => handleInputChange('lead_time_days', parseInt(e.target.value) || 0)}
                placeholder="Enter lead time in days"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality_rating">Quality Rating (1-5)</Label>
              <Input
                id="quality_rating"
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.quality_rating}
                onChange={(e) => handleInputChange('quality_rating', parseFloat(e.target.value) || 5.0)}
                placeholder="Enter quality rating"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_rating">Delivery Rating (1-5)</Label>
              <Input
                id="delivery_rating"
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.delivery_rating}
                onChange={(e) => handleInputChange('delivery_rating', parseFloat(e.target.value) || 5.0)}
                placeholder="Enter delivery rating"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order_amount">Minimum Order Amount</Label>
              <Input
                id="min_order_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.min_order_amount}
                onChange={(e) => handleInputChange('min_order_amount', parseFloat(e.target.value) || 0)}
                placeholder="Enter minimum order amount"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Active Supplier</Label>
            </div>
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
              {isSubmitting ? 'Saving...' : supplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};