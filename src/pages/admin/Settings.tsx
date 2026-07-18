
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsBackend from "@/components/admin/settings/SettingsBackend";
import SampleDataPanel from "@/components/admin/SampleDataPanel";
import ExchangeRatesManager from "@/components/admin/settings/ExchangeRatesManager";
import CompanySettingsManager from "@/components/admin/settings/CompanySettingsManager";
import DataExportPanel from "@/components/admin/settings/DataExportPanel";

const Settings = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and configuration
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="sample-data">Sample Data</TabsTrigger>
          <TabsTrigger value="exchange-rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="data-export">Data Export</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="data-export">
          <DataExportPanel />
        </TabsContent>


        <TabsContent value="company">
          <CompanySettingsManager />
        </TabsContent>

        <TabsContent value="sample-data">
          <SampleDataPanel />
        </TabsContent>

        <TabsContent value="exchange-rates">
          <ExchangeRatesManager />
        </TabsContent>

        <TabsContent value="general">
          <SettingsBackend />
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Security settings are managed in the General tab.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Manage third-party integrations and API configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Integration settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Settings;
