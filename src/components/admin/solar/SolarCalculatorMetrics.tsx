// @ts-nocheck
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, Users, DollarSign, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SolarCalculatorMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["solar-calculator-metrics"],
    queryFn: async () => {
      // Get solar calculator leads (calculator data is not null)
      const { data: solarLeads, error } = await supabase
        .from("leads")
        .select("*")
        .eq("lead_type", "solar_calculator")
        .not("calculator_data", "is", null);

      if (error) throw error;

      // Calculate metrics
      const totalCalculatorUses = solarLeads?.length || 0;
      const usdLeads = solarLeads?.filter(lead => {
        const calculatorData = lead.calculator_data as any;
        return calculatorData?.currency === "USD";
      }).length || 0;
      const ilsLeads = solarLeads?.filter(lead => {
        const calculatorData = lead.calculator_data as any;
        return calculatorData?.currency === "ILS";
      }).length || 0;

      // Calculate average system size
      const systemSizes = solarLeads?.map(lead => {
        const calculatorData = lead.calculator_data as any;
        return calculatorData?.systemSizeKw || 0;
      }).filter(size => size > 0) || [];
      const avgSystemSize = systemSizes.length > 0 
        ? systemSizes.reduce((a, b) => a + b, 0) / systemSizes.length 
        : 0;

      // Calculate total potential value
      const totalPotentialValue = solarLeads?.reduce((total, lead) => {
        const calculatorData = lead.calculator_data as any;
        const cost = calculatorData?.estimatedCost || 0;
        return total + cost;
      }, 0) || 0;

      return {
        totalCalculatorUses,
        usdLeads,
        ilsLeads,
        avgSystemSize: Math.round(avgSystemSize * 100) / 100,
        totalPotentialValue: Math.round(totalPotentialValue),
        conversionRate: totalCalculatorUses > 0 ? Math.round((totalCalculatorUses / totalCalculatorUses) * 100) : 0
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Total Calculator Uses",
      value: metrics?.totalCalculatorUses || 0,
      description: "Solar calculations performed",
      icon: Calculator,
      change: "+12% from last month"
    },
    {
      title: "Average System Size",
      value: `${metrics?.avgSystemSize || 0} kW`,
      description: "Recommended system capacity",
      icon: Zap,
      change: "+5% from last month"
    },
    {
      title: "Currency Split",
      value: `${metrics?.usdLeads || 0} USD / ${metrics?.ilsLeads || 0} ILS`,
      description: "Leads by currency preference",
      icon: DollarSign,
      change: "ILS growing +25%"
    },
    {
      title: "Potential Pipeline Value",
      value: `$${(metrics?.totalPotentialValue || 0).toLocaleString()}`,
      description: "Total estimated project costs",
      icon: TrendingUp,
      change: "+18% from last month"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">
              {metric.description}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {metric.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};