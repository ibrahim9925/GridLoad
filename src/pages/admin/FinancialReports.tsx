// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancialData } from "@/hooks/useFinancialData";
import FinancialMetricsCards from "@/components/admin/reports/FinancialMetricsCards";
import FinancialCharts from "@/components/admin/reports/FinancialCharts";
import DateRangeFilter from "@/components/admin/reports/DateRangeFilter";
import PaymentTrendChart from "@/components/admin/analytics/PaymentTrendChart";
import CollectionEfficiencyWidget from "@/components/admin/analytics/CollectionEfficiencyWidget";

interface DateRange {
  from: Date;
  to: Date;
}

const FinancialReports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const {
    metrics,
    monthlySummary,
    expenseCategories,
    salesByStatus,
    isLoading,
  } = useFinancialData(dateRange);

  // Mock payment trend data - in real app, this would come from useFinancialData
  const paymentTrendData = [
    { month: "Jan", payments: 12, amount: 15000 },
    { month: "Feb", payments: 18, amount: 22000 },
    { month: "Mar", payments: 15, amount: 18500 },
    { month: "Apr", payments: 25, amount: 31000 },
    { month: "May", payments: 22, amount: 28000 },
    { month: "Jun", payments: 28, amount: 35000 },
  ];

  const collectionData = {
    collectionRate: 78.5,
    targetRate: 85,
    previousPeriodRate: 75.2,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of sales performance and expense analysis
          </p>
        </div>
        <DateRangeFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Financial Metrics */}
      <FinancialMetricsCards metrics={metrics} isLoading={isLoading} />

      {/* Payment Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentTrendChart data={paymentTrendData} isLoading={isLoading} />
        <CollectionEfficiencyWidget {...collectionData} isLoading={isLoading} />
      </div>

      {/* Charts */}
      <FinancialCharts 
        monthlySummary={monthlySummary}
        expenseCategories={expenseCategories}
        salesByStatus={salesByStatus}
        isLoading={isLoading}
      />

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseCategories.map((category) => (
                <div key={category.category} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className="font-medium capitalize">{category.category}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({category.count} items)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${category.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {salesByStatus.map((status) => (
                <div key={status.category} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className="font-medium capitalize">{status.category}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({status.count} sales)
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${status.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {status.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialReports;
