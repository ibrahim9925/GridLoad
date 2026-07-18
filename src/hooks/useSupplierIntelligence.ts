// @ts-nocheck
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  averageMargin: number;
  reliabilityScore: number;
  averageLeadTime: number;
  liquidityFreezeDuration: number;
  totalOrders: number;
  roiRanking: number;
  riskProfile: 'low' | 'medium' | 'high';
}

export interface SKUAnalytics {
  productId: string;
  productName: string;
  currentStock: number;
  inTransitStock: number;
  monthlySales: number;
  coverage: number;
  targetCoverage: number;
  profitPerUnit: number;
  supplierId: string;
  supplierName: string;
  reorderNeeded: boolean;
  seasonalFactor: number;
}

export const useSupplierIntelligence = () => {
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformance[]>([]);
  const [skuAnalytics, setSkuAnalytics] = useState<SKUAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1; // 1-12
    // Winter: Dec, Jan, Feb (12, 1, 2) = 2 months target
    // Summer: Jun, Jul, Aug (6, 7, 8) = 3 months target
    // Spring/Fall: other months = 2.5 months target
    if ([12, 1, 2].includes(month)) return { season: 'winter', targetCoverage: 2.0 };
    if ([6, 7, 8].includes(month)) return { season: 'summer', targetCoverage: 3.0 };
    return { season: 'spring-fall', targetCoverage: 2.5 };
  };

  const fetchSupplierPerformance = async () => {
    try {
      // Get suppliers with their purchase order data
      const { data: suppliers, error: supplierError } = await supabase
        .from("suppliers")
        .select(`
          id,
          name,
          purchase_orders (
            id,
            total_amount,
            order_date,
            expected_delivery_date,
            actual_delivery_date,
            purchase_order_items (
              unit_cost,
              quantity,
              product_id,
              products!purchase_order_items_product_id_fkey (
                id,
                name,
                standard_selling_price,
                current_stock
              )
            )
          )
        `);

      if (supplierError) throw supplierError;

      const performance: SupplierPerformance[] = (suppliers || []).map(supplier => {
        const orders = supplier.purchase_orders || [];
        let totalMargin = 0;
        let totalOrderValue = 0;
        let totalLeadTime = 0;
        let validLeadTimes = 0;

        orders.forEach(order => {
          totalOrderValue += order.total_amount || 0;
          
          // Calculate average margin from order items
          (order.purchase_order_items || []).forEach(item => {
            if (item.products) {
              const sellingPrice = item.products.standard_selling_price || 0;
              const costPrice = item.unit_cost || 0;
              const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;
              totalMargin += margin * (item.quantity || 0);
            }
          });

          // Calculate lead time if both dates exist
          if (order.expected_delivery_date && order.actual_delivery_date) {
            const expected = new Date(order.expected_delivery_date);
            const actual = new Date(order.actual_delivery_date);
            const leadTime = Math.abs(actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24);
            totalLeadTime += leadTime;
            validLeadTimes++;
          }
        });

        const averageMargin = orders.length > 0 ? totalMargin / orders.length : 0;
        const averageLeadTime = validLeadTimes > 0 ? totalLeadTime / validLeadTimes : 30; // default 30 days
        const reliabilityScore = Math.max(0, 100 - (averageLeadTime - 30) * 2); // Score based on lead time variance
        
        // Classify risk profile based on supplier name patterns
        let riskProfile: 'low' | 'medium' | 'high' = 'medium';
        const name = supplier.name.toLowerCase();
        if (name.includes('deye')) riskProfile = 'low';
        else if (name.includes('luxpower')) riskProfile = 'medium';
        else if (name.includes('sorotec')) riskProfile = 'high';

        const roiRanking = averageMargin / Math.max(averageLeadTime, 1); // Margin per day

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          averageMargin,
          reliabilityScore,
          averageLeadTime,
          liquidityFreezeDuration: averageLeadTime,
          totalOrders: orders.length,
          roiRanking,
          riskProfile,
        };
      });

      setSupplierPerformance(performance.sort((a, b) => b.roiRanking - a.roiRanking));

    } catch (error) {
      console.error("Error fetching supplier performance:", error);
      toast({
        variant: "destructive",
        title: "Error fetching supplier data",
        description: "Please try again later.",
      });
    }
  };

  const fetchSKUAnalytics = async () => {
    try {
      const { targetCoverage } = getCurrentSeason();

      // Get products with sales data and supplier info
      const { data: products, error: productError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          current_stock,
          standard_selling_price,
          cost_price,
          seasonal_factor,
          supplier_id,
          suppliers!products_supplier_id_fkey (
            id,
            name
          ),
          sale_items (
            quantity,
            sales (
              sale_date
            )
          )
        `)
        .eq("is_active", true);

      if (productError) throw productError;

      // Get in-transit stock from containers
      const { data: containerProducts, error: containerError } = await supabase
        .from("container_products")
        .select(`
          product_id,
          quantity,
          containers (
            status
          )
        `);

      if (containerError) throw containerError;

      const inTransitStock: { [productId: string]: number } = {};
      (containerProducts || []).forEach(cp => {
        if (cp.containers && ['in_transit', 'port_arrival', 'customs_processing'].includes(cp.containers.status)) {
          inTransitStock[cp.product_id] = (inTransitStock[cp.product_id] || 0) + (cp.quantity || 0);
        }
      });

      const analytics: SKUAnalytics[] = (products || []).map(product => {
        // Calculate monthly sales (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = (product.sale_items || []).filter(item => 
          item.sales && new Date(item.sales.sale_date) >= thirtyDaysAgo
        );

        const monthlySales = recentSales.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const currentStock = product.current_stock || 0;
        const inTransit = inTransitStock[product.id] || 0;
        const coverage = monthlySales > 0 ? (currentStock + inTransit) / monthlySales : 999;
        const profitPerUnit = (product.standard_selling_price || 0) - (product.cost_price || 0);
        const seasonalFactor = product.seasonal_factor || 1.0;
        const adjustedTargetCoverage = targetCoverage * seasonalFactor;

        return {
          productId: product.id,
          productName: product.name,
          currentStock,
          inTransitStock: inTransit,
          monthlySales,
          coverage,
          targetCoverage: adjustedTargetCoverage,
          profitPerUnit,
          supplierId: product.supplier_id || '',
          supplierName: product.suppliers?.name || 'Unknown',
          reorderNeeded: coverage < adjustedTargetCoverage,
          seasonalFactor,
        };
      });

      setSkuAnalytics(analytics.sort((a, b) => {
        // Sort by reorder priority: needed first, then by coverage ratio
        if (a.reorderNeeded && !b.reorderNeeded) return -1;
        if (!a.reorderNeeded && b.reorderNeeded) return 1;
        return (a.coverage / a.targetCoverage) - (b.coverage / b.targetCoverage);
      }));

    } catch (error) {
      console.error("Error fetching SKU analytics:", error);
      toast({
        variant: "destructive",
        title: "Error fetching product analytics",
        description: "Please try again later.",
      });
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSupplierPerformance(),
      fetchSKUAnalytics()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    supplierPerformance,
    skuAnalytics,
    isLoading,
    refetch: fetchAllData,
    getCurrentSeason,
  };
};