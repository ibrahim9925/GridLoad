// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  TestTube, 
  Zap, 
  Clock, 
  Globe, 
  Shield,
  Save,
  RotateCcw,
  Play,
  Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestSuiteConfig {
  name: string;
  enabled: boolean;
  schedule: string;
  maxConcurrency: number;
  timeout: number;
  retries: number;
}

const defaultConfigs: TestSuiteConfig[] = [
  {
    name: "Unit Tests",
    enabled: true,
    schedule: "0 */2 * * *", // Every 2 hours
    maxConcurrency: 4,
    timeout: 30000,
    retries: 1
  },
  {
    name: "Integration Tests",
    enabled: true,
    schedule: "0 4 * * *", // Daily at 4 AM
    maxConcurrency: 2,
    timeout: 300000,
    retries: 2
  },
  {
    name: "Performance Tests",
    enabled: false,
    schedule: "0 2 * * 0", // Weekly on Sunday at 2 AM
    maxConcurrency: 1,
    timeout: 600000,
    retries: 0
  },
  {
    name: "E2E Tests",
    enabled: true,
    schedule: "0 6 * * *", // Daily at 6 AM
    maxConcurrency: 1,
    timeout: 900000,
    retries: 2
  },
  {
    name: "Security Tests",
    enabled: true,
    schedule: "0 3 * * *", // Daily at 3 AM
    maxConcurrency: 2,
    timeout: 180000,
    retries: 1
  }
];

const suiteIcons = {
  "Unit Tests": TestTube,
  "Integration Tests": Zap,
  "Performance Tests": Clock,
  "E2E Tests": Globe,
  "Security Tests": Shield
};

export const TestConfigPanel: React.FC = () => {
  const [configs, setConfigs] = useState<TestSuiteConfig[]>(defaultConfigs);
  const [globalSettings, setGlobalSettings] = useState({
    autoRunEnabled: true,
    notificationsEnabled: true,
    emailAlerts: false,
    slackNotifications: true,
    maxParallelSuites: 3,
    defaultTimeout: 300000,
    retentionDays: 90
  });
  const { toast } = useToast();

  const updateConfig = (index: number, updates: Partial<TestSuiteConfig>) => {
    setConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, ...updates } : config
    ));
  };

  const saveConfiguration = () => {
    // In a real app, this would save to backend
    toast({
      title: "Configuration Saved",
      description: "Test configuration has been updated successfully.",
    });
  };

  const resetConfiguration = () => {
    setConfigs(defaultConfigs);
    toast({
      title: "Configuration Reset",
      description: "Test configuration has been reset to defaults.",
    });
  };

  const runTestSuite = (suiteName: string) => {
    toast({
      title: "Test Suite Started",
      description: `${suiteName} execution has been triggered.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            Configure global test execution settings and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-run">Automatic Test Execution</Label>
                <Switch
                  id="auto-run"
                  checked={globalSettings.autoRunEnabled}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, autoRunEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <Switch
                  id="notifications"
                  checked={globalSettings.notificationsEnabled}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, notificationsEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-alerts">Email Alerts</Label>
                <Switch
                  id="email-alerts"
                  checked={globalSettings.emailAlerts}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, emailAlerts: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="slack-notifications">Slack Notifications</Label>
                <Switch
                  id="slack-notifications"
                  checked={globalSettings.slackNotifications}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, slackNotifications: checked }))
                  }
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="parallel-suites">Max Parallel Test Suites</Label>
                <Input
                  id="parallel-suites"
                  type="number"
                  min="1"
                  max="10"
                  value={globalSettings.maxParallelSuites}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ 
                      ...prev, 
                      maxParallelSuites: parseInt(e.target.value) || 1 
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="default-timeout">Default Timeout (ms)</Label>
                <Input
                  id="default-timeout"
                  type="number"
                  min="1000"
                  value={globalSettings.defaultTimeout}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ 
                      ...prev, 
                      defaultTimeout: parseInt(e.target.value) || 300000 
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="retention-days">Data Retention (days)</Label>
                <Input
                  id="retention-days"
                  type="number"
                  min="1"
                  max="365"
                  value={globalSettings.retentionDays}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ 
                      ...prev, 
                      retentionDays: parseInt(e.target.value) || 90 
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Test Suite Configurations */}
      <Card>
        <CardHeader>
          <CardTitle>Test Suite Configuration</CardTitle>
          <CardDescription>
            Configure individual test suite settings and schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {configs.map((config, index) => {
              const Icon = suiteIcons[config.name as keyof typeof suiteIcons];
              
              return (
                <Card key={config.name}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{config.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={config.enabled ? "default" : "secondary"}>
                              {config.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Schedule: {config.schedule}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runTestSuite(config.name)}
                          disabled={!config.enabled}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => 
                            updateConfig(index, { enabled: checked })
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Schedule (Cron)</Label>
                        <Input
                          value={config.schedule}
                          onChange={(e) => 
                            updateConfig(index, { schedule: e.target.value })
                          }
                          placeholder="0 2 * * *"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Max Concurrency</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={config.maxConcurrency}
                          onChange={(e) => 
                            updateConfig(index, { 
                              maxConcurrency: parseInt(e.target.value) || 1 
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Timeout (ms)</Label>
                        <Input
                          type="number"
                          min="1000"
                          value={config.timeout}
                          onChange={(e) => 
                            updateConfig(index, { 
                              timeout: parseInt(e.target.value) || 30000 
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Retries</Label>
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          value={config.retries}
                          onChange={(e) => 
                            updateConfig(index, { 
                              retries: parseInt(e.target.value) || 0 
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetConfiguration}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={saveConfiguration}>
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
};