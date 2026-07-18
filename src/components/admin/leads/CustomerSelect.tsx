// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Customer {
  id: string;
  contact_person: string;
  company_name: string | null;
}

interface CustomerSelectProps {
  value: string;
  customers: Customer[];
  isLoading: boolean;
  onChange: (value: string) => void;
}

const CustomerSelect = ({ value, customers, isLoading, onChange }: CustomerSelectProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="customer">Customer *</Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              {customer.contact_person} {customer.company_name && `(${customer.company_name})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CustomerSelect;
