// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface CommissionReport {
  sales_rep_name: string;
  total_commission: number;
  target_amount: number;
  achievement_percentage: number;
  sales_count: number;
}

const CommissionReports = () => {
  const [reportData, setReportData] = useState<CommissionReport[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommissionReports();
    fetchMonthlyTrends();
  }, []);

  const fetchCommissionReports = async () => {
    try {
      // Fetch current month commission data
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const { data: salesReps, error: repsError } = await supabase
        .from("staff")
        .select("id, full_name, commission_rate")
        .eq("role", "sales_rep")
        .eq("is_active", true);

      if (repsError) throw repsError;

      const reports: CommissionReport[] = [];

      for (const rep of salesReps || []) {
        // Get sales for current month
        const { data: sales, error: salesError } = await supabase
          .from("sales")
          .select("total_amount, commission_amount")
          .eq("sales_rep_id", rep.id)
          .gte("sale_date", `${currentMonth}-01`)
          .lte("sale_date", `${currentMonth}-31`);

        if (salesError) throw salesError;

        // Get commission target for current month
        const { data: target, error: targetError } = await supabase
          .from("commission_targets")
          .select("target_amount")
          .eq("sales_rep_id", rep.id)
          .gte("target_period_start", `${currentMonth}-01`)
          .lte("target_period_end", `${currentMonth}-31`)
          .single();

        if (targetError && targetError.code !== 'PGRST116') {
          console.error("Error fetching target:", targetError);
        }

        const totalCommission = sales?.reduce((sum, sale) => sum + (sale.commission_amount || 0), 0) || 0;
        const targetAmount = target?.target_amount || 0;
        const achievementPercentage = targetAmount > 0 ? (totalCommission / targetAmount) * 100 : 0;

        reports.push({
          sales_rep_name: rep.full_name,
          total_commission: totalCommission,
          target_amount: targetAmount,
          achievement_percentage: achievementPercentage,
          sales_count: sales?.length || 0,
        });
      }

      setReportData(reports);
    } catch (error) {
      console.error("Error fetching commission reports:", error);
      toast({
        variant: "destructive",
        title: "Error loading reports",
        description: "Please try again later.",
      });
    }
  };

  const fetchMonthlyTrends = async () => {
    try {
      // Generate last 6 months of data
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toISOString().slice(0, 7);
        
        const { data: payments, error } = await supabase
          .from("commission_payments")
          .select("total_commission")
          .gte("period_start", `${monthStr}-01`)
          .lte("period_end", `${monthStr}-31`)
          .eq("status", "paid");

        if (error) throw error;

        const totalCommission = payments?.reduce((sum, payment) => sum + (payment.total_commission || 0), 0) || 0;

        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          commission: totalCommission,
        });
      }

      setMonthlyTrends(months);
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAchievementBadge = (percentage: number) => {
    if (percentage >= 100) {
      return <Badge className="bg-green-100 text-green-800">Target Met</Badge>;
    } else if (percentage >= 75) {
      return <Badge className="bg-yellow-100 text-yellow-800">On Track</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Below Target</Badge>;
    }
  };

  const topPerformer = reportData.reduce((top, current) => 
    current.achievement_percentage > top.achievement_percentage ? current : top
  , reportData[0] || { achievement_percentage: 0, sales_rep_name: "N/A" });

  const totalCommissionPaid = reportData.reduce((sum, rep) => sum + rep.total_commission, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Commission (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalCommissionPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.reduce((sum, rep) => sum + rep.sales_count, 0)} sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {topPerformer?.achievement_percentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {topPerformer?.sales_rep_name}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Average Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {reportData.length > 0 ? 
                (reportData.reduce((sum, rep) => sum + rep.achievement_percentage, 0) / reportData.length).toFixed(1) : 0
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all reps
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Trends (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, "Commission"]} />
              <Line type="monotone" dataKey="commission" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Sales Rep */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Performance (Current Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.map((rep, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{rep.sales_rep_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {rep.sales_count} sales • Target: ${rep.target_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">${rep.total_commission.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {rep.achievement_percentage.toFixed(1)}% of target
                    </div>
                  </div>
                  {getAchievementBadge(rep.achievement_percentage)}
                </div>
              </div>
            ))}
            {reportData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No commission data found for the current month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Target Achievement Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sales_rep_name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, "Achievement"]} />
              <Bar dataKey="achievement_percentage" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionReports;
