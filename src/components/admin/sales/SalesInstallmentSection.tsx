// @ts-nocheck

import React from "react";
import InstallmentPlanSelector from "./InstallmentPlanSelector";

interface SalesInstallmentSectionProps {
  isInstallment: boolean;
  installmentPlanType: string;
  totalAmount: number;
  onInstallmentToggle: (enabled: boolean) => void;
  onPlanTypeChange: (type: string) => void;
}
const SalesInstallmentSection = (props: SalesInstallmentSectionProps) => (
  <InstallmentPlanSelector {...props} />
);
export default SalesInstallmentSection;
