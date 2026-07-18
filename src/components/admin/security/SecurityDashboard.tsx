// @ts-nocheck
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecurityMonitoringCenter } from './SecurityMonitoringCenter';
import { SecurityIncidentManager } from './SecurityIncidentManager';
import { EnhancedSecurityDashboard } from './EnhancedSecurityDashboard';
const SecurityDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">Comprehensive security monitoring and management</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <EnhancedSecurityDashboard />
        </TabsContent>

        <TabsContent value="monitoring">
          <SecurityMonitoringCenter />
        </TabsContent>

        <TabsContent value="incidents">
          <SecurityIncidentManager />
        </TabsContent>

        <TabsContent value="settings">
          <EnhancedSecurityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;