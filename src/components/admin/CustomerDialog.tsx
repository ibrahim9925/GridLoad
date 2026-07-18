// @ts-nocheck
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";
import { useCustomerDialogForm } from "@/hooks/useCustomerDialogForm";

type Customer = Tables<'customers'>;

const CUSTOMER_TYPES = [
  { value: "end_user", label: "End User" },
  { value: "installer", label: "Installer" },
  { value: "contractor", label: "Contractor" },
  { value: "reseller", label: "Reseller" },
];

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSave: (customer: Partial<Customer>) => void;
}

const CustomerDialog = ({ open, onClose, customer, onSave }: CustomerDialogProps) => {
  const {
    formData,
    isLoading,
    setIsLoading,
    handleInputChange,
    validateForm,
  } = useCustomerDialogForm(open, customer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("CustomerDialog: Save failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? `Edit Customer: ${customer.contact_person}` : "Add New Customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={formData.contact_person || ""} onChange={(e) => handleInputChange("contact_person", e.target.value)} required />
            </div>
            <div>
              <Label>Company Name</Label>
              <Input value={formData.company_name || ""} onChange={(e) => handleInputChange("company_name", e.target.value)} />
            </div>
            <div>
              <Label>Phone (Primary)</Label>
              <Input value={formData.phone || ""} onChange={(e) => handleInputChange("phone", e.target.value)} />
            </div>
            <div>
              <Label>Phone 2</Label>
              <Input value={(formData as any).phone2 || ""} onChange={(e) => handleInputChange("phone2" as any, e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email || ""} onChange={(e) => handleInputChange("email", e.target.value)} />
            </div>
            <div>
              <Label>Customer Type</Label>
              <Select value={(formData as any).customer_type || "end_user"} onValueChange={(v) => handleInputChange("customer_type" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input value={formData.city || ""} onChange={(e) => handleInputChange("city", e.target.value)} />
            </div>
            <div>
              <Label>Area</Label>
              <Input value={(formData as any).area || ""} onChange={(e) => handleInputChange("area" as any, e.target.value)} />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input value={formData.postal_code || ""} onChange={(e) => handleInputChange("postal_code", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Full Address</Label>
            <Input value={formData.address || ""} onChange={(e) => handleInputChange("address", e.target.value)} />
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preferred Currency</Label>
              <Select value={(formData as any).preferred_currency || "NIS"} onValueChange={(v) => handleInputChange("preferred_currency" as any, v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIS">₪ NIS</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="JOD">JOD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred Payment Method</Label>
              <Select value={(formData as any).preferred_payment_method || ""} onValueChange={(v) => handleInputChange("preferred_payment_method" as any, v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="visa">Visa / Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Terms</Label>
              {(() => {
                const v = (formData as any).payment_terms_days;
                const presets = [null, 0, 7, 14, 30, 60];
                const isPreset = presets.some((p) => p === v);
                const selectValue =
                  v === null || v === undefined ? "none" : isPreset ? String(v) : "custom";
                return (
                  <Select
                    value={selectValue}
                    onValueChange={(val) => {
                      if (val === "none") handleInputChange("payment_terms_days" as any, null);
                      else if (val === "custom") handleInputChange("payment_terms_days" as any, v && v > 0 ? v : 1);
                      else handleInputChange("payment_terms_days" as any, parseInt(val, 10));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No overdue tracking</SelectItem>
                      <SelectItem value="0">Immediate (0 days)</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
            {(() => {
              const v = (formData as any).payment_terms_days;
              const presets = [null, 0, 7, 14, 30, 60];
              const isCustom = v !== null && v !== undefined && !presets.some((p) => p === v);
              if (!isCustom) return <div />;
              return (
                <div>
                  <Label>Custom Days</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v ?? ""}
                    onChange={(e) =>
                      handleInputChange(
                        "payment_terms_days" as any,
                        e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0)
                      )
                    }
                  />
                </div>
              );
            })()}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes || ""} onChange={(e) => handleInputChange("notes", e.target.value)} rows={3} />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : customer ? "Update Customer" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
