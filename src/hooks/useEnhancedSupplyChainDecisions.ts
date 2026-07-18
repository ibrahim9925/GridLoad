// @ts-nocheck
import { useMemo } from "react";
import { useEnhancedCapitalTracking } from "./useEnhancedCapitalTracking";
import { useEnhancedSupplierIntelligence } from "./useEnhancedSupplierIntelligence";

export interface EnhancedOrderRecommendation {
  productId: string;
  productName: string;
  supplierName: string;
  currentCoverage: number;
  targetCoverage: number;
  recommendedQuantity: number;
  estimatedCost: number;
  expectedROI: number;
  profitPerUnit: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  action: 'order_now' | 'wait_for_clearance' | 'monitor' | 'delay';
  riskLevel: 'low' | 'medium' | 'high';
  supplierPerformanceScore: number;
  seasonalAdjustment: number;
}

export interface EnhancedDecisionSummary {
  totalRecommendedSpend: number;
  availableBudget: number;
  canAffordAll: boolean;
  prioritizedOrders: EnhancedOrderRecommendation[];
  liquidityWarning: boolean;
  seasonalAdjustments: string[];
  riskAssessment: {
    highRiskOrders: number;
    totalRiskExposure: number;
    diversificationScore: number;
  };
  currentSeason: string;
  optimalOrderTiming: string[];
}

export const useEnhancedSupplyChainDecisions = () => {
  const { capitalData, companySettings } = useEnhancedCapitalTracking();
  const { skuAnalytics, supplierPerformance, getCurrentSeason } = useEnhancedSupplierIntelligence();

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
          riskAssessment: {
            highRiskOrders: 0,
            totalRiskExposure: 0,
            diversificationScore: 100,
          },
          currentSeason: getCurrentSeason(),
          optimalOrderTiming: [],
        }
      };
    }

    const recommendations: EnhancedOrderRecommendation[] = [];
    const liquidityBuffer = companySettings?.liquidityBufferPercentage || 30;
    const minLiquidityBuffer = capitalData.availableLiquidity * (liquidityBuffer / 100);
    const availableForOrders = Math.max(0, capitalData.availableLiquidity - minLiquidityBuffer);

    skuAnalytics.forEach(sku => {
      if (!sku.reorderNeeded) return;

      const supplier = supplierPerformance.find(s => s.supplierName === sku.supplierName);
      if (!supplier) return;

      // Enhanced calculation with seasonal and supplier factors
      const coverageGapMonths = Math.max(sku.targetCoverage - sku.coverage, 0.5);
      const seasonalMultiplier = sku.seasonalFactor || 1.0;
      const recommendedQuantity = Math.ceil(sku.monthlySales * coverageGapMonths * seasonalMultiplier);
      
      // More sophisticated cost estimation
      const supplierCostFactor = 1 - (supplier.avgMargin / 100); // Reverse-engineer cost from margin
      const unitCost = sku.profitPerUnit > 0 ? 
        (sku.profitPerUnit / supplierCostFactor) : 
        150; // Default cost
      const estimatedCost = recommendedQuantity * unitCost;
      
      // Risk-adjusted ROI calculation
      const baseROI = estimatedCost > 0 ? (sku.profitPerUnit * recommendedQuantity / estimatedCost) * 100 : 0;
      const riskAdjustment = supplier.riskProfile === 'low' ? 1.1 : supplier.riskProfile === 'high' ? 0.8 : 1.0;
      const expectedROI = baseROI * riskAdjustment;

      // Enhanced priority calculation
      let priority: EnhancedOrderRecommendation['priority'] = 'medium';
      const urgencyScore = (sku.targetCoverage - sku.coverage) / sku.targetCoverage;
      const profitabilityScore = sku.profitPerUnit / 1000; // Normalize
      const supplierScore = supplier.performanceScore / 100;
      
      const compositeScore = (urgencyScore * 0.4) + (profitabilityScore * 0.3) + (supplierScore * 0.3);
      
      if (compositeScore > 0.8 || sku.currentStock <= 10) priority = 'critical';
      else if (compositeScore > 0.6 || sku.coverage < sku.targetCoverage * 0.5) priority = 'high';
      else if (compositeScore > 0.4) priority = 'medium';
      else priority = 'low';

      // Intelligent decision logic
      let action: EnhancedOrderRecommendation['action'] = 'monitor';
      let reasoning = '';

      if (availableForOrders < estimatedCost * 1.5) {
        action = 'delay';
        reasoning = `Insufficient liquidity - need ₪${(estimatedCost * 1.5).toLocaleString()} (have ₪${availableForOrders.toLocaleString()})`;
      } else if (capitalData.frozenCapital > capitalData.availableLiquidity * 0.6) {
        action = 'wait_for_clearance';
        reasoning = `High frozen capital ratio (${((capitalData.frozenCapital / capitalData.availableLiquidity) * 100).toFixed(1)}%) - wait for container clearance`;
      } else if (priority === 'critical') {
        action = 'order_now';
        reasoning = `Critical stock level (${sku.coverage.toFixed(1)} months coverage) - immediate reorder needed`;
      } else if (priority === 'high') {
        action = 'order_now';
        reasoning = `Below target coverage (${sku.coverage.toFixed(1)}/${sku.targetCoverage.toFixed(1)} months) - reorder recommended`;
      } else if (supplier.riskProfile === 'high' && expectedROI < 20) {
        action = 'monitor';
        reasoning = `High supplier risk with low ROI (${expectedROI.toFixed(1)}%) - monitor market conditions`;
      } else {
        action = 'monitor';
        reasoning = `Stock adequate (${sku.coverage.toFixed(1)} months) - continue monitoring`;
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
        supplierPerformanceScore: supplier.performanceScore,
        seasonalAdjustment: seasonalMultiplier,
      });
    });

    // Advanced sorting with multiple criteria
    const prioritizedOrders = recommendations.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Secondary sort by risk-adjusted ROI
      const aScore = a.expectedROI * (a.riskLevel === 'low' ? 1.2 : a.riskLevel === 'high' ? 0.8 : 1.0);
      const bScore = b.expectedROI * (b.riskLevel === 'low' ? 1.2 : b.riskLevel === 'high' ? 0.8 : 1.0);
      
      return bScore - aScore;
    });

    const totalRecommendedSpend = recommendations
      .filter(r => r.action === 'order_now')
      .reduce((sum, r) => sum + r.estimatedCost, 0);

    // Risk assessment
    const highRiskOrders = recommendations.filter(r => r.riskLevel === 'high' && r.action === 'order_now').length;
    const totalRiskExposure = recommendations
      .filter(r => r.riskLevel === 'high' && r.action === 'order_now')
      .reduce((sum, r) => sum + r.estimatedCost, 0);
    
    // Supplier diversification score
    const uniqueSuppliers = new Set(recommendations.filter(r => r.action === 'order_now').map(r => r.supplierName));
    const diversificationScore = Math.min(100, (uniqueSuppliers.size / Math.max(recommendations.length, 1)) * 100);

    // Seasonal and timing insights
    const currentSeason = getCurrentSeason();
    const seasonalTargets = companySettings?.seasonalCoverageTargets || { winter: 2, spring: 2.5, summer: 3, autumn: 2.5 };
    const seasonalAdjustments = [
      `Current season: ${currentSeason} (target: ${seasonalTargets[currentSeason as keyof typeof seasonalTargets]} months)`,
      `Next season preparation: ${getCurrentSeason() === 'winter' ? 'Spring' : getCurrentSeason() === 'spring' ? 'Summer' : getCurrentSeason() === 'summer' ? 'Autumn' : 'Winter'} planning`,
      `Seasonal demand factors applied to ${recommendations.filter(r => r.seasonalAdjustment > 1).length} products`
    ];

    const optimalOrderTiming = [
      totalRecommendedSpend > availableForOrders ? 'Consider phased ordering due to budget constraints' : 'Sufficient budget for immediate orders',
      capitalData.frozenCapital > capitalData.availableLiquidity * 0.5 ? 'Wait for container clearance to improve liquidity' : 'Good liquidity position for ordering',
      highRiskOrders > 0 ? `${highRiskOrders} high-risk orders require extra review` : 'Risk profile acceptable for all recommendations'
    ];

    const summary: EnhancedDecisionSummary = {
      totalRecommendedSpend,
      availableBudget: availableForOrders,
      canAffordAll: totalRecommendedSpend <= availableForOrders,
      prioritizedOrders,
      liquidityWarning: capitalData.frozenCapital > capitalData.availableLiquidity * 0.7,
      seasonalAdjustments,
      riskAssessment: {
        highRiskOrders,
        totalRiskExposure,
        diversificationScore,
      },
      currentSeason,
      optimalOrderTiming,
    };

    return { recommendations: prioritizedOrders, summary };
  }, [skuAnalytics, supplierPerformance, capitalData, companySettings, getCurrentSeason]);

  return decisions;
};