// @ts-nocheck

import React from "react";
import SaleSelectionFields from "./SaleSelectionFields";

interface SalesCustomerSectionProps {
  customers: any[];
  staff: any[];
  selectedCustomer: string;
  selectedSalesRep: string;
  onCustomerChange: (val: string) => void;
  onSalesRepChange: (val: string) => void;
  isLoading: boolean;
}
const SalesCustomerSection = ({
  customers,
  staff,
  selectedCustomer,
  selectedSalesRep,
  onCustomerChange,
  onSalesRepChange,
  isLoading,
}: SalesCustomerSectionProps) => (
  <SaleSelectionFields
    customers={customers}
    staff={staff}
    selectedCustomer={selectedCustomer}
    selectedSalesRep={selectedSalesRep}
    onCustomerChange={onCustomerChange}
    onSalesRepChange={onSalesRepChange}
    isLoading={isLoading}
  />
);
export default SalesCustomerSection;
