// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestProgressIndicatorProps {
  isConnected: boolean;
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  connectionStatus?: string | {
    executions: { isConnected: boolean; reconnectAttempts: number };
    results: { isConnected: boolean; reconnectAttempts: number };
    metrics: { isConnected: boolean; reconnectAttempts: number };
  };
}

export const TestProgressIndicator: React.FC<TestProgressIndicatorProps> = ({
  isConnected,
  totalExecutions,
  runningExecutions,
  completedExecutions,
  failedExecutions,
  connectionStatus
}) => {
  const getConnectionIcon = () => {
    if (!isConnected) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (runningExecutions > 0) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  const getConnectionStatus = () => {
    if (!isConnected) return "Disconnected";
    if (runningExecutions > 0) return "Running Tests";
    return "Connected";
  };

  const getConnectionVariant = () => {
    if (!isConnected) return "destructive";
    if (runningExecutions > 0) return "default";
    return "outline";
  };

  const calculateSuccessRate = () => {
    const finishedExecutions = completedExecutions + failedExecutions;
    if (finishedExecutions === 0) return 0;
    return Math.round((completedExecutions / finishedExecutions) * 100);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Test Execution Status
            </CardTitle>
            <CardDescription>
              Real-time monitoring of test suite execution and connectivity
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <Badge variant={getConnectionVariant()}>
              {getConnectionStatus()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalExecutions}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{runningExecutions}</div>
            <div className="text-sm text-muted-foreground">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{completedExecutions}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{failedExecutions}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>

        {totalExecutions > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>{calculateSuccessRate()}%</span>
            </div>
            <Progress 
              value={calculateSuccessRate()} 
              className="h-2"
            />
          </div>
        )}

        {connectionStatus && typeof connectionStatus === 'object' && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Connection Health</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Executions:</span>
                <Badge variant={connectionStatus.executions.isConnected ? "outline" : "destructive"} className="text-xs">
                  {connectionStatus.executions.isConnected ? "Connected" : `Retrying (${connectionStatus.executions.reconnectAttempts})`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Results:</span>
                <Badge variant={connectionStatus.results.isConnected ? "outline" : "destructive"} className="text-xs">
                  {connectionStatus.results.isConnected ? "Connected" : `Retrying (${connectionStatus.results.reconnectAttempts})`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Metrics:</span>
                <Badge variant={connectionStatus.metrics.isConnected ? "outline" : "destructive"} className="text-xs">
                  {connectionStatus.metrics.isConnected ? "Connected" : `Retrying (${connectionStatus.metrics.reconnectAttempts})`}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};