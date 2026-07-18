// @ts-nocheck

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import EnhancedFormField from "@/components/admin/forms/EnhancedFormField";
import { useFormValidation, customerValidationSchema } from "@/utils/formValidation";

interface Customer {
  id: string;
  contact_person: string;
  company_name: string | null;
}

interface Staff {
  id: string;
  full_name: string;
}

interface SaleSelectionFieldsProps {
  customers: Customer[];
  staff: Staff[];
  selectedCustomer: string;
  selectedSalesRep: string;
  onCustomerChange: (value: string) => void;
  onSalesRepChange: (value: string) => void;
  isLoading?: boolean;
}

const SaleSelectionFields = ({
  customers,
  staff,
  selectedCustomer,
  selectedSalesRep,
  onCustomerChange,
  onSalesRepChange,
  isLoading = false,
}: SaleSelectionFieldsProps) => {
  const { errors, validateSingleField } = useFormValidation({
    customer_id: { required: true },
  });

  const handleSalesRepChange = (value: string) => {
    // Convert "unassigned" back to empty string for the form
    onSalesRepChange(value === "unassigned" ? "" : value);
  };

  const handleCustomerChange = (value: string) => {
    onCustomerChange(value);
    validateSingleField("customer_id", value);
  };

  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: customer.company_name 
      ? `${customer.contact_person} (${customer.company_name})`
      : customer.contact_person,
  }));

  const staffOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...staff.map(member => ({
      value: member.id,
      label: member.full_name,
    })),
  ];

  return (
    <>
      <EnhancedFormField
        type="select"
        name="customer_id"
        label="Customer"
        value={selectedCustomer}
        onChange={handleCustomerChange}
        error={errors.customer_id}
        required={true}
        placeholder="Select a customer"
        disabled={isLoading}
        options={customerOptions}
        helpText="Choose the customer for this sale"
      />

      <EnhancedFormField
        type="select"
        name="sales_rep"
        label="Sales Representative"
        value={selectedSalesRep || "unassigned"}
        onChange={handleSalesRepChange}
        placeholder="Select sales rep (optional)"
        disabled={isLoading}
        options={staffOptions}
        helpText="Assign a sales representative to this sale"
      />
    </>
  );
};

export default SaleSelectionFields;
