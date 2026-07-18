// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { useAdvancedAutomation } from "@/hooks/useAdvancedAutomation";

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  executionsToday: number;
  successRate: number;
}

interface ExecutionRecord {
  id: string;
  type: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  triggered: string;
  duration: string;
}

interface RuleRecord {
  id: string;
  name: string;
  type: string;
  trigger: string;
  status: 'active' | 'paused' | 'inactive';
  executions: number;
}

const AutomationDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { 
    executeLeadNurturingWorkflow, 
    executeTaskAssignment, 
    executeQuoteGeneration,
    executeFollowUpSequence 
  } = useAdvancedAutomation();

  const automationStats: AutomationStats = {
    totalRules: 12,
    activeRules: 8,
    executionsToday: 45,
    successRate: 94.2
  };

  const recentExecutions: ExecutionRecord[] = [
    {
      id: '1',
      type: 'Lead Nurturing',
      status: 'completed',
      triggered: '2 min ago',
      duration: '1.2s'
    },
    {
      id: '2',
      type: 'Task Assignment',
      status: 'running',
      triggered: '5 min ago',
      duration: '0.8s'
    },
    {
      id: '3',
      type: 'Quote Generation',
      status: 'completed',
      triggered: '12 min ago',
      duration: '2.1s'
    }
  ];

  const automationRules: RuleRecord[] = [
    {
      id: '1',
      name: 'High-Value Lead Assignment',
      type: 'Lead Nurturing',
      trigger: 'New lead > $10k',
      status: 'active',
      executions: 23
    },
    {
      id: '2',
      name: 'Installation Task Creation',
      type: 'Task Assignment',
      trigger: 'Sale status = confirmed',
      status: 'active',
      executions: 12
    },
    {
      id: '3',
      name: 'Automated Quote Generation',
      type: 'Quote Generation',
      trigger: 'Lead requirements complete',
      status: 'paused',
      executions: 8
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor your business automation workflows
          </p>
        </div>
        <Button>
          <Bot className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.totalRules}</div>
            <p className="text-xs text-muted-foreground">
              {automationStats.activeRules} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.executionsToday}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{automationStats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.4s</div>
            <p className="text-xs text-muted-foreground">-0.2s improvement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => executeLeadNurturingWorkflow('demo-lead', { status: 'new', estimated_value: 15000 })}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Test Lead Nurturing
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => executeTaskAssignment('new_sale', 'demo-sale', {})}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Test Task Assignment
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => executeQuoteGeneration('demo-lead', { systemSize: 10, complexity: 'medium' })}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Test Quote Generation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Lead Processing</span>
                    <span className="text-sm font-medium">98%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Task Assignment</span>
                    <span className="text-sm font-medium">95%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quote Generation</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Follow-up Sequences</span>
                    <span className="text-sm font-medium">89%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{rule.name}</h3>
                        {getStatusBadge(rule.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.trigger}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.executions} executions • {rule.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        {rule.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExecutions.map((execution) => (
                  <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <h3 className="font-medium">{execution.type}</h3>
                        <p className="text-sm text-muted-foreground">
                          Triggered {execution.triggered} • Duration: {execution.duration}
                        </p>
                      </div>
                    </div>
                    <Badge variant={execution.status === 'completed' ? 'default' : 'secondary'}>
                      {execution.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationDashboard;
