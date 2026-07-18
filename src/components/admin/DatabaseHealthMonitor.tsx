// @ts-nocheck

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import HealthStatus from "./health/HealthStatus";
import HealthCheckList from "./health/HealthCheckList";
import { useHealthChecks } from "./health/useHealthChecks";

const DatabaseHealthMonitor = () => {
  const { healthChecks, isChecking, runHealthChecks } = useHealthChecks();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    runHealthChecks();
    setLastChecked(new Date());
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      runHealthChecks();
      setLastChecked(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    await runHealthChecks();
    setLastChecked(new Date());
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <HealthStatus healthChecks={healthChecks} />
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastChecked && (
          <p className="text-sm text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <HealthCheckList healthChecks={healthChecks} />
      </CardContent>
    </Card>
  );
};

export default DatabaseHealthMonitor;
