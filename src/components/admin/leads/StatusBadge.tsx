// @ts-nocheck

import React from "react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  // Ensure the variant is one of the allowed types
  let variant: "default" | "destructive" | "outline" | "secondary" = "default";
  
  switch (status.toLowerCase()) {
    case "new":
      variant = "default";
      break;
    case "contacted":
      variant = "secondary";
      break;
    case "quoted":
      variant = "outline";
      break;
    case "closed_won":
    case "converted":
      variant = "outline";
      break;
    case "closed_lost":
      variant = "destructive";
      break;
    default:
      variant = "default";
  }
  
  // Format status text for display
  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "closed_won":
        return "Converted";
      case "closed_lost":
        return "Lost";
      case "new":
        return "New";
      case "contacted":
        return "Contacted";
      case "quoted":
        return "Quoted";
      default:
        return status;
    }
  };
  
  return <Badge variant={variant}>{formatStatus(status)}</Badge>;
};

export default StatusBadge;
