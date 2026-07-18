// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CustomerSegment {
  customer_id: string;
  customer_name: string;
  total_value: number;
  last_purchase: string;
  purchase_frequency: number;
  avg_order_value: number;
  segment: 'high_value' | 'loyal' | 'at_risk' | 'new' | 'dormant';
  risk_score: number;
  lifetime_value: number;
}

interface SegmentSummary {
  segment: string;
  count: number;
  total_value: number;
  avg_value: number;
  percentage: number;
}

export const useCustomerSegmentation = () => {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [segmentSummary, setSegmentSummary] = useState<SegmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const segmentCustomer = (
    totalValue: number,
    daysSinceLastPurchase: number,
    purchaseFrequency: number,
    avgOrderValue: number
  ): { segment: CustomerSegment['segment']; riskScore: number } => {
    // High value customers
    if (totalValue > 10000 && daysSinceLastPurchase < 90) {
      return { segment: 'high_value', riskScore: 15 };
    }
    
    // Loyal customers
    if (purchaseFrequency >= 3 && daysSinceLastPurchase < 180) {
      return { segment: 'loyal', riskScore: 25 };
    }
    
    // At risk customers
    if (totalValue > 5000 && daysSinceLastPurchase > 180) {
      return { segment: 'at_risk', riskScore: 75 };
    }
    
    // New customers
    if (daysSinceLastPurchase < 60 && purchaseFrequency === 1) {
      return { segment: 'new', riskScore: 40 };
    }
    
    // Dormant customers
    if (daysSinceLastPurchase > 365) {
      return { segment: 'dormant', riskScore: 90 };
    }
    
    return { segment: 'loyal', riskScore: 35 };
  };

  const calculateLifetimeValue = (
    totalValue: number,
    purchaseFrequency: number,
    avgOrderValue: number
  ): number => {
    // Simplified LTV calculation: AOV * Purchase Frequency * Estimated Lifespan
    const estimatedLifespanMonths = 24; // 2 years average
    const monthlyPurchaseRate = purchaseFrequency / 12;
    return avgOrderValue * monthlyPurchaseRate * estimatedLifespanMonths;
  };

  const fetchCustomerSegmentation = async () => {
    try {
      setIsLoading(true);

      // Fetch customer sales data with proper column hints
      const { data: salesData, error } = await supabase
        .from("sales")
        .select(`
          customer_id,
          total_amount,
          sale_date,
          customers!sales_customer_id_fkey (contact_person, company_name)
        `)
        .order("sale_date", { ascending: false });

      if (error) throw error;

      // Group by customer
      const customerMap = new Map<string, {
        name: string;
        sales: any[];
        totalValue: number;
        lastPurchase: Date;
      }>();

      (salesData || []).forEach(sale => {
        const customerId = sale.customer_id;
        const customer = sale.customers as any;
        const customerName = customer?.contact_person || customer?.company_name || 'Unknown';
        const saleDate = new Date(sale.sale_date);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            name: customerName,
            sales: [],
            totalValue: 0,
            lastPurchase: saleDate
          });
        }
        
        const customerData = customerMap.get(customerId)!;
        customerData.sales.push(sale);
        customerData.totalValue += sale.total_amount;
        
        if (saleDate > customerData.lastPurchase) {
          customerData.lastPurchase = saleDate;
        }
      });

      // Calculate segments
      const segmentedCustomers: CustomerSegment[] = Array.from(customerMap.entries()).map(([customerId, data]) => {
        const purchaseFrequency = data.sales.length;
        const avgOrderValue = data.totalValue / purchaseFrequency;
        const daysSinceLastPurchase = Math.floor((Date.now() - data.lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        const { segment, riskScore } = segmentCustomer(
          data.totalValue,
          daysSinceLastPurchase,
          purchaseFrequency,
          avgOrderValue
        );

        const lifetimeValue = calculateLifetimeValue(data.totalValue, purchaseFrequency, avgOrderValue);

        return {
          customer_id: customerId,
          customer_name: data.name,
          total_value: data.totalValue,
          last_purchase: data.lastPurchase.toISOString().split('T')[0],
          purchase_frequency: purchaseFrequency,
          avg_order_value: avgOrderValue,
          segment,
          risk_score: riskScore,
          lifetime_value: lifetimeValue
        };
      });

      setSegments(segmentedCustomers);

      // Calculate segment summary
      const segmentCounts = new Map<string, { count: number; totalValue: number }>();
      
      segmentedCustomers.forEach(customer => {
        const current = segmentCounts.get(customer.segment) || { count: 0, totalValue: 0 };
        segmentCounts.set(customer.segment, {
          count: current.count + 1,
          totalValue: current.totalValue + customer.total_value
        });
      });

      const totalCustomers = segmentedCustomers.length;
      const summary = Array.from(segmentCounts.entries()).map(([segment, data]) => ({
        segment: segment.replace('_', ' ').toUpperCase(),
        count: data.count,
        total_value: data.totalValue,
        avg_value: data.totalValue / data.count,
        percentage: (data.count / totalCustomers) * 100
      }));

      setSegmentSummary(summary);

    } catch (error) {
      console.error("Error fetching customer segmentation:", error);
      toast({
        variant: "destructive",
        title: "Error loading customer segments",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerSegmentation();
  }, []);

  return {
    segments,
    segmentSummary,
    isLoading,
    refetch: fetchCustomerSegmentation,
  };
};
