// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, Container, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useContainers } from "@/hooks/useContainers";

interface EnhancedPurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export const EnhancedPurchaseOrderDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData
}: EnhancedPurchaseOrderDialogProps) => {
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_number: "",
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: "",
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    shipping_cost: 0,
    status: "draft",
    notes: "",
    cbm_volume: 0,
    pallet_count: null,
    cbm_per_pallet: null,
    container_assignment: "none" // none, existing, new
  });

  const [selectedContainerId, setSelectedContainerId] = useState("");
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);

  const { toast } = useToast();
  const { suppliers } = useSuppliers();
  const { containers } = useContainers();

  // Available containers with space (simplified filtering for now)
  const availableContainers = containers.filter(c => 
    c.status !== 'completed'
  );

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        cbm_volume: initialData.cbm_volume || 0,
        pallet_count: initialData.pallet_count || null,
        cbm_per_pallet: initialData.cbm_per_pallet || null,
        container_assignment: initialData.container_id ? "existing" : "none"
      });
      if (initialData.container_id) {
        setSelectedContainerId(initialData.container_id);
      }
    }
  }, [initialData]);

  // Generate smart suggestions based on CBM volume
  useEffect(() => {
    const suggestions = [];
    const { cbm_volume } = formData;

    if (cbm_volume > 0) {
      if (cbm_volume >= 30 && cbm_volume <= 35) {
        suggestions.push({
          type: "perfect_fit",
          title: "Perfect 20ft Container Match",
          description: `${cbm_volume} CBM fits perfectly in a 20ft container (33 CBM capacity)`,
          icon: Container,
          variant: "success"
        });
      } else if (cbm_volume >= 60 && cbm_volume <= 70) {
        suggestions.push({
          type: "perfect_fit", 
          title: "Perfect 40ft Container Match",
          description: `${cbm_volume} CBM fits perfectly in a 40ft container (67 CBM capacity)`,
          icon: Container,
          variant: "success"
        });
      } else if (cbm_volume > 70) {
        suggestions.push({
          type: "multiple_containers",
          title: "Multiple Containers Required", 
          description: `${cbm_volume} CBM requires ${Math.ceil(cbm_volume / 67)} containers`,
          icon: AlertTriangle,
          variant: "warning"
        });
      } else if (cbm_volume < 20 && availableContainers.length > 0) {
        suggestions.push({
          type: "consolidate",
          title: "Consolidation Opportunity",
          description: `Small volume (${cbm_volume} CBM) - consider adding to existing container`,
          icon: Package,
          variant: "info"
        });
      }
    }

    setSmartSuggestions(suggestions);
  }, [formData.cbm_volume, availableContainers.length]);

  const handleCBMChange = (field: string, value: number | null) => {
    const updatedData = { ...formData, [field]: value };
    
    // Auto-calculate CBM from pallets if both values are set
    if (field === 'pallet_count' || field === 'cbm_per_pallet') {
      if (updatedData.pallet_count && updatedData.cbm_per_pallet) {
        updatedData.cbm_volume = updatedData.pallet_count * updatedData.cbm_per_pallet;
      }
    }
    
    setFormData(updatedData);
  };

  const [isSubmittingPO, setIsSubmittingPO] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      container_id: formData.container_assignment === "existing" ? selectedContainerId : null
    };

    setIsSubmittingPO(true);
    try {
      await onSubmit(submitData);

      // Reset form only on success
      setFormData({
        supplier_id: "",
        order_number: "",
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: "",
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        shipping_cost: 0,
        status: "draft",
        notes: "",
        cbm_volume: 0,
        pallet_count: null,
        cbm_per_pallet: null,
        container_assignment: "none"
      });
      setSelectedContainerId("");
    } catch (error: any) {
      console.error("Error submitting purchase order:", error);
      // Parent hooks surface the toast; keep dialog open on failure.
    } finally {
      setIsSubmittingPO(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Purchase Order" : "Create Purchase Order"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number</Label>
              <Input
                id="order_number"
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="PO-2024-001"
              />
            </div>
          </div>

          {/* CBM Capacity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Volume & Capacity Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cbm_volume">Total CBM Volume *</Label>
                  <Input
                    id="cbm_volume"
                    type="number"
                    step="0.1"
                    value={formData.cbm_volume}
                    onChange={(e) => handleCBMChange('cbm_volume', parseFloat(e.target.value) || 0)}
                    placeholder="0.0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pallet_count">Pallets (Optional)</Label>
                  <Input
                    id="pallet_count"
                    type="number"
                    value={formData.pallet_count || ""}
                    onChange={(e) => handleCBMChange('pallet_count', parseInt(e.target.value) || null)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cbm_per_pallet">CBM/Pallet (Optional)</Label>
                  <Input
                    id="cbm_per_pallet"
                    type="number"
                    step="0.1"
                    value={formData.cbm_per_pallet || ""}
                    onChange={(e) => handleCBMChange('cbm_per_pallet', parseFloat(e.target.value) || null)}
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Smart Suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="space-y-2">
                  <Label>Smart Suggestions</Label>
                  {smartSuggestions.map((suggestion, index) => (
                    <Alert key={index} className={`
                      ${suggestion.variant === 'success' ? 'border-green-200 bg-green-50' : ''}
                      ${suggestion.variant === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}
                      ${suggestion.variant === 'info' ? 'border-blue-200 bg-blue-50' : ''}
                    `}>
                      <suggestion.icon className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium">{suggestion.title}</div>
                        <div className="text-sm text-muted-foreground">{suggestion.description}</div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Container Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Container className="h-5 w-5" />
                Container Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assignment Option</Label>
                <Select
                  value={formData.container_assignment}
                  onValueChange={(value) => setFormData({ ...formData, container_assignment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Container Assignment</SelectItem>
                    <SelectItem value="existing">Assign to Existing Container</SelectItem>
                    <SelectItem value="new">Create New Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.container_assignment === "existing" && (
                <div className="space-y-2">
                  <Label>Available Containers</Label>
                  <Select
                    value={selectedContainerId}
                    onValueChange={setSelectedContainerId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select container" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContainers.map((container) => (
                        <SelectItem key={container.id} value={container.id}>
                          {container.container_number} - Available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {availableContainers.length === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No containers with sufficient capacity available. Consider creating a new container.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {formData.container_assignment === "new" && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    A new container will be created automatically based on your PO requirements after submission.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order_date">Order Date</Label>
              <Input
                id="order_date"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full min-h-[100px] p-2 border rounded-md"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Purchase Order" : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};