// @ts-nocheck

import React from "react";
import SaleFormFields from "./SaleFormFields";

interface SalesSummarySectionProps {
  payment_status: string;
  sale_date: Date;
  notes: string;
  total_amount: string;
  tax_rate?: number;
  delivery_charges?: number;
  onInputChange: (field: string, value: any) => void;
  hideProductFields?: boolean;
}
const SalesSummarySection = ({
  payment_status, sale_date, notes, total_amount, onInputChange, hideProductFields, tax_rate, delivery_charges
}: SalesSummarySectionProps) => (
  <SaleFormFields
    formData={{
      payment_status,
      sale_date,
      notes,
      total_amount,
      tax_rate,
      delivery_charges,
    }}
    onInputChange={onInputChange}
    hideProductFields={hideProductFields}
  />
);
export default SalesSummarySection;
