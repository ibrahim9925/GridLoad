// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Activity,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useTestSampleData } from "@/hooks/useTestSampleData";
import { useHealthChecks } from "@/hooks/useHealthChecks";

export const TestDataActions = () => {
  const { generateSampleTestData, clearTestData, isGenerating } = useTestSampleData();
  const { healthChecks, isRunning: isHealthRunning, runHealthChecks } = useHealthChecks();

  const getHealthStatus = () => {
    if (healthChecks.length === 0) return { status: 'unknown', message: 'No health check run yet' };
    
    const errorCount = healthChecks.filter(h => h.status === 'error').length;
    const warningCount = healthChecks.filter(h => h.status === 'warning').length;
    
    if (errorCount > 0) return { status: 'error', message: `${errorCount} errors found` };
    if (warningCount > 0) return { status: 'warning', message: `${warningCount} warnings found` };
    return { status: 'healthy', message: 'All systems healthy' };
  };

  const healthStatus = getHealthStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-success text-success-foreground">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Test Data Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Test Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={generateSampleTestData}
            disabled={isGenerating}
            size="sm"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Database className="mr-2 h-3 w-3" />
                Generate Sample Data
              </>
            )}
          </Button>
          
          <Button
            onClick={clearTestData}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Clear Test Data
          </Button>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(healthStatus.status)}
              <span className="text-sm">{healthStatus.message}</span>
            </div>
            {getStatusBadge(healthStatus.status)}
          </div>
          
          <Button
            onClick={runHealthChecks}
            disabled={isHealthRunning}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isHealthRunning ? (
              <>
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-3 w-3" />
                Run Health Check
              </>
            )}
          </Button>
          
          {healthChecks.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Last check: {new Date(healthChecks[0]?.timestamp).toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};