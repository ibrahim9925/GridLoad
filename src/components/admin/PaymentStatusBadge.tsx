// @ts-nocheck

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";

interface PaymentStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
  showIcon?: boolean;
}

const PaymentStatusBadge = ({ status, size = "default", showIcon = true }: PaymentStatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-100",
          icon: CheckCircle,
          label: "Paid",
        };
      case "partial_paid":
        return {
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
          icon: Clock,
          label: "Partial",
        };
      case "overdue":
        return {
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 hover:bg-red-100",
          icon: AlertTriangle,
          label: "Overdue",
        };
      case "pending":
      default:
        return {
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
          icon: XCircle,
          label: "Pending",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${size === "sm" ? "text-xs px-2 py-0.5" : ""}`}
    >
      {showIcon && <Icon className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} mr-1`} />}
      {config.label}
    </Badge>
  );
};

export default PaymentStatusBadge;
