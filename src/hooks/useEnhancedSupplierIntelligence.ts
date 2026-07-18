// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedSupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  avgMargin: number;
  reliability: number;
  avgLeadTime: number;
  riskProfile: 'low' | 'medium' | 'high';
  expectedROI: number;
  lastOrderDate: number | null;
  onTimeDeliveryRate: number;
  qualityScore: number;
  performanceScore: number;
}

export interface EnhancedSKUAnalytics {
  productId: string;
  productName: string;
  sku: string;
  supplierId: string | null;
  supplierName: string;
  currentStock: number;
  reorderPoint: number;
  salesVelocity: number;
  daysOfCoverage: number;
  totalSales90Days: number;
  averageSellingPrice: number;
  supplierCost: number;
  marginNIS: number;
  marginPercentage: number;
  leadTimeDays: number;
  reorderAction: 'urgent' | 'recommended' | 'monitor' | 'sufficient';
  recommendedOrderQty: number;
  totalRevenue90Days: number;
  // Legacy properties for backwards compatibility
  monthlySales: number;
  coverage: number;
  targetCoverage: number;
  reorderNeeded: boolean;
  profitPerUnit: number;
  seasonalFactor: number;
  lastRestockDate?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: 'order_now' | 'reorder_soon' | 'monitor';
  inTransitStock: number;
}

export const useEnhancedSupplierIntelligence = () => {
  const [supplierPerformance, setSupplierPerformance] = useState<EnhancedSupplierPerformance[]>([]);
  const [skuAnalytics, setSKUAnalytics] = useState<EnhancedSKUAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSupplierPerformance = async () => {
    try {
      // Use new database function for real supplier intelligence
      const { data: supplierIntelligence, error: supplierError } = await supabase.rpc('get_supplier_intelligence');
      if (supplierError) throw supplierError;

      const supplierPerformanceData: EnhancedSupplierPerformance[] = supplierIntelligence?.map(supplier => {
        const reliability = supplier.on_time_delivery_rate;
        const avgMargin = 25; // Will be calculated from actual product margins
        const avgLeadTime = 14; // Default, can be enhanced later
        const onTimeDeliveryRate = supplier.on_time_delivery_rate;
        const qualityScore = 4.2; // Default, can be enhanced later
        const performanceScore = supplier.performance_score;
        
        // Determine risk profile based on performance metrics
        let riskProfile: 'low' | 'medium' | 'high' = 'medium';
        if (performanceScore > 85 && onTimeDeliveryRate > 85) {
          riskProfile = 'low';
        } else if (performanceScore < 70 || onTimeDeliveryRate < 70) {
          riskProfile = 'high';
        }
        
        // Calculate expected ROI based on margin and reliability
        const expectedROI = (avgMargin * (reliability / 100));

        return {
          supplierId: supplier.supplier_id,
          supplierName: supplier.supplier_name,
          totalOrders: Number(supplier.total_orders),
          avgMargin,
          reliability,
          avgLeadTime,
          riskProfile,
          expectedROI,
          lastOrderDate: supplier.last_order_date ? new Date(supplier.last_order_date).getTime() : null,
          onTimeDeliveryRate,
          qualityScore,
          performanceScore
        };
      }) || [];

      setSupplierPerformance(supplierPerformanceData.sort((a, b) => b.performanceScore - a.performanceScore));
    } catch (error) {
      console.error('Error fetching enhanced supplier performance:', error);
    }
  };

  const fetchSKUAnalytics = async () => {
    try {
      console.log('🔄 Fetching real SKU analytics with sales velocity...');
      
      // Get comprehensive stock coverage analysis using the new function
      const { data: stockAnalysis, error: stockError } = await supabase
        .rpc('get_stock_coverage_analysis', {});

      if (stockError) {
        console.error('❌ Error fetching stock coverage:', stockError);
        throw stockError;
      }

      console.log('✅ Stock coverage analysis fetched:', stockAnalysis?.length || 0);

      // Get seasonal demand intelligence
      const { data: seasonalData, error: seasonalError } = await supabase
        .rpc('get_seasonal_demand_intelligence', {});

      if (seasonalError) {
        console.error('❌ Error fetching seasonal data:', seasonalError);
        // Continue without seasonal data
      }

      console.log('✅ Seasonal demand intelligence fetched:', seasonalData?.length || 0);

      // Get product-supplier relationships for enhanced data
      const { data: productSuppliers, error: supplierError } = await supabase
        .from('product_suppliers')
        .select(`
          product_id,
          supplier_id,
          cost_price,
          lead_time_days,
          suppliers!inner(name)
        `);

      if (supplierError) {
        console.error('❌ Error fetching product suppliers:', supplierError);
      }

      // Transform the data to match our interface
      const analytics: EnhancedSKUAnalytics[] = stockAnalysis?.map(item => {
        const seasonal = seasonalData?.find(s => s.product_id === item.product_id);
        const supplierData = productSuppliers?.find(ps => ps.product_id === item.product_id);
        const targetCoverage = getCurrentSeason() === 'winter' ? 2 : 
                              getCurrentSeason() === 'summer' ? 3 : 2.5;
        
        // Calculate recommended action based on real data
        const recommendedAction = item.urgency_level === 'critical' ? 'order_now' as const :
                                item.urgency_level === 'high' ? 'order_now' as const :
                                item.current_stock <= item.reorder_point ? 'reorder_soon' as const :
                                'monitor' as const;

        // Calculate margins (will be enhanced with real cost data later)
        const costPrice = supplierData?.cost_price || 0;
        const avgSellingPrice = 0; // Will be enhanced with sales data
        const marginNIS = avgSellingPrice - costPrice;
        const marginPercentage = avgSellingPrice > 0 ? (marginNIS / avgSellingPrice) * 100 : 0;

        // Calculate recommended order quantity based on lead time and velocity
        const leadTimeDays = supplierData?.lead_time_days || item.lead_time_days || 14;
        const dailySales = item.avg_daily_sales || 0;
        const safetyStock = Math.ceil(dailySales * 7); // 1 week safety
        const recommendedOrderQty = item.current_stock <= item.reorder_point ? 
          Math.max(safetyStock, item.recommended_order_quantity || 50) : 0;

        return {
          productId: item.product_id,
          productName: item.product_name || 'Unknown Product',
          sku: item.product_id, // Using product_id as SKU for now
          supplierId: supplierData?.supplier_id || null,
          supplierName: item.supplier_name || 'Unknown Supplier',
          currentStock: item.current_stock || 0,
          reorderPoint: item.reorder_point || 20,
          salesVelocity: dailySales * 30, // Convert daily to monthly
          daysOfCoverage: Math.round(item.days_of_coverage || 0),
          totalSales90Days: Math.round(dailySales * 90),
          averageSellingPrice: avgSellingPrice,
          supplierCost: costPrice,
          marginNIS,
          marginPercentage: Math.round(marginPercentage * 100) / 100,
          leadTimeDays,
          reorderAction: item.urgency_level === 'critical' ? 'urgent' as const :
                        item.urgency_level === 'high' ? 'recommended' as const :
                        item.current_stock <= item.reorder_point ? 'monitor' as const : 'sufficient' as const,
          recommendedOrderQty,
          totalRevenue90Days: Math.round(dailySales * 90 * avgSellingPrice),
          // Legacy properties for backwards compatibility
          monthlySales: Math.round(dailySales * 30),
          coverage: Math.round(item.days_of_coverage / 30 || 0),
          targetCoverage,
          reorderNeeded: item.current_stock <= item.reorder_point,
          profitPerUnit: marginNIS,
          seasonalFactor: seasonal?.seasonal_multiplier || 1,
          lastRestockDate: null, // Will be enhanced
          priority: item.urgency_level as 'critical' | 'high' | 'medium' | 'low',
          recommendedAction,
          inTransitStock: 0, // Will be enhanced with container data
        };
      }) || [];

      console.log('✅ Real SKU analytics calculated:', analytics.length);
      setSKUAnalytics(analytics);
    } catch (error) {
      console.error('❌ Error in fetchSKUAnalytics:', error);
      setSKUAnalytics([]);
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

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'autumn';
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