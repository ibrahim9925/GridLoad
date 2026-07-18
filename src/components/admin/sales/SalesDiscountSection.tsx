// @ts-nocheck

import React from "react";
import DiscountSelector from "./DiscountSelector";

interface SalesDiscountSectionProps {
  discountType: string;
  discountPercentage: number;
  discountAmount: number;
  subtotalBeforeDiscount: number;
  customerDefaultDiscount?: number;
  onDiscountTypeChange: (t: string) => void;
  onDiscountPercentageChange: (p: number) => void;
  onDiscountAmountChange: (a: number) => void;
  onApplyCustomerDiscount: () => void;
}
const SalesDiscountSection = (props: SalesDiscountSectionProps) => {
  return <DiscountSelector {...props} />;
}
export default SalesDiscountSection;
