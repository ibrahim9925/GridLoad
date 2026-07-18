// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SalesRepPerformance {
  sales_rep_id: string;
  full_name: string;
  total_sales: number;
  total_revenue: number;
  commission_earned: number;
  conversion_rate: number;
  average_deal_size: number;
}

interface SalesMetrics {
  total_revenue: number;
  total_sales: number;
  average_deal_size: number;
  conversion_rate: number;
}

interface ConversionFunnel {
  leads: number;
  contacted: number;
  quoted: number;
  closed_won: number;
}

export const useSalesPerformanceAnalytics = (dateRange?: any) => {
  const [salesRepPerformance, setSalesRepPerformance] = useState<SalesRepPerformance[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    total_revenue: 0,
    total_sales: 0,
    average_deal_size: 0,
    conversion_rate: 0,
  });
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel>({
    leads: 0,
    contacted: 0,
    quoted: 0,
    closed_won: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSalesPerformance = async () => {
    try {
      console.log("📊 Sales Performance: Fetching analytics data...");
      
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          sales_rep_id,
          total_amount,
          commission_amount,
          staff!sales_sales_rep_id_fkey (
            full_name
          )
        `)
        .not("sales_rep_id", "is", null);

      if (salesError) {
        throw salesError;
      }

      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          assigned_to,
          status
        `)
        .not("assigned_to", "is", null);

      if (leadsError) {
        throw leadsError;
      }

      console.log("✅ Sales Performance: Successfully fetched data");

      // Process the data
      const performanceMap = new Map<string, SalesRepPerformance>();
      let totalRevenue = 0;
      let totalSales = 0;

      // Process sales data
      salesData.forEach(sale => {
        if (!sale.sales_rep_id || !sale.staff) return;
        
        const repId = sale.sales_rep_id;
        const fullName = (sale.staff as any)?.full_name || "Unknown";
        
        if (!performanceMap.has(repId)) {
          performanceMap.set(repId, {
            sales_rep_id: repId,
            full_name: fullName,
            total_sales: 0,
            total_revenue: 0,
            commission_earned: 0,
            conversion_rate: 0,
            average_deal_size: 0,
          });
        }

        const performance = performanceMap.get(repId)!;
        performance.total_sales += 1;
        performance.total_revenue += sale.total_amount;
        performance.commission_earned += sale.commission_amount || 0;
        
        totalRevenue += sale.total_amount;
        totalSales += 1;
      });

      // Process leads data for conversion rates
      const leadsMap = new Map<string, { total: number; converted: number }>();
      const funnelData = { leads: 0, contacted: 0, quoted: 0, closed_won: 0 };
      
      leadsData.forEach(lead => {
        funnelData.leads += 1;
        
        if (lead.status === "contacted") funnelData.contacted += 1;
        if (lead.status === "quoted") funnelData.quoted += 1;
        if (lead.status === "closed_won") funnelData.closed_won += 1;
        
        if (!lead.assigned_to) return;
        
        if (!leadsMap.has(lead.assigned_to)) {
          leadsMap.set(lead.assigned_to, { total: 0, converted: 0 });
        }
        
        const leadStats = leadsMap.get(lead.assigned_to)!;
        leadStats.total += 1;
        if (lead.status === "closed_won") {
          leadStats.converted += 1;
        }
      });

      // Calculate final metrics
      performanceMap.forEach((performance, repId) => {
        const leadStats = leadsMap.get(repId);
        if (leadStats && leadStats.total > 0) {
          performance.conversion_rate = (leadStats.converted / leadStats.total) * 100;
        }
        
        if (performance.total_sales > 0) {
          performance.average_deal_size = performance.total_revenue / performance.total_sales;
        }
      });

      setSalesRepPerformance(Array.from(performanceMap.values()));
      setSalesMetrics({
        total_revenue: totalRevenue,
        total_sales: totalSales,
        average_deal_size: totalSales > 0 ? totalRevenue / totalSales : 0,
        conversion_rate: funnelData.leads > 0 ? (funnelData.closed_won / funnelData.leads) * 100 : 0,
      });
      setConversionFunnel(funnelData);
    } catch (error) {
      console.error("❌ Sales Performance: Error fetching analytics:", error);
      toast({
        variant: "destructive",
        title: "Error fetching sales performance",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesPerformance();
  }, [dateRange]);

  return {
    salesRepPerformance,
    salesMetrics,
    conversionFunnel,
    isLoading,
    refetch: fetchSalesPerformance,
  };
};
