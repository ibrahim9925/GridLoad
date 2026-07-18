// @ts-nocheck

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface WarrantyDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  saleId?: string;
  productId?: string;
  customerId?: string;
  onSuccess?: () => void;
  warranty?: any;
}

const WarrantyDialog = ({ open: externalOpen, onOpenChange, saleId, productId, customerId, onSuccess }: WarrantyDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    serial_number: "",
    warranty_period_months: 12,
    warranty_type: "manufacturer",
    notes: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      // Calculate warranty end date
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + formData.warranty_period_months);
      
      const warrantyData = {
        serial_number: formData.serial_number,
        warranty_period_months: formData.warranty_period_months,
        warranty_type: formData.warranty_type,
        warranty_start_date: startDate.toISOString().split('T')[0],
        warranty_end_date: endDate.toISOString().split('T')[0],
        notes: formData.notes || null,
        sale_id: saleId || null,
        product_id: productId || null,
        customer_id: customerId || null,
        registered_by: session.session?.user?.id || null
      };

      const { error } = await supabase
        .from('warranties')
        .insert(warrantyData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Warranty registered successfully",
      });

      setOpen(false);
      setFormData({
        serial_number: "",
        warranty_period_months: 12,
        warranty_type: "manufacturer",
        notes: ""
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Register Warranty
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register Warranty</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number *</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              required
              placeholder="Enter serial number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_period">Warranty Period (Months)</Label>
            <Input
              id="warranty_period"
              type="number"
              value={formData.warranty_period_months}
              onChange={(e) => setFormData({ ...formData, warranty_period_months: parseInt(e.target.value) })}
              min="1"
              max="120"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="warranty_type">Warranty Type</Label>
            <Select
              value={formData.warranty_type}
              onValueChange={(value) => setFormData({ ...formData, warranty_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional warranty notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register Warranty"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WarrantyDialog;
