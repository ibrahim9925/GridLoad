// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Target, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CommissionTargetManager from "./CommissionTargetManager";
import CommissionPaymentTracker from "./CommissionPaymentTracker";
import CommissionReports from "./CommissionReports";

interface CommissionStats {
  totalCommissionEarned: number;
  pendingCommission: number;
  targetAchievement: number;
  salesRepsCount: number;
  averageCommissionRate: number;
}

const CommissionDashboard = () => {
  const [stats, setStats] = useState<CommissionStats>({
    totalCommissionEarned: 0,
    pendingCommission: 0,
    targetAchievement: 0,
    salesRepsCount: 0,
    averageCommissionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommissionStats();
  }, []);

  const fetchCommissionStats = async () => {
    try {
      setIsLoading(true);

      // Fetch commission payments
      const { data: commissionPayments, error: paymentsError } = await supabase
        .from("commission_payments")
        .select("*");

      if (paymentsError) throw paymentsError;

      // Fetch sales reps with commission data
      const { data: salesReps, error: repsError } = await supabase
        .from("staff")
        .select("*, commission_rate")
        .eq("role", "sales_rep");

      if (repsError) throw repsError;

      // Fetch commission targets for current month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: targets, error: targetsError } = await supabase
        .from("commission_targets")
        .select("*")
        .gte("target_period_start", `${currentMonth}-01`)
        .lte("target_period_end", `${currentMonth}-31`);

      if (targetsError) throw targetsError;

      // Calculate stats
      const totalEarned = commissionPayments
        ?.filter(p => p.status === "paid")
        .reduce((sum, p) => sum + (p.total_commission || 0), 0) || 0;

      const pendingCommission = commissionPayments
        ?.filter(p => p.status === "pending")
        .reduce((sum, p) => sum + (p.total_commission || 0), 0) || 0;

      const avgCommissionRate = salesReps
        ?.reduce((sum, rep) => sum + (rep.commission_rate || 0), 0) / (salesReps?.length || 1) || 0;

      // Calculate target achievement (simplified)
      const targetAchievement = targets?.length > 0 ? 85 : 0; // Mock calculation

      setStats({
        totalCommissionEarned: totalEarned,
        pendingCommission: pendingCommission,
        targetAchievement: targetAchievement,
        salesRepsCount: salesReps?.length || 0,
        averageCommissionRate: avgCommissionRate,
      });
    } catch (error) {
      console.error("Error fetching commission stats:", error);
      toast({
        variant: "destructive",
        title: "Error loading commission data",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Commission Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Commission Dashboard</h2>
        <Button onClick={fetchCommissionStats}>
          Refresh Data
        </Button>
      </div>

      {/* Commission Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalCommissionEarned.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${stats.pendingCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Target Achievement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.targetAchievement}%
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Sales Reps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.salesRepsCount}
            </div>
            <p className="text-xs text-muted-foreground">Active reps</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Avg Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {stats.averageCommissionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Commission rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Management Tabs */}
      <Tabs defaultValue="targets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="targets">Targets & Goals</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="targets">
          <CommissionTargetManager onTargetUpdate={fetchCommissionStats} />
        </TabsContent>

        <TabsContent value="payments">
          <CommissionPaymentTracker onPaymentUpdate={fetchCommissionStats} />
        </TabsContent>

        <TabsContent value="reports">
          <CommissionReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionDashboard;
