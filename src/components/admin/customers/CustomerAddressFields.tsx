// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<'customers'>;

interface CustomerAddressFieldsProps {
  formData: Partial<Customer>;
  onInputChange: (field: keyof Customer, value: string) => void;
}

const CustomerAddressFields = ({ formData, onInputChange }: CustomerAddressFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address || ""}
          onChange={(e) => onInputChange("address", e.target.value)}
          placeholder="Enter street address"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city || ""}
            onChange={(e) => onInputChange("city", e.target.value)}
            placeholder="Enter city"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state || ""}
            onChange={(e) => onInputChange("state", e.target.value)}
            placeholder="Enter state"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code || ""}
            onChange={(e) => onInputChange("postal_code", e.target.value)}
            placeholder="Enter postal code"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ""}
          onChange={(e) => onInputChange("notes", e.target.value)}
          placeholder="Enter any additional notes..."
          rows={3}
        />
      </div>
    </>
  );
};

export default CustomerAddressFields;
