// @ts-nocheck

import React from "react";
import HealthCheckCard from "./HealthCheckCard";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  latency?: number;
}

interface HealthCheckListProps {
  healthChecks: HealthCheck[];
}

const HealthCheckList = ({ healthChecks }: HealthCheckListProps) => {
  return (
    <div className="space-y-3">
      {healthChecks.map((check, index) => (
        <HealthCheckCard key={index} check={check} />
      ))}
    </div>
  );
};

export default HealthCheckList;
