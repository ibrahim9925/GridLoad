// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CashFlowForecast {
  month: string;
  monthName: string;
  expectedIncome: number;
  actualIncome: number;
  scheduledPayments: number;
  overduePayments: number;
  projectedCashFlow: number;
  cumulativeCashFlow: number;
}

interface PaymentScheduleData {
  due_date: string;
  amount: number;
  status: string;
  sale_id: string;
}

export const useCashFlowForecasting = () => {
  const [forecasts, setForecasts] = useState<CashFlowForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalProjectedRevenue, setTotalProjectedRevenue] = useState(0);
  const [totalOverdueAmount, setTotalOverdueAmount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    generateCashFlowForecast();
  }, []);

  const generateCashFlowForecast = async () => {
    try {
      setIsLoading(true);

      // Get current date and calculate 12 months ahead
      const today = new Date();
      const forecastMonths: CashFlowForecast[] = [];
      let cumulativeAmount = 0;

      // Get existing cash balance (could be from settings or last month's closing)
      const startingBalance = 0; // This could be fetched from settings or calculated

      for (let i = 0; i < 12; i++) {
        const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthKey = forecastDate.toISOString().slice(0, 7); // YYYY-MM format
        const monthName = forecastDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const monthStart = `${monthKey}-01`;
        const monthEnd = new Date(forecastDate.getFullYear(), forecastDate.getMonth() + 1, 0)
          .toISOString().split('T')[0];

        // Get payment schedules for this month
        const { data: paymentSchedules, error: scheduleError } = await supabase
          .from('payment_schedules')
          .select('*')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd);

        if (scheduleError) throw scheduleError;

        // Get actual payments received in this month
        const { data: actualPayments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd);

        if (paymentsError) throw paymentsError;

        // Calculate expected income from payment schedules
        const scheduledAmount = paymentSchedules?.reduce((sum, ps) => sum + ps.amount, 0) || 0;
        
        // Calculate actual income received
        const actualAmount = actualPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        // Calculate overdue payments (schedules past due date that are unpaid)
        const overdueSchedules = paymentSchedules?.filter(ps => 
          ps.status === 'pending' && new Date(ps.due_date) < today
        ) || [];
        const overdueAmount = overdueSchedules.reduce((sum, ps) => sum + ps.amount, 0);

        // Project cash flow for this month
        const projectedIncome = i === 0 ? actualAmount : scheduledAmount; // Current month uses actual, future uses scheduled
        cumulativeAmount += projectedIncome;

        forecastMonths.push({
          month: monthKey,
          monthName,
          expectedIncome: scheduledAmount,
          actualIncome: actualAmount,
          scheduledPayments: scheduledAmount,
          overduePayments: overdueAmount,
          projectedCashFlow: projectedIncome,
          cumulativeCashFlow: cumulativeAmount
        });
      }

      // Calculate summary statistics
      const totalProjected = forecastMonths.reduce((sum, month) => sum + month.projectedCashFlow, 0);
      const totalOverdue = forecastMonths.reduce((sum, month) => sum + month.overduePayments, 0);

      setForecasts(forecastMonths);
      setTotalProjectedRevenue(totalProjected);
      setTotalOverdueAmount(totalOverdue);

    } catch (error: any) {
      console.error('Error generating cash flow forecast:', error);
      toast({
        variant: "destructive",
        title: "Forecast Error",
        description: "Failed to generate cash flow forecast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentScheduleInsights = async () => {
    try {
      // Get all pending payment schedules
      const { data: pendingSchedules, error: pendingError } = await supabase
        .from('payment_schedules')
        .select(`
          *,
          sales(customer_id, customers(contact_person))
        `)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Categorize by due date
      const today = new Date();
      const overdue = pendingSchedules?.filter(ps => new Date(ps.due_date) < today) || [];
      const dueThisWeek = pendingSchedules?.filter(ps => {
        const dueDate = new Date(ps.due_date);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return dueDate >= today && dueDate <= weekFromNow;
      }) || [];
      const dueThisMonth = pendingSchedules?.filter(ps => {
        const dueDate = new Date(ps.due_date);
        return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
      }) || [];

      return {
        totalPending: pendingSchedules?.length || 0,
        totalPendingAmount: pendingSchedules?.reduce((sum, ps) => sum + ps.amount, 0) || 0,
        overdue: overdue.length,
        overdueAmount: overdue.reduce((sum, ps) => sum + ps.amount, 0),
        dueThisWeek: dueThisWeek.length,
        dueThisWeekAmount: dueThisWeek.reduce((sum, ps) => sum + ps.amount, 0),
        dueThisMonth: dueThisMonth.length,
        dueThisMonthAmount: dueThisMonth.reduce((sum, ps) => sum + ps.amount, 0)
      };

    } catch (error: any) {
      console.error('Error getting payment insights:', error);
      return null;
    }
  };

  const generateCollectionReport = async (month: string) => {
    try {
      const monthStart = `${month}-01`;
      const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Get payment schedules for the month
      const { data: schedules, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select(`
          *,
          sales(customer_id, customers(contact_person, company_name))
        `)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);

      if (schedulesError) throw schedulesError;

      // Get actual payments for the month
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);

      if (paymentsError) throw paymentsError;

      const expectedAmount = schedules?.reduce((sum, s) => sum + s.amount, 0) || 0;
      const collectedAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const collectionRate = expectedAmount > 0 ? (collectedAmount / expectedAmount) * 100 : 0;

      return {
        month,
        expectedAmount,
        collectedAmount,
        collectionRate,
        schedulesCount: schedules?.length || 0,
        paymentsCount: payments?.length || 0,
        uncollectedAmount: expectedAmount - collectedAmount
      };

    } catch (error: any) {
      console.error('Error generating collection report:', error);
      return null;
    }
  };

  return {
    forecasts,
    isLoading,
    totalProjectedRevenue,
    totalOverdueAmount,
    generateCashFlowForecast,
    getPaymentScheduleInsights,
    generateCollectionReport
  };
};