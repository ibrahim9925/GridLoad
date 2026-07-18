// @ts-nocheck
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Package, Clock } from 'lucide-react';

export const ProcurementAnalytics = () => {
  // Mock data - in production, this would come from API
  const analytics = {
    monthlySpend: 145230,
    spendGrowth: 12,
    averageOrderValue: 8650,
    averageLeadTime: 14,
    onTimeDelivery: 87,
    costSavings: 23450,
    topSuppliers: [
      { name: "SolarTech Solutions", spend: 45230, orders: 12 },
      { name: "GreenEnergy Supply", spend: 32150, orders: 8 },
      { name: "PowerMax Components", spend: 28900, orders: 15 },
      { name: "EcoSolar Distributors", spend: 21400, orders: 6 },
      { name: "Renewable Parts Co", spend: 17550, orders: 10 }
    ],
    categorySpend: [
      { category: "Solar Panels", amount: 65000, percentage: 45 },
      { category: "Inverters", amount: 40000, percentage: 28 },
      { category: "Batteries", amount: 25000, percentage: 17 },
      { category: "Mounting", amount: 10000, percentage: 7 },
      { category: "Cables & Accessories", amount: 5230, percentage: 3 }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlySpend)}</div>
            <div className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              +{analytics.spendGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Based on last 30 orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageLeadTime} days</div>
            <p className="text-xs text-muted-foreground">
              Across all suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.onTimeDelivery}%</div>
            <Progress value={analytics.onTimeDelivery} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topSuppliers.map((supplier, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-muted-foreground">{supplier.orders} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(supplier.spend)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((supplier.spend / analytics.monthlySpend) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categorySpend.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-sm">{formatCurrency(category.amount)}</span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                  <div className="text-right text-xs text-muted-foreground">
                    {category.percentage}% of total spend
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Savings */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">{formatCurrency(analytics.costSavings)}</div>
              <div className="text-sm text-muted-foreground">Total Savings YTD</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">15.2%</div>
              <div className="text-sm text-muted-foreground">Cost Reduction vs Last Year</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">3.2 days</div>
              <div className="text-sm text-muted-foreground">Lead Time Improvement</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};