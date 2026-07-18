// @ts-nocheck

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

interface ConnectionStatusProps {
  status: 'checking' | 'connected' | 'error';
}

const ConnectionStatus = ({ status }: ConnectionStatusProps) => {
  // Only show connection status if there's an actual error
  // Remove the "checking" and "connected" states as they're not needed
  if (status === 'error') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Connection failed. Please check your internet connection or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show any connection status for normal operation
  return null;
};

export default ConnectionStatus;
