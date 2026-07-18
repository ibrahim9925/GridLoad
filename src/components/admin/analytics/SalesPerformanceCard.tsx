// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Target, TrendingUp } from "lucide-react";

interface SalesPerformance {
  sales_rep_id: string;
  sales_rep_name: string;
  total_sales: number;
  sales_count: number;
  avg_deal_size: number;
  conversion_rate: number;
  target_achievement: number;
}

interface SalesPerformanceCardProps {
  salesReps: SalesPerformance[];
  isLoading: boolean;
}

const SalesPerformanceCard = ({ salesReps, isLoading }: SalesPerformanceCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sales Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const getPerformanceBadge = (achievement: number) => {
    if (achievement >= 100) return <Badge variant="default">Exceeded</Badge>;
    if (achievement >= 80) return <Badge variant="secondary">On Track</Badge>;
    if (achievement >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Below Target</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const totalSales = salesReps.reduce((sum, rep) => sum + rep.total_sales, 0);
  const avgPerformance = salesReps.length > 0 
    ? salesReps.reduce((sum, rep) => sum + rep.target_achievement, 0) / salesReps.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Team Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {salesReps.length} sales representatives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Target Achievement</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerformance.toFixed(1)}%</div>
            <Progress value={avgPerformance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {salesReps.filter(rep => rep.target_achievement >= 100).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Exceeded targets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Rep Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Representative Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales Rep</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Deals Closed</TableHead>
                <TableHead>Avg Deal Size</TableHead>
                <TableHead>Conversion Rate</TableHead>
                <TableHead>Target Achievement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesReps.map((rep) => (
                <TableRow key={rep.sales_rep_id}>
                  <TableCell className="font-medium">
                    {rep.sales_rep_name}
                  </TableCell>
                  <TableCell>{formatCurrency(rep.total_sales)}</TableCell>
                  <TableCell>{rep.sales_count}</TableCell>
                  <TableCell>{formatCurrency(rep.avg_deal_size)}</TableCell>
                  <TableCell>{rep.conversion_rate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{rep.target_achievement.toFixed(1)}%</div>
                      <Progress value={rep.target_achievement} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>{getPerformanceBadge(rep.target_achievement)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPerformanceCard;
