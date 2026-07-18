// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { CreditCard, Clock, AlertTriangle } from "lucide-react";

interface PaymentCollection {
  period: string;
  total_due: number;
  collected: number;
  overdue: number;
  collection_rate: number;
  avg_collection_time: number;
}

interface PaymentCollectionReportProps {
  data: PaymentCollection[];
  isLoading: boolean;
}

const PaymentCollectionReport = ({ data, isLoading }: PaymentCollectionReportProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Collection Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  const totalDue = data.reduce((sum, item) => sum + item.total_due, 0);
  const totalCollected = data.reduce((sum, item) => sum + item.collected, 0);
  const totalOverdue = data.reduce((sum, item) => sum + item.overdue, 0);
  const overallCollectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCollectionRate.toFixed(1)}%</div>
            <Progress value={overallCollectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Collection Rate Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'collection_rate' ? `${Number(value).toFixed(1)}%` : value,
                  name === 'collection_rate' ? 'Collection Rate' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="collection_rate" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Collection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Collection Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Total Due</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Collection Rate</TableHead>
                <TableHead>Avg Collection Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.period}>
                  <TableCell className="font-medium">{item.period}</TableCell>
                  <TableCell>{formatCurrency(item.total_due)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(item.collected)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(item.overdue)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">{item.collection_rate.toFixed(1)}%</span>
                      <Progress value={item.collection_rate} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>{item.avg_collection_time} days</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Collection Amount Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Collection vs Due Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="total_due" fill="#94a3b8" name="Total Due" />
              <Bar dataKey="collected" fill="#22c55e" name="Collected" />
              <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCollectionReport;
