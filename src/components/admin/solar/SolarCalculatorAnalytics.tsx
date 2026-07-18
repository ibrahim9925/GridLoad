// @ts-nocheck
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, Users, DollarSign } from "lucide-react";
import { SolarCalculatorLeadsTable } from "./SolarCalculatorLeadsTable";
import { SolarCalculatorMetrics } from "./SolarCalculatorMetrics";

export const SolarCalculatorAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Solar Calculator Analytics</h1>
          <p className="text-muted-foreground">
            Monitor solar calculator usage and lead generation performance
          </p>
        </div>
      </div>

      <SolarCalculatorMetrics />

      <Card>
        <CardHeader>
          <CardTitle>Solar Calculator Leads</CardTitle>
          <CardDescription>
            Detailed view of leads generated through the solar calculator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Solar Leads</TabsTrigger>
              <TabsTrigger value="usd">USD Leads</TabsTrigger>
              <TabsTrigger value="ils">ILS Leads</TabsTrigger>
              <TabsTrigger value="high-value">High Value Systems</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <SolarCalculatorLeadsTable filter="all" />
            </TabsContent>
            
            <TabsContent value="usd" className="mt-6">
              <SolarCalculatorLeadsTable filter="currency:USD" />
            </TabsContent>
            
            <TabsContent value="ils" className="mt-6">
              <SolarCalculatorLeadsTable filter="currency:ILS" />
            </TabsContent>
            
            <TabsContent value="high-value" className="mt-6">
              <SolarCalculatorLeadsTable filter="high-value" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};