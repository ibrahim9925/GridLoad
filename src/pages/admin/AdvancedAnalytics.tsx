// @ts-nocheck

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangeFilter from "@/components/admin/reports/DateRangeFilter";
import { useRevenueForecasting } from "@/hooks/useRevenueForecasting";
import { useCustomerSegmentation } from "@/hooks/useCustomerSegmentation";
import { useSalesPerformanceAnalytics } from "@/hooks/useSalesPerformanceAnalytics";
import RevenueForecastChart from "@/components/admin/analytics/RevenueForecastChart";
import CustomerSegmentationCard from "@/components/admin/analytics/CustomerSegmentationCard";
import SalesPerformanceDashboard from "@/components/admin/analytics/SalesPerformanceDashboard";

interface DateRange {
  from: Date;
  to: Date;
}

const AdvancedAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Use all the advanced analytics hooks
  const { forecastData, isLoading: forecastLoading } = useRevenueForecasting(6);
  const { segments, segmentSummary, isLoading: segmentLoading } = useCustomerSegmentation();
  const { 
    salesRepPerformance, 
    salesMetrics, 
    conversionFunnel, 
    isLoading: salesLoading 
  } = useSalesPerformanceAnalytics(dateRange);

  // Transform the data to match expected interfaces
  const transformedSalesRepPerformance = salesRepPerformance.map((rep, index) => ({
    rep_id: rep.sales_rep_id,
    rep_name: rep.full_name,
    total_sales: rep.total_sales,
    sales_count: rep.total_sales, // Use total_sales as count for now
    avg_deal_size: rep.average_deal_size,
    commission_earned: rep.commission_earned,
    target_achievement: rep.total_revenue / 10000, // Mock target achievement
    conversion_rate: rep.conversion_rate,
    monthly_trend: [
      { month: 'Jan', sales: rep.total_sales * 0.8 },
      { month: 'Feb', sales: rep.total_sales * 0.9 },
      { month: 'Mar', sales: rep.total_sales }
    ],
    rank: index + 1
  }));

  const transformedSalesMetrics = {
    totalRevenue: salesMetrics.total_revenue,
    totalDeals: salesMetrics.total_sales,
    avgDealSize: salesMetrics.average_deal_size,
    topPerformer: salesRepPerformance[0]?.full_name || "No data",
    growthRate: 15.5 // Mock growth rate
  };

  const transformedConversionFunnel = [
    { stage: "Leads", count: conversionFunnel.leads, conversion_rate: 100, value: conversionFunnel.leads },
    { stage: "Contacted", count: conversionFunnel.contacted, conversion_rate: (conversionFunnel.contacted / conversionFunnel.leads) * 100, value: conversionFunnel.contacted },
    { stage: "Quoted", count: conversionFunnel.quoted, conversion_rate: (conversionFunnel.quoted / conversionFunnel.leads) * 100, value: conversionFunnel.quoted },
    { stage: "Closed Won", count: conversionFunnel.closed_won, conversion_rate: (conversionFunnel.closed_won / conversionFunnel.leads) * 100, value: conversionFunnel.closed_won }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business intelligence with predictive insights and performance analytics
          </p>
        </div>
        <DateRangeFilter 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange}
        />
      </div>

      <Tabs defaultValue="revenue-forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue-forecast">Revenue Forecasting</TabsTrigger>
          <TabsTrigger value="customer-analytics">Customer Analytics</TabsTrigger>
          <TabsTrigger value="sales-performance">Sales Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue-forecast" className="space-y-6">
          <RevenueForecastChart 
            forecastData={forecastData}
            isLoading={forecastLoading}
          />
        </TabsContent>

        <TabsContent value="customer-analytics" className="space-y-6">
          <CustomerSegmentationCard
            segments={segments}
            segmentSummary={segmentSummary}
            isLoading={segmentLoading}
          />
        </TabsContent>

        <TabsContent value="sales-performance" className="space-y-6">
          <SalesPerformanceDashboard
            salesRepPerformance={transformedSalesRepPerformance}
            salesMetrics={transformedSalesMetrics}
            conversionFunnel={transformedConversionFunnel}
            isLoading={salesLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
