// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Trophy, Target, TrendingUp, Users } from "lucide-react";

interface SalesPerformanceDashboardProps {
  salesRepPerformance: Array<{
    rep_id: string;
    rep_name: string;
    total_sales: number;
    sales_count: number;
    avg_deal_size: number;
    commission_earned: number;
    target_achievement: number;
    conversion_rate: number;
    monthly_trend: Array<{ month: string; sales: number }>;
    rank: number;
  }>;
  salesMetrics: {
    totalRevenue: number;
    totalDeals: number;
    avgDealSize: number;
    topPerformer: string;
    growthRate: number;
  };
  conversionFunnel: Array<{
    stage: string;
    count: number;
    conversion_rate: number;
    value: number;
  }>;
  isLoading: boolean;
}

const FUNNEL_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const SalesPerformanceDashboard = ({ 
  salesRepPerformance, 
  salesMetrics, 
  conversionFunnel, 
  isLoading 
}: SalesPerformanceDashboardProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(salesMetrics.totalRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <Badge variant={salesMetrics.growthRate >= 0 ? "default" : "destructive"}>
                {salesMetrics.growthRate >= 0 ? '+' : ''}{formatPercentage(salesMetrics.growthRate)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold">{salesMetrics.totalDeals}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">{formatCurrency(salesMetrics.avgDealSize)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold">{salesMetrics.topPerformer}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Rep Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Rep Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesRepPerformance.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rep_name" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Sales']} />
                <Bar dataKey="total_sales" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conversionFunnel}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ stage, conversion_rate }) => `${stage}: ${conversion_rate.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {conversionFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Leads']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales Rep Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Rep Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {salesRepPerformance.slice(0, 8).map((rep) => (
              <div key={rep.rep_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {rep.rank}
                  </div>
                  <div>
                    <div className="font-medium">{rep.rep_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {rep.sales_count} deals • {formatCurrency(rep.avg_deal_size)} avg
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(rep.total_sales)}</div>
                    <div className="text-sm text-muted-foreground">Revenue</div>
                  </div>
                  
                  <div className="w-32">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Target</span>
                      <span>{formatPercentage(rep.target_achievement)}</span>
                    </div>
                    <Progress value={Math.min(rep.target_achievement, 100)} className="h-2" />
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{formatPercentage(rep.conversion_rate)}</div>
                    <div className="text-sm text-muted-foreground">Conversion</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends for Top Performers */}
      {salesRepPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performer Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesRepPerformance[0].monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Sales']} />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  name={salesRepPerformance[0].rep_name}
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalesPerformanceDashboard;
