// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { useCashFlowForecasting } from "@/hooks/useCashFlowForecasting";

const CashFlowForecastCard = () => {
  const { 
    forecasts, 
    isLoading, 
    totalProjectedRevenue, 
    totalOverdueAmount,
    generateCashFlowForecast,
    getPaymentScheduleInsights 
  } = useCashFlowForecasting();

  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    const paymentInsights = await getPaymentScheduleInsights();
    setInsights(paymentInsights);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentMonth = forecasts[0];
  const nextMonth = forecasts[1];
  const trend = currentMonth && nextMonth ? 
    (nextMonth.projectedCashFlow > currentMonth.projectedCashFlow ? 'up' : 'down') : 'neutral';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cash Flow Forecast
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              generateCashFlowForecast();
              loadInsights();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="forecast">12-Month Forecast</TabsTrigger>
            <TabsTrigger value="insights">Payment Insights</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold">
                        ${currentMonth?.projectedCashFlow.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    {trend === 'up' ? (
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">12-Month Projected</p>
                      <p className="text-2xl font-bold text-green-600">
                        ${totalProjectedRevenue.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Overdue Amount</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${totalOverdueAmount.toFixed(2)}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forecast Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecasts.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Amount']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="projectedCashFlow" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                    name="Projected Cash Flow"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actualIncome" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Actual Income"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights && (
              <>
                {/* Payment Schedule Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-800">Overdue Payments</p>
                          <p className="text-2xl font-bold text-red-600">{insights.overdue}</p>
                          <p className="text-sm text-red-700">${insights.overdueAmount.toFixed(2)}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Due This Week</p>
                          <p className="text-2xl font-bold text-yellow-600">{insights.dueThisWeek}</p>
                          <p className="text-sm text-yellow-700">${insights.dueThisWeekAmount.toFixed(2)}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Due This Month</p>
                          <p className="text-2xl font-bold text-blue-600">{insights.dueThisMonth}</p>
                          <p className="text-sm text-blue-700">${insights.dueThisMonthAmount.toFixed(2)}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Total Pending</p>
                          <p className="text-2xl font-bold text-green-600">{insights.totalPending}</p>
                          <p className="text-sm text-green-700">${insights.totalPendingAmount.toFixed(2)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Collection Priority */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Collection Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.overdueAmount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-red-800">Immediate attention required</span>
                          </div>
                          <Badge variant="destructive">
                            {insights.overdue} overdue payments
                          </Badge>
                        </div>
                      )}
                      
                      {insights.dueThisWeekAmount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-yellow-600" />
                            <span className="font-medium text-yellow-800">Follow up this week</span>
                          </div>
                          <Badge variant="secondary">
                            ${insights.dueThisWeekAmount.toFixed(2)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {/* Monthly Breakdown */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecasts.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="monthName" 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Amount']}
                  />
                  <Bar dataKey="scheduledPayments" fill="hsl(var(--primary))" name="Scheduled" />
                  <Bar dataKey="actualIncome" fill="hsl(var(--secondary))" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average Monthly Revenue:</span>
                    <span className="font-medium">
                      ${(totalProjectedRevenue / 12).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Month:</span>
                    <span className="font-medium">
                      {forecasts.reduce((max, month) => 
                        month.projectedCashFlow > max.projectedCashFlow ? month : max
                      ).monthName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Growth Trend:</span>
                    <Badge variant={trend === 'up' ? 'default' : 'secondary'}>
                      {trend === 'up' ? 'Positive' : 'Stable'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Collection Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Collection Rate:</span>
                    <span className="font-medium">
                      {insights ? 
                        (((insights.totalPendingAmount - insights.overdueAmount) / insights.totalPendingAmount) * 100).toFixed(1) + '%'
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>At Risk Amount:</span>
                    <span className="font-medium text-red-600">
                      ${totalOverdueAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health Status:</span>
                    <Badge variant={totalOverdueAmount > 10000 ? 'destructive' : 'default'}>
                      {totalOverdueAmount > 10000 ? 'Needs Attention' : 'Good'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CashFlowForecastCard;