// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CustomerLTV {
  customer_id: string;
  customer_name: string;
  total_value: number;
  avg_order_value: number;
  order_frequency: number;
  predicted_ltv: number;
  risk_score: number;
}

interface SalesPerformance {
  sales_rep_id: string;
  sales_rep_name: string;
  total_sales: number;
  sales_count: number;
  avg_deal_size: number;
  conversion_rate: number;
  target_achievement: number;
}

interface PaymentCollection {
  period: string;
  total_due: number;
  collected: number;
  overdue: number;
  collection_rate: number;
  avg_collection_time: number;
}

interface OverduePayment {
  id: string;
  customer_name: string;
  amount: number;
  days_overdue: number;
  sale_date: string;
  last_contact: string | null;
}

export const useAdvancedAnalytics = (dateRange?: { from: Date; to: Date }) => {
  const [customerLTV, setCustomerLTV] = useState<CustomerLTV[]>([]);
  const [salesPerformance, setSalesPerformance] = useState<SalesPerformance[]>([]);
  const [paymentCollection, setPaymentCollection] = useState<PaymentCollection[]>([]);
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdvancedAnalytics = async () => {
    try {
      setIsLoading(true);

      // Build date filters
      let salesQuery = supabase.from("sales").select(`
        id, customer_id, sales_rep_id, total_amount, sale_date, created_at,
        customers!sales_customer_id_fkey (contact_person),
        staff!sales_sales_rep_id_fkey (full_name)
      `);

      let paymentsQuery = supabase.from("payments").select(`
        id, sale_id, amount, payment_date, created_at,
        sales!payments_sale_id_fkey (customer_id, total_amount, customers!sales_customer_id_fkey (contact_person))
      `);

      let schedulesQuery = supabase.from("payment_schedules").select(`
        id, sale_id, amount, due_date, status,
        sales!payment_schedules_sale_id_fkey (customer_id, customers!sales_customer_id_fkey (contact_person))
      `);

      if (dateRange) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        
        salesQuery = salesQuery.gte("sale_date", fromDate).lte("sale_date", toDate);
        paymentsQuery = paymentsQuery.gte("payment_date", fromDate).lte("payment_date", toDate);
        schedulesQuery = schedulesQuery.gte("due_date", fromDate).lte("due_date", toDate);
      }

      const [salesResult, paymentsResult, schedulesResult] = await Promise.all([
        salesQuery,
        paymentsQuery,
        schedulesQuery
      ]);

      if (salesResult.error) throw salesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (schedulesResult.error) throw schedulesResult.error;

      const sales = salesResult.data || [];
      const payments = paymentsResult.data || [];
      const schedules = schedulesResult.data || [];

      // Calculate Customer LTV
      const customerMap = new Map<string, {
        name: string;
        sales: any[];
        totalValue: number;
      }>();

      sales.forEach(sale => {
        const customerId = sale.customer_id;
        const customer = sale.customers as any;
        const customerName = customer?.contact_person || 'Unknown';
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            name: customerName,
            sales: [],
            totalValue: 0
          });
        }
        
        const customerData = customerMap.get(customerId)!;
        customerData.sales.push(sale);
        customerData.totalValue += sale.total_amount;
      });

      const customerLTVData = Array.from(customerMap.entries()).map(([customerId, data]) => {
        const avgOrderValue = data.totalValue / data.sales.length;
        const orderFrequency = data.sales.length;
        // Simple LTV prediction based on historical data
        const predictedLTV = avgOrderValue * orderFrequency * 2.5; // 2.5x multiplier for prediction
        const riskScore = Math.max(0, 100 - (orderFrequency * 10) - (avgOrderValue / 100));

        return {
          customer_id: customerId,
          customer_name: data.name,
          total_value: data.totalValue,
          avg_order_value: avgOrderValue,
          order_frequency: orderFrequency,
          predicted_ltv: predictedLTV,
          risk_score: Math.min(100, riskScore)
        };
      }).sort((a, b) => b.predicted_ltv - a.predicted_ltv);

      setCustomerLTV(customerLTVData);

      // Calculate Sales Performance
      const salesRepMap = new Map<string, {
        name: string;
        sales: any[];
        totalSales: number;
      }>();

      sales.forEach(sale => {
        if (sale.sales_rep_id) {
          const repId = sale.sales_rep_id;
          const staff = sale.staff as any;
          const repName = staff?.full_name || 'Unknown';
          
          if (!salesRepMap.has(repId)) {
            salesRepMap.set(repId, {
              name: repName,
              sales: [],
              totalSales: 0
            });
          }
          
          const rep = salesRepMap.get(repId)!;
          rep.sales.push(sale);
          rep.totalSales += sale.total_amount;
        }
      });

      const salesPerformanceData = Array.from(salesRepMap.entries()).map(([repId, data]) => {
        const avgDealSize = data.totalSales / data.sales.length;
        const conversionRate = 75; // Mock conversion rate - in real app calculate from leads
        const targetAchievement = Math.min(100, (data.totalSales / 50000) * 100); // $50k target

        return {
          sales_rep_id: repId,
          sales_rep_name: data.name,
          total_sales: data.totalSales,
          sales_count: data.sales.length,
          avg_deal_size: avgDealSize,
          conversion_rate: conversionRate,
          target_achievement: targetAchievement
        };
      }).sort((a, b) => b.total_sales - a.total_sales);

      setSalesPerformance(salesPerformanceData);

      // Calculate Payment Collection data
      const monthlyCollections = new Map<string, {
        totalDue: number;
        collected: number;
        overdue: number;
      }>();

      payments.forEach(payment => {
        const month = new Date(payment.payment_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        
        if (!monthlyCollections.has(month)) {
          monthlyCollections.set(month, { totalDue: 0, collected: 0, overdue: 0 });
        }
        
        const data = monthlyCollections.get(month)!;
        data.collected += payment.amount;
        const sales = payment.sales as any;
        data.totalDue += sales?.total_amount || payment.amount;
      });

      const paymentCollectionData = Array.from(monthlyCollections.entries()).map(([period, data]) => ({
        period,
        total_due: data.totalDue,
        collected: data.collected,
        overdue: data.totalDue - data.collected,
        collection_rate: data.totalDue > 0 ? (data.collected / data.totalDue) * 100 : 0,
        avg_collection_time: 15 // Mock average collection time
      }));

      setPaymentCollection(paymentCollectionData);

      // Calculate Overdue Payments
      const overdueData = schedules
        .filter(schedule => schedule.status === 'overdue')
        .map(schedule => {
          const dueDate = new Date(schedule.due_date);
          const today = new Date();
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const sales = schedule.sales as any;
          const customer = sales?.customers as any;
          
          return {
            id: schedule.id,
            customer_name: customer?.contact_person || 'Unknown',
            amount: schedule.amount,
            days_overdue: daysOverdue,
            sale_date: schedule.due_date,
            last_contact: null // Mock - in real app track from CRM activities
          };
        })
        .sort((a, b) => b.days_overdue - a.days_overdue);

      setOverduePayments(overdueData);

    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      toast({
        variant: "destructive",
        title: "Error loading analytics data",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancedAnalytics();
  }, [dateRange]);

  return {
    customerLTV,
    salesPerformance,
    paymentCollection,
    overduePayments,
    isLoading,
    refetch: fetchAdvancedAnalytics,
  };
};
