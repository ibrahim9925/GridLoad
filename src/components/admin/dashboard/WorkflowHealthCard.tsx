// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  Wrench,
  TrendingUp 
} from 'lucide-react';
import { useWorkflowIntegration } from '@/hooks/useWorkflowIntegration';

const WorkflowHealthCard = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { getSystemHealth, isLoading: fixingWorkflow } = useWorkflowIntegration();

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const calculateOverallHealth = () => {
    if (!healthData) return 0;
    
    const totalIssues = 
      (healthData.incomplete_sales || 0) +
      (healthData.incomplete_pos || 0) +
      (healthData.missing_installations || 0) +
      (healthData.missing_warranties || 0) +
      (healthData.stock_discrepancies || 0);
    
    if (totalIssues === 0) return 100;
    
    // Assume base of 100 items, reduce health by percentage of issues
    return Math.max(0, 100 - (totalIssues * 2));
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-success', icon: CheckCircle };
    if (score >= 70) return { label: 'Good', color: 'text-warning', icon: AlertTriangle };
    return { label: 'Needs Attention', color: 'text-destructive', icon: XCircle };
  };

  const healthScore = calculateOverallHealth();
  const status = getHealthStatus(healthScore);
  const StatusIcon = status.icon;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Workflow Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Workflow Health
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchHealthData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Health Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge variant="outline" className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <Progress value={healthScore} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {healthScore.toFixed(0)}% System Health
          </p>
        </div>

        {/* Health Metrics */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incomplete Sales:</span>
              <span className={healthData?.incomplete_sales > 0 ? 'text-destructive' : 'text-success'}>
                {healthData?.incomplete_sales || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incomplete POs:</span>
              <span className={healthData?.incomplete_pos > 0 ? 'text-destructive' : 'text-success'}>
                {healthData?.incomplete_pos || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Missing Installs:</span>
              <span className={healthData?.missing_installations > 0 ? 'text-destructive' : 'text-success'}>
                {healthData?.missing_installations || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Missing Warranties:</span>
              <span className={healthData?.missing_warranties > 0 ? 'text-destructive' : 'text-success'}>
                {healthData?.missing_warranties || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {healthScore < 100 && (
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled={fixingWorkflow}
            >
              <Wrench className="h-4 w-4 mr-2" />
              {fixingWorkflow ? 'Fixing...' : 'Auto-Fix Issues'}
            </Button>
          </div>
        )}

        {/* Status Messages */}
        <div className="text-xs text-muted-foreground">
          {healthScore === 100 && "All workflows are functioning perfectly!"}
          {healthScore >= 90 && healthScore < 100 && "Minor issues detected. System running well."}
          {healthScore >= 70 && healthScore < 90 && "Some workflows need attention."}
          {healthScore < 70 && "Critical workflow issues require immediate attention."}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowHealthCard;