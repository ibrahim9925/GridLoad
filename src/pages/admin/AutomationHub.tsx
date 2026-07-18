// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings2, Zap, Clock, Activity, Play, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAutomationRules } from '@/hooks/useAutomationRules';
import { useAutomationExecutions } from '@/hooks/useAutomationExecutions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const AutomationHub = () => {
  const { rules, isLoading, createRule, toggleRule, deleteRule } = useAutomationRules();
  const { executions, executeAutomationRule, retryExecution } = useAutomationExecutions();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_type: '',
    action_type: '',
    trigger_conditions: {},
    action_config: {},
    is_active: true
  });

  const handleCreateRule = async () => {
    try {
      await createRule(newRule);
      setIsCreateDialogOpen(false);
      setNewRule({
        name: '',
        description: '',
        trigger_type: '',
        action_type: '',
        trigger_conditions: {},
        action_config: {},
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleTestRule = async (ruleId: string) => {
    try {
      await executeAutomationRule(ruleId, { test: true, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error testing rule:', error);
    }
  };

  const triggerTypes = [
    { value: 'sales_created', label: 'Sale Created' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'stock_low', label: 'Low Stock Alert' },
    { value: 'sale_paid', label: 'Sale Fully Paid' },
    { value: 'installation_completed', label: 'Installation Completed' }
  ];

  const actionTypes = [
    { value: 'send_email', label: 'Send Email' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'update_stock', label: 'Update Stock' },
    { value: 'update_commission', label: 'Calculate Commission' },
    { value: 'create_notification', label: 'Create Notification' }
  ];

  if (isLoading) {
    return <div className="p-6">Loading automation rules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automation Hub
          </h1>
          <p className="text-muted-foreground">Automate your business processes and workflows</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>Set up a new automation rule to streamline your workflows</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter rule name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does"
                />
              </div>
              <div>
                <Label htmlFor="trigger">Trigger Event</Label>
                <Select value={newRule.trigger_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(trigger => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="action">Action to Take</Label>
                <Select value={newRule.action_type} onValueChange={(value) => setNewRule(prev => ({ ...prev, action_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(action => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateRule} className="w-full">
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                    />
                  </div>
                  {rule.description && (
                    <CardDescription>{rule.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4" />
                    <span>Trigger: {rule.trigger_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Settings2 className="h-4 w-4" />
                    <span>Action: {rule.action_type.replace('_', ' ')}</span>
                  </div>
                  {rule.last_executed_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Last run: {new Date(rule.last_executed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestRule(rule.id)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Test
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Executed {rule.execution_count} times
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {rules.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No automation rules configured</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first automation rule to streamline your business processes
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No executions found. Automation rules will appear here once they start running.
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {execution.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {execution.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          {execution.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                          {execution.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div>
                          <p className="font-medium">{execution.automation_rules?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(execution.started_at).toLocaleString()}
                            {execution.execution_duration_ms && ` • Duration: ${execution.execution_duration_ms}ms`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          execution.status === 'completed' ? 'default' :
                          execution.status === 'failed' ? 'destructive' :
                          execution.status === 'running' ? 'secondary' : 'outline'
                        }>
                          {execution.status}
                        </Badge>
                        {execution.status === 'failed' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => retryExecution(execution.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationHub;
