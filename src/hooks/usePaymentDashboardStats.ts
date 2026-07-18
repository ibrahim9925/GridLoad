// @ts-nocheck
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDashboardStats {
  totalRevenue: number;
  outstandingPayments: number;
  outstandingCount: number;
  commissionsDue: number;
  commissionCount: number;
  collectedThisMonth: number;
  collectionRate: number;
  overduePayments: number;
  overdueCount: number;
  isLoading: boolean;
}

export const usePaymentDashboardStats = () => {
  const [stats, setStats] = useState<PaymentDashboardStats>({
    totalRevenue: 0,
    outstandingPayments: 0,
    outstandingCount: 0,
    commissionsDue: 0,
    commissionCount: 0,
    collectedThisMonth: 0,
    collectionRate: 0,
    overduePayments: 0,
    overdueCount: 0,
    isLoading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentStats();
  }, []);

  const fetchPaymentStats = async () => {
    try {
      console.log("📊 PaymentDashboard: Fetching payment statistics...");
      
      // Get current month boundaries
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Fetch data in parallel
      const [
        salesResult,
        paymentsResult,
        monthlyPaymentsResult,
        commissionResult,
        schedulesResult,
        overdueSchedulesResult
      ] = await Promise.all([
        // Total revenue from sales
        supabase.from("sales").select("total_amount, balance_due"),
        
        // All payments for collection rate calculation
        supabase.from("payments").select("amount, payment_date"),
        
        // This month's payments
        supabase
          .from("payments")
          .select("amount")
          .gte("payment_date", startOfMonth.toISOString().split('T')[0])
          .lte("payment_date", endOfMonth.toISOString().split('T')[0]),
        
        // Pending commission payments
        supabase
          .from("commission_payments")
          .select("total_commission")
          .eq("status", "pending"),
        
        // All payment schedules for outstanding calculation
        supabase
          .from("payment_schedules")
          .select("amount, status"),
        
        // Overdue payment schedules
        supabase
          .from("payment_schedules")
          .select("amount")
          .eq("status", "overdue")
      ]);

      // Check for errors
      if (salesResult.error) throw salesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (monthlyPaymentsResult.error) throw monthlyPaymentsResult.error;
      if (commissionResult.error) throw commissionResult.error;
      if (schedulesResult.error) throw schedulesResult.error;
      if (overdueSchedulesResult.error) throw overdueSchedulesResult.error;

      // Calculate statistics
      const sales = salesResult.data || [];
      const payments = paymentsResult.data || [];
      const monthlyPayments = monthlyPaymentsResult.data || [];
      const commissions = commissionResult.data || [];
      const schedules = schedulesResult.data || [];
      const overdueSchedules = overdueSchedulesResult.data || [];

      // Total revenue and outstanding
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const outstandingPayments = sales.reduce((sum, sale) => sum + (sale.balance_due || 0), 0);
      const outstandingCount = sales.filter(sale => (sale.balance_due || 0) > 0).length;

      // Commission statistics
      const commissionsDue = commissions.reduce((sum, comm) => sum + (comm.total_commission || 0), 0);
      const commissionCount = commissions.length;

      // Monthly collection
      const collectedThisMonth = monthlyPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

      // Collection rate (payments received vs total sales)
      const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const collectionRate = totalRevenue > 0 ? (totalPayments / totalRevenue) * 100 : 0;

      // Overdue statistics
      const overduePayments = overdueSchedules.reduce((sum, schedule) => sum + (schedule.amount || 0), 0);
      const overdueCount = overdueSchedules.length;

      const newStats = {
        totalRevenue,
        outstandingPayments,
        outstandingCount,
        commissionsDue,
        commissionCount,
        collectedThisMonth,
        collectionRate,
        overduePayments,
        overdueCount,
        isLoading: false,
      };

      setStats(newStats);
      console.log("✅ PaymentDashboard: Statistics loaded successfully", newStats);

    } catch (error) {
      console.error("❌ PaymentDashboard: Error fetching stats:", error);
      setStats(prev => ({ ...prev, isLoading: false }));
      toast({
        variant: "destructive",
        title: "Error loading payment statistics",
        description: "Please try again later.",
      });
    }
  };

  return {
    stats,
    refetch: fetchPaymentStats,
  };
};