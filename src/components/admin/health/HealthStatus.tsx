// @ts-nocheck

import React from "react";
import { CheckCircle, XCircle, AlertTriangle, Activity } from "lucide-react";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  latency?: number;
}

interface HealthStatusProps {
  healthChecks: HealthCheck[];
}

const HealthStatus = ({ healthChecks }: HealthStatusProps) => {
  const overallStatus = healthChecks.some(check => check.status === 'error') 
    ? 'error' 
    : healthChecks.some(check => check.status === 'warning') 
    ? 'warning' 
    : 'healthy';

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

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon(overallStatus)}
      System Health Monitor
    </div>
  );
};

export default HealthStatus;
