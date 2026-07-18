// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<'customers'>;

interface CustomerContactFieldsProps {
  formData: Partial<Customer>;
  onInputChange: (field: keyof Customer, value: string) => void;
}

const CustomerContactFields = ({ formData, onInputChange }: CustomerContactFieldsProps) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_person">Contact Person *</Label>
          <Input
            id="contact_person"
            value={formData.contact_person || ""}
            onChange={(e) => onInputChange("contact_person", e.target.value)}
            placeholder="Enter contact person name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name</Label>
          <Input
            id="company_name"
            value={formData.company_name || ""}
            onChange={(e) => onInputChange("company_name", e.target.value)}
            placeholder="Enter company name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => onInputChange("email", e.target.value)}
            placeholder="Enter email address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ""}
            onChange={(e) => onInputChange("phone", e.target.value)}
            placeholder="Enter phone number"
          />
        </div>
      </div>
    </>
  );
};

export default CustomerContactFields;
