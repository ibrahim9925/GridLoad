// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react";

interface FinancialMetrics {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  expensesCount: number;
  avgSaleValue: number;
  avgExpenseValue: number;
  profitMargin: number;
}

interface FinancialMetricsCardsProps {
  metrics: FinancialMetrics;
  isLoading: boolean;
}

const FinancialMetricsCards = ({ metrics, isLoading }: FinancialMetricsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(metrics.totalSales)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.salesCount} sales • Avg: {formatCurrency(metrics.avgSaleValue)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(metrics.totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.expensesCount} expenses • Avg: {formatCurrency(metrics.avgExpenseValue)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          {metrics.netProfit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(metrics.netProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            Revenue - Expenses
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
          <Badge variant={metrics.profitMargin >= 20 ? "default" : metrics.profitMargin >= 10 ? "secondary" : "destructive"}>
            {formatPercentage(metrics.profitMargin)}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {metrics.profitMargin >= 20 && "Excellent"}
            {metrics.profitMargin >= 10 && metrics.profitMargin < 20 && "Good"}
            {metrics.profitMargin >= 0 && metrics.profitMargin < 10 && "Fair"}
            {metrics.profitMargin < 0 && "Needs Attention"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialMetricsCards;
