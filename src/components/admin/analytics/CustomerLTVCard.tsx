// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";

interface CustomerLTV {
  customer_id: string;
  customer_name: string;
  total_value: number;
  avg_order_value: number;
  order_frequency: number;
  predicted_ltv: number;
  risk_score: number;
}

interface CustomerLTVCardProps {
  customers: CustomerLTV[];
  isLoading: boolean;
}

const CustomerLTVCard = ({ customers, isLoading }: CustomerLTVCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Lifetime Value Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const getRiskBadge = (score: number) => {
    if (score < 30) return <Badge variant="default">Low Risk</Badge>;
    if (score < 60) return <Badge variant="secondary">Medium Risk</Badge>;
    return <Badge variant="destructive">High Risk</Badge>;
  };

  const topCustomers = customers.slice(0, 10);
  const totalLTV = customers.reduce((sum, customer) => sum + customer.predicted_ltv, 0);
  const avgLTV = customers.length > 0 ? totalLTV / customers.length : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Predicted LTV</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLTV)}</div>
            <p className="text-xs text-muted-foreground">
              Across {customers.length} customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average LTV</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgLTV)}</div>
            <p className="text-xs text-muted-foreground">
              Per customer prediction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Customers</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.risk_score >= 60).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Customers by Predicted LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Historical Value</TableHead>
                <TableHead>Avg Order</TableHead>
                <TableHead>Order Frequency</TableHead>
                <TableHead>Predicted LTV</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium">
                    {customer.customer_name}
                  </TableCell>
                  <TableCell>{formatCurrency(customer.total_value)}</TableCell>
                  <TableCell>{formatCurrency(customer.avg_order_value)}</TableCell>
                  <TableCell>{customer.order_frequency}</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(customer.predicted_ltv)}
                  </TableCell>
                  <TableCell>{getRiskBadge(customer.risk_score)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerLTVCard;
