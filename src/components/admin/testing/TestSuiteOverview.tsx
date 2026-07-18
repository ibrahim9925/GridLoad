// @ts-nocheck
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TestTube,
  Zap,
  Shield,
  Globe
} from "lucide-react";

interface TestExecution {
  id: string;
  test_suite: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  start_time: string;
  end_time?: string;
}

interface TestSuiteOverviewProps {
  testExecutions: TestExecution[];
  onStartTest: (suite: string) => void;
  onStopTest: (executionId: string) => void;
}

const testSuites = [
  {
    name: "Database Tests",
    icon: TestTube,
    description: "Connection, RLS, integrity, performance checks",
    color: "blue"
  },
  {
    name: "Sales Tests", 
    icon: Zap,
    description: "Prerequisites, workflows, pricing calculations",
    color: "green"
  },
  {
    name: "Customer Tests",
    icon: Globe,
    description: "Creation, validation, contact management",
    color: "purple"
  },
  {
    name: "Inventory Tests",
    icon: Clock,
    description: "Stock levels, alerts, movement tracking",
    color: "yellow"
  },
  {
    name: "Warranty Tests",
    icon: Shield,
    description: "Creation, tracking, expiration handling",
    color: "red"
  },
  {
    name: "Staff Tests",
    icon: TestTube,
    description: "Authentication, roles, permissions",
    color: "blue"
  },
  {
    name: "Financial Tests",
    icon: Zap,
    description: "Payments, commissions, currency handling",
    color: "green"
  },
  {
    name: "Security Tests",
    icon: Shield,
    description: "RLS policies, authentication, audit logs",
    color: "red"
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <Clock className="h-4 w-4 animate-spin text-primary" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-warning" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running':
      return 'bg-primary';
    case 'completed':
      return 'bg-success';
    case 'failed':
      return 'bg-destructive';
    default:
      return 'bg-muted';
  }
};

const getSuiteIconColor = (color: string) => {
  const colorMap = {
    blue: 'text-primary',
    green: 'text-success', 
    yellow: 'text-warning',
    purple: 'text-accent',
    red: 'text-destructive'
  };
  return colorMap[color as keyof typeof colorMap] || 'text-muted-foreground';
};

const getSuiteBgColor = (color: string) => {
  const colorMap = {
    blue: 'bg-primary/10',
    green: 'bg-success/10',
    yellow: 'bg-warning/10', 
    purple: 'bg-accent/10',
    red: 'bg-destructive/10'
  };
  return colorMap[color as keyof typeof colorMap] || 'bg-muted/10';
};

export const TestSuiteOverview: React.FC<TestSuiteOverviewProps> = ({
  testExecutions,
  onStartTest,
  onStopTest
}) => {
  const getLatestExecution = (suiteName: string) => {
    return testExecutions
      .filter(exec => exec.test_suite === suiteName)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
  };

  const calculateProgress = (execution: TestExecution) => {
    if (!execution || execution.total_tests === 0) return 0;
    return ((execution.passed_tests + execution.failed_tests) / execution.total_tests) * 100;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {testSuites.map((suite) => {
        const latestExecution = getLatestExecution(suite.name);
        const isRunning = latestExecution?.status === 'running';
        const progress = latestExecution ? calculateProgress(latestExecution) : 0;
        
        return (
          <Card key={suite.name} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${getSuiteBgColor(suite.color)}`}>
                    <suite.icon className={`h-5 w-5 ${getSuiteIconColor(suite.color)}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{suite.name}</CardTitle>
                    {latestExecution && (
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(latestExecution.status)}
                        <Badge variant={latestExecution.status === 'completed' ? 'default' : 'secondary'}>
                          {latestExecution.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStartTest(suite.name)}
                    disabled={isRunning}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  {isRunning && latestExecution && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStopTest(latestExecution.id)}
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>{suite.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              {latestExecution ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-semibold text-success">
                        {latestExecution.passed_tests}
                      </div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-destructive">
                        {latestExecution.failed_tests}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {latestExecution.total_tests}
                      </div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                  
                  {latestExecution.end_time && (
                    <div className="text-xs text-muted-foreground">
                      Duration: {Math.round(
                        (new Date(latestExecution.end_time).getTime() - 
                         new Date(latestExecution.start_time).getTime()) / 1000
                      )}s
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No tests run yet</p>
                </div>
              )}
            </CardContent>
            
            {isRunning && (
              <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor('running')} animate-pulse`} />
            )}
          </Card>
        );
      })}
    </div>
  );
};