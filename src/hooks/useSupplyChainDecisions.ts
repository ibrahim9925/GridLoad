// @ts-nocheck
import { useMemo } from "react";
import { useCapitalTracking } from "./useCapitalTracking";
import { useSupplierIntelligence } from "./useSupplierIntelligence";

export interface OrderRecommendation {
  productId: string;
  productName: string;
  supplierName: string;
  currentCoverage: number;
  targetCoverage: number;
  recommendedQuantity: number;
  estimatedCost: number;
  expectedROI: number;
  profitPerUnit: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  action: 'order_now' | 'wait_for_clearance' | 'monitor' | 'delay';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DecisionSummary {
  totalRecommendedSpend: number;
  availableBudget: number;
  canAffordAll: boolean;
  prioritizedOrders: OrderRecommendation[];
  liquidityWarning: boolean;
  seasonalAdjustments: string[];
}

export const useSupplyChainDecisions = () => {
  const { capitalData } = useCapitalTracking();
  const { skuAnalytics, supplierPerformance } = useSupplierIntelligence();

  const decisions = useMemo(() => {
    if (!skuAnalytics.length || !supplierPerformance.length) {
      return {
        recommendations: [],
        summary: {
          totalRecommendedSpend: 0,
          availableBudget: capitalData.availableLiquidity,
          canAffordAll: true,
          prioritizedOrders: [],
          liquidityWarning: false,
          seasonalAdjustments: [],
        }
      };
    }

    const recommendations: OrderRecommendation[] = [];
    const minLiquidityBuffer = capitalData.availableLiquidity * 0.3; // Keep 30% buffer
    const availableForOrders = Math.max(0, capitalData.availableLiquidity - minLiquidityBuffer);

    skuAnalytics.forEach(sku => {
      if (!sku.reorderNeeded) return;

      const supplier = supplierPerformance.find(s => s.supplierId === sku.supplierId);
      if (!supplier) return;

      // Calculate recommended order quantity based on coverage gap and seasonal factors
      const coverageGapMonths = Math.max(sku.targetCoverage - sku.coverage, 0.5);
      const recommendedQuantity = Math.ceil(sku.monthlySales * coverageGapMonths * sku.seasonalFactor);
      
      // Enhanced cost estimation using supplier data
      const unitCost = sku.profitPerUnit > 0 ? 
        (sku.profitPerUnit * 0.6) : // Assume 60% of profit as cost
        100; // Fallback cost
      const estimatedCost = recommendedQuantity * unitCost;
      const expectedROI = estimatedCost > 0 ? (sku.profitPerUnit * recommendedQuantity / estimatedCost) * 100 : 0;

      // Determine priority based on coverage gap and profitability
      const coverageGap = (sku.targetCoverage - sku.coverage) / sku.targetCoverage;
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (coverageGap > 0.8 && sku.profitPerUnit > 200) priority = 'high';
      else if (coverageGap > 0.5 || sku.profitPerUnit > 300) priority = 'medium';
      else priority = 'low';

      // Decision logic
      let action: OrderRecommendation['action'] = 'monitor';
      let reasoning = '';

      if (availableForOrders < estimatedCost * 1.5) {
        action = 'delay';
        reasoning = 'Insufficient liquidity - need $' + (estimatedCost * 1.5).toLocaleString();
      } else if (capitalData.frozenCapital > capitalData.availableLiquidity * 0.6) {
        action = 'wait_for_clearance';
        reasoning = 'High frozen capital ratio - wait for container clearance';
      } else if (sku.coverage < sku.targetCoverage * 0.3) {
        action = 'order_now';
        reasoning = 'Critical stock level - immediate reorder needed';
      } else if (sku.coverage < sku.targetCoverage * 0.7) {
        action = 'order_now';
        reasoning = 'Below target coverage - reorder recommended';
      } else {
        action = 'monitor';
        reasoning = 'Stock adequate - continue monitoring';
      }

      recommendations.push({
        productId: sku.productId,
        productName: sku.productName,
        supplierName: sku.supplierName,
        currentCoverage: sku.coverage,
        targetCoverage: sku.targetCoverage,
        recommendedQuantity,
        estimatedCost,
        expectedROI,
        profitPerUnit: sku.profitPerUnit,
        priority,
        reasoning,
        action,
        riskLevel: supplier.riskProfile,
      });
    });

    // Sort by priority and ROI
    const prioritizedOrders = recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.expectedROI - a.expectedROI;
    });

    const totalRecommendedSpend = recommendations
      .filter(r => r.action === 'order_now')
      .reduce((sum, r) => sum + r.estimatedCost, 0);

    const summary: DecisionSummary = {
      totalRecommendedSpend,
      availableBudget: availableForOrders,
      canAffordAll: totalRecommendedSpend <= availableForOrders,
      prioritizedOrders,
      liquidityWarning: capitalData.frozenCapital > capitalData.availableLiquidity * 0.7,
      seasonalAdjustments: [
        'Winter target: 2 months coverage',
        'Summer target: 3 months coverage',
        'Current season adjustments applied'
      ],
    };

    return { recommendations: prioritizedOrders, summary };
  }, [skuAnalytics, supplierPerformance, capitalData]);

  return decisions;
};