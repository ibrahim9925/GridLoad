// @ts-nocheck

import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Activity } from "lucide-react";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  latency?: number;
}

interface HealthCheckCardProps {
  check: HealthCheck;
}

const HealthCheckCard = ({ check }: HealthCheckCardProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon(check.status)}
        <div>
          <p className="font-medium">{check.name}</p>
          <p className="text-sm text-muted-foreground">{check.message}</p>
        </div>
      </div>
      <div className="text-right">
        <Badge className={getStatusColor(check.status)}>
          {check.status}
        </Badge>
        {check.latency && (
          <p className="text-xs text-muted-foreground mt-1">
            {check.latency}ms
          </p>
        )}
      </div>
    </div>
  );
};

export default HealthCheckCard;
