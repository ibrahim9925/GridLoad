// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSuppliers } from "@/hooks/useSuppliers";
import { Container } from "@/hooks/useContainers";

interface ContainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: Container | null;
  onSave: (container: any) => void;
}

const ContainerDialog = ({ open, onOpenChange, container, onSave }: ContainerDialogProps) => {
  const { suppliers } = useSuppliers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    container_number: "",
    container_type: "20ft" as "20ft" | "40ft",
    supplier_id: "",
    order_date: new Date(),
    expected_arrival_date: null as Date | null,
    status: "ordered" as Container['status'],
    customs_cleared: false,
    total_cost: 0,
    clearance_cost: 0,
    transportation_cost: 0,
    customs_fees: 0,
    notes: "",
  });

  useEffect(() => {
    if (container) {
      setFormData({
        container_number: container.container_number,
        container_type: container.container_type,
        supplier_id: container.supplier_id,
        order_date: new Date(container.order_date),
        expected_arrival_date: container.expected_arrival_date ? new Date(container.expected_arrival_date) : null,
        status: container.status,
        customs_cleared: container.customs_cleared,
        total_cost: Number(container.total_cost || 0),
        clearance_cost: Number(container.clearance_cost || 0),
        transportation_cost: Number(container.transportation_cost || 0),
        customs_fees: Number(container.customs_fees || 0),
        notes: container.notes || "",
      });
    } else {
      setFormData({
        container_number: "",
        container_type: "20ft",
        supplier_id: "",
        order_date: new Date(),
        expected_arrival_date: null,
        status: "ordered",
        customs_cleared: false,
        total_cost: 0,
        clearance_cost: 0,
        transportation_cost: 0,
        customs_fees: 0,
        notes: "",
      });
    }
  }, [container, open]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.container_number?.trim() || !formData.supplier_id) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        order_date: formData.order_date.toISOString().split('T')[0],
        expected_arrival_date: formData.expected_arrival_date?.toISOString().split('T')[0] || null,
      };
      
      await onSave(container ? { ...submitData, id: container.id } : submitData);
      onOpenChange(false);
    } catch (error) {
      console.error("Container save failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {container ? `Edit Container: ${container.container_number}` : "Create New Container"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="container_number">Container Number *</Label>
              <Input
                id="container_number"
                value={formData.container_number}
                onChange={(e) => handleInputChange("container_number", e.target.value)}
                placeholder="e.g., TCLU1234567"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="container_type">Container Type</Label>
              <Select
                value={formData.container_type}
                onValueChange={(value) => handleInputChange("container_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft">20ft Container</SelectItem>
                  <SelectItem value="40ft">40ft Container</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_id">Supplier *</Label>
            <Select
              value={formData.supplier_id}
              onValueChange={(value) => handleInputChange("supplier_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} - {supplier.contact_person}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order Date</Label>
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
                    {formData.order_date ? format(formData.order_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.order_date}
                    onSelect={(date) => handleInputChange("order_date", date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Expected Arrival Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expected_arrival_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_arrival_date ? format(formData.expected_arrival_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expected_arrival_date}
                    onSelect={(date) => handleInputChange("expected_arrival_date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_cost">Total Cost (Goods)</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_cost || ''}
                onChange={(e) => handleInputChange("total_cost", e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Cost of goods"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clearance_cost">Clearance Cost</Label>
              <Input
                id="clearance_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.clearance_cost || ''}
                onChange={(e) => handleInputChange("clearance_cost", e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Clearance fees"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transportation_cost">Transportation Cost</Label>
              <Input
                id="transportation_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.transportation_cost || ''}
                onChange={(e) => handleInputChange("transportation_cost", e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Shipping / transport"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customs_fees">Customs Fees</Label>
              <Input
                id="customs_fees"
                type="number"
                step="0.01"
                min="0"
                value={formData.customs_fees || ''}
                onChange={(e) => handleInputChange("customs_fees", e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="Customs duties"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Additional notes about this container..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (container ? "Update Container" : "Create Container")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContainerDialog;