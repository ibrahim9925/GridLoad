// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

interface CustomerSegmentationCardProps {
  segments: Array<{
    customer_id: string;
    customer_name: string;
    total_value: number;
    segment: 'high_value' | 'loyal' | 'at_risk' | 'new' | 'dormant';
    risk_score: number;
    lifetime_value: number;
  }>;
  segmentSummary: Array<{
    segment: string;
    count: number;
    total_value: number;
    avg_value: number;
    percentage: number;
  }>;
  isLoading: boolean;
}

const SEGMENT_COLORS = {
  'HIGH VALUE': '#22c55e',
  'LOYAL': '#3b82f6',
  'AT RISK': '#f59e0b',
  'NEW': '#8b5cf6',
  'DORMANT': '#ef4444'
};

const CustomerSegmentationCard = ({ segments, segmentSummary, isLoading }: CustomerSegmentationCardProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
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
  
  const atRiskCustomers = segments.filter(c => c.segment === 'at_risk').length;
  const highValueCustomers = segments.filter(c => c.segment === 'high_value').length;
  const topCustomers = [...segments]
    .sort((a, b) => b.lifetime_value - a.lifetime_value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{segments.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Value</p>
                <p className="text-2xl font-bold text-green-600">{highValueCustomers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold text-orange-600">{atRiskCustomers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg LTV</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(segments.reduce((sum, c) => sum + c.lifetime_value, 0) / segments.length)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={segmentSummary}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ segment, percentage }) => `${segment}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {segmentSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEGMENT_COLORS[entry.segment as keyof typeof SEGMENT_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Customers']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Segment Value */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={segmentSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Revenue']} />
                <Bar dataKey="total_value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers by LTV */}
      <Card>
        <CardHeader>
          <CardTitle>Top Customers by Lifetime Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.customer_id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{customer.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Total Purchases: {formatCurrency(customer.total_value)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(customer.lifetime_value)}</div>
                  <Badge variant={
                    customer.segment === 'high_value' ? 'default' :
                    customer.segment === 'at_risk' ? 'destructive' : 'secondary'
                  }>
                    {customer.segment.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* At Risk Customers Alert */}
      {atRiskCustomers > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Customer Retention Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-600">
              You have {atRiskCustomers} customers at risk of churning. Consider reaching out with targeted retention campaigns.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSegmentationCard;
