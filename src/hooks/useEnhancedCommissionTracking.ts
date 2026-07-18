// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CommissionCalculation {
  sales_rep_id: string;
  base_commission: number;
  bonus_commission: number;
  total_commission: number;
  sales_total: number;
  target_amount: number;
  achievement_percentage: number;
}

interface CommissionTarget {
  id: string;
  sales_rep_id: string;
  target_amount: number;
  target_period_start: string;
  target_period_end: string;
  bonus_threshold: number;
  bonus_rate: number;
}

export const useEnhancedCommissionTracking = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  // Calculate commission for a specific sale
  const calculateSaleCommission = async (saleId: string) => {
    try {
      console.log("💼 CommissionTracking: Calculating commission for sale:", saleId);
      
      // Get sale details with sales rep info using proper column hints
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`
          *,
          staff!sales_sales_rep_id_fkey (commission_rate)
        `)
        .eq("id", saleId)
        .single();
      
      if (saleError) throw saleError;
      
      if (!sale.sales_rep_id) {
        console.log("⚠️ CommissionTracking: No sales rep assigned to this sale");
        return null;
      }
      
      const staff = sale.staff as any;
      const commissionRate = staff?.commission_rate || 0;
      const baseCommission = (sale.total_amount * commissionRate) / 100;
      
      // Check for bonus eligibility
      const bonusCommission = await calculateBonusCommission(
        sale.sales_rep_id,
        sale.total_amount,
        sale.sale_date
      );
      
      const totalCommission = baseCommission + bonusCommission;
      
      // Update sale with commission amount
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          commission_amount: totalCommission,
          updated_at: new Date().toISOString()
        })
        .eq("id", saleId);
      
      if (updateError) throw updateError;
      
      console.log("✅ CommissionTracking: Commission calculated", {
        baseCommission,
        bonusCommission,
        totalCommission
      });
      
      return {
        base_commission: baseCommission,
        bonus_commission: bonusCommission,
        total_commission: totalCommission
      };
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error calculating commission:", error);
      toast({
        variant: "destructive",
        title: "Error calculating commission",
        description: "Please try again later.",
      });
      throw error;
    }
  };

  // Calculate bonus commission based on targets
  const calculateBonusCommission = async (
    salesRepId: string,
    saleAmount: number,
    saleDate: string
  ): Promise<number> => {
    try {
      // Get active target for the sale date
      const { data: target, error: targetError } = await supabase
        .from("commission_targets")
        .select("*")
        .eq("sales_rep_id", salesRepId)
        .lte("target_period_start", saleDate)
        .gte("target_period_end", saleDate)
        .single();
      
      if (targetError || !target) {
        return 0; // No target found, no bonus
      }
      
      // Get total sales for the period
      const { data: periodSales, error: salesError } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("sales_rep_id", salesRepId)
        .gte("sale_date", target.target_period_start)
        .lte("sale_date", target.target_period_end);
      
      if (salesError) throw salesError;
      
      const totalSales = periodSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const achievementPercentage = (totalSales / target.target_amount) * 100;
      
      // Calculate bonus if exceeded threshold
      if (achievementPercentage >= target.bonus_threshold) {
        const excessAmount = totalSales - target.target_amount;
        const bonusCommission = (excessAmount * target.bonus_rate) / 100;
        return Math.max(0, bonusCommission);
      }
      
      return 0;
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error calculating bonus:", error);
      return 0;
    }
  };

  // Generate commission report for a period
  const generateCommissionReport = async (
    startDate: string,
    endDate: string,
    salesRepId?: string
  ) => {
    try {
      console.log("📊 CommissionTracking: Generating commission report", {
        startDate, endDate, salesRepId
      });
      
      setIsCalculating(true);
      
      let query = supabase
        .from("sales")
        .select(`
          *,
          staff!sales_sales_rep_id_fkey (id, full_name, commission_rate)
        `)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate)
        .not("sales_rep_id", "is", null);
      
      if (salesRepId) {
        query = query.eq("sales_rep_id", salesRepId);
      }
      
      const { data: sales, error: salesError } = await query;
      
      if (salesError) throw salesError;
      
      // Group sales by sales rep
      const salesByRep = sales?.reduce((acc, sale) => {
        const repId = sale.sales_rep_id;
        if (!acc[repId]) {
          acc[repId] = {
            sales_rep: sale.staff,
            sales: [],
            totals: {
              sales_total: 0,
              base_commission: 0,
              bonus_commission: 0,
              total_commission: 0
            }
          };
        }
        
        acc[repId].sales.push(sale);
        acc[repId].totals.sales_total += sale.total_amount;
        acc[repId].totals.base_commission += sale.commission_amount || 0;
        
        return acc;
      }, {} as any) || {};
      
      // Calculate bonus commissions for each rep
      for (const repId of Object.keys(salesByRep)) {
        const bonusCommission = await calculatePeriodBonusCommission(
          repId,
          startDate,
          endDate,
          salesByRep[repId].totals.sales_total
        );
        
        salesByRep[repId].totals.bonus_commission = bonusCommission;
        salesByRep[repId].totals.total_commission = 
          salesByRep[repId].totals.base_commission + bonusCommission;
      }
      
      console.log("✅ CommissionTracking: Report generated successfully");
      
      return Object.values(salesByRep);
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error generating commission report",
        description: "Please try again later.",
      });
      throw error;
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate period bonus commission
  const calculatePeriodBonusCommission = async (
    salesRepId: string,
    startDate: string,
    endDate: string,
    totalSales: number
  ): Promise<number> => {
    try {
      // Get targets for the period
      const { data: targets, error: targetError } = await supabase
        .from("commission_targets")
        .select("*")
        .eq("sales_rep_id", salesRepId)
        .or(`target_period_start.lte.${endDate},target_period_end.gte.${startDate}`);
      
      if (targetError || !targets || targets.length === 0) {
        return 0;
      }
      
      let totalBonus = 0;
      
      for (const target of targets) {
        const achievementPercentage = (totalSales / target.target_amount) * 100;
        
        if (achievementPercentage >= target.bonus_threshold) {
          const excessAmount = Math.max(0, totalSales - target.target_amount);
          const bonus = (excessAmount * target.bonus_rate) / 100;
          totalBonus += bonus;
        }
      }
      
      return totalBonus;
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error calculating period bonus:", error);
      return 0;
    }
  };

  // Process commission payment
  const processCommissionPayment = async (
    salesRepId: string,
    periodStart: string,
    periodEnd: string,
    amount: number,
    paymentMethod: string = "bank_transfer"
  ) => {
    try {
      console.log("💳 CommissionTracking: Processing commission payment");
      
      // Create commission payment record
      const { data: payment, error: paymentError } = await supabase
        .from("commission_payments")
        .insert({
          sales_rep_id: salesRepId,
          period_start: periodStart,
          period_end: periodEnd,
          total_commission: amount,
          payment_method: paymentMethod,
          status: "paid",
          payment_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      // Mark sales as commission paid
      const { error: salesUpdateError } = await supabase
        .from("sales")
        .update({ commission_paid: true })
        .eq("sales_rep_id", salesRepId)
        .gte("sale_date", periodStart)
        .lte("sale_date", periodEnd);
      
      if (salesUpdateError) throw salesUpdateError;
      
      console.log("✅ CommissionTracking: Commission payment processed");
      
      toast({
        title: "Commission payment processed",
        description: `Payment of $${amount.toFixed(2)} has been recorded.`,
      });
      
      return payment;
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error processing payment:", error);
      toast({
        variant: "destructive",
        title: "Error processing commission payment",
        description: "Please try again later.",
      });
      throw error;
    }
  };

  // Get commission performance analytics
  const getCommissionAnalytics = async (salesRepId?: string) => {
    try {
      console.log("📈 CommissionTracking: Getting commission analytics");
      
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().substring(0, 7);
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
        .toISOString().substring(0, 7);
      
      let salesQuery = supabase
        .from("sales")
        .select("total_amount, commission_amount, sale_date, sales_rep_id")
        .not("sales_rep_id", "is", null);
      
      if (salesRepId) {
        salesQuery = salesQuery.eq("sales_rep_id", salesRepId);
      }
      
      const { data: sales, error: salesError } = await salesQuery;
      
      if (salesError) throw salesError;
      
      // Calculate analytics
      const thisMonthSales = sales?.filter(sale => 
        sale.sale_date.startsWith(currentMonth)
      ) || [];
      
      const lastMonthSales = sales?.filter(sale => 
        sale.sale_date.startsWith(lastMonth)
      ) || [];
      
      const thisMonthCommission = thisMonthSales.reduce(
        (sum, sale) => sum + (sale.commission_amount || 0), 0
      );
      
      const lastMonthCommission = lastMonthSales.reduce(
        (sum, sale) => sum + (sale.commission_amount || 0), 0
      );
      
      const growthRate = lastMonthCommission > 0 
        ? ((thisMonthCommission - lastMonthCommission) / lastMonthCommission) * 100 
        : 0;
      
      return {
        thisMonthCommission,
        lastMonthCommission,
        growthRate,
        thisMonthSales: thisMonthSales.length,
        averageCommissionPerSale: thisMonthSales.length > 0 
          ? thisMonthCommission / thisMonthSales.length 
          : 0
      };
      
    } catch (error) {
      console.error("❌ CommissionTracking: Error getting analytics:", error);
      return null;
    }
  };

  return {
    isCalculating,
    calculateSaleCommission,
    generateCommissionReport,
    processCommissionPayment,
    getCommissionAnalytics,
  };
};
