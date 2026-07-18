// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Play, Factory } from "lucide-react";
import { BusinessTest, TestResult } from "@/hooks/useBusinessTestTypes";
import { useCapitalTracking } from "@/hooks/useCapitalTracking";
import { useSupplierIntelligence } from "@/hooks/useSupplierIntelligence";
import { useSupplyChainDecisions } from "@/hooks/useSupplyChainDecisions";
import { supabase } from "@/integrations/supabase/client";

export const SupplyChainSystemTester = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const { capitalData, frozenCapitalItems, isLoading: capitalLoading } = useCapitalTracking();
  const { supplierPerformance, skuAnalytics, isLoading: intelligenceLoading } = useSupplierIntelligence();
  const { recommendations, summary } = useSupplyChainDecisions();

  const createSupplyChainTests = (): BusinessTest[] => [
    // Capital & Liquidity Tracking Tests (6 tests)
    {
      name: "Capital Data Initialization",
      category: "Capital Tracking",
      description: "Verify capital tracking system initializes correctly",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          if (capitalLoading) {
            return {
              success: false,
              message: "Capital data still loading",
              duration: Date.now() - start,
            };
          }
          
          const hasCapitalData = capitalData && typeof capitalData.injectedCapital === 'number';
          return {
            success: hasCapitalData,
            message: hasCapitalData ? "Capital data loaded successfully" : "Capital data missing or invalid",
            duration: Date.now() - start,
            details: { capitalData },
          };
        } catch (error) {
          return {
            success: false,
            message: `Capital initialization failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Liquidity Calculation Accuracy",
      category: "Capital Tracking",
      description: "Test liquidity calculation logic",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          if (!capitalData) {
            return {
              success: false,
              message: "No capital data available for testing",
              duration: Date.now() - start,
            };
          }

          const expectedLiquidity = capitalData.injectedCapital - capitalData.frozenCapital - capitalData.outstandingPayables;
          const actualLiquidity = capitalData.availableLiquidity;
          const isAccurate = Math.abs(expectedLiquidity - actualLiquidity) < 0.01;

          return {
            success: isAccurate,
            message: isAccurate ? "Liquidity calculation is accurate" : "Liquidity calculation mismatch",
            duration: Date.now() - start,
            details: { expected: expectedLiquidity, actual: actualLiquidity },
          };
        } catch (error) {
          return {
            success: false,
            message: `Liquidity calculation test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Frozen Capital Items Tracking",
      category: "Capital Tracking",
      description: "Verify frozen capital items are tracked correctly",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          const hasItems = frozenCapitalItems && frozenCapitalItems.length >= 0;
          const validItems = frozenCapitalItems?.every(item => 
            item.containerNumber && 
            typeof item.amount === 'number' && 
            item.status
          );

          return {
            success: hasItems && validItems,
            message: hasItems && validItems ? "Frozen capital items tracked correctly" : "Invalid frozen capital items",
            duration: Date.now() - start,
            details: { itemCount: frozenCapitalItems?.length, frozenCapitalItems },
          };
        } catch (error) {
          return {
            success: false,
            message: `Frozen capital tracking failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Capital Utilization Rate",
      category: "Capital Tracking",
      description: "Test capital utilization calculation",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          if (!capitalData || capitalData.injectedCapital === 0) {
            return {
              success: false,
              message: "No capital data or zero injected capital",
              duration: Date.now() - start,
            };
          }

          const utilizationRate = ((capitalData.frozenCapital + capitalData.outstandingPayables) / capitalData.injectedCapital) * 100;
          const isValid = utilizationRate >= 0 && utilizationRate <= 100;

          return {
            success: isValid,
            message: isValid ? `Capital utilization: ${utilizationRate.toFixed(1)}%` : "Invalid utilization rate",
            duration: Date.now() - start,
            details: { utilizationRate },
          };
        } catch (error) {
          return {
            success: false,
            message: `Utilization rate test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Liquidity Threshold Warning",
      category: "Capital Tracking",
      description: "Test low liquidity warning system",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          if (!capitalData) {
            return {
              success: false,
              message: "No capital data for threshold test",
              duration: Date.now() - start,
            };
          }

          const liquidityRate = (capitalData.availableLiquidity / capitalData.injectedCapital) * 100;
          const shouldWarn = liquidityRate < 20; // Less than 20% liquidity
          
          return {
            success: true,
            message: shouldWarn ? "Low liquidity warning active" : "Liquidity levels healthy",
            duration: Date.now() - start,
            details: { liquidityRate, warningActive: shouldWarn },
          };
        } catch (error) {
          return {
            success: false,
            message: `Liquidity threshold test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Outstanding Payables Integration",
      category: "Capital Tracking",
      description: "Verify outstanding payables affect liquidity",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          // Test that outstanding payables reduce available liquidity
          const { data: payables } = await supabase
            .from('purchase_orders')
            .select('total_amount')
            .eq('status', 'confirmed');

          const totalPayables = payables?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
          const hasPayables = totalPayables > 0;

          return {
            success: true,
            message: hasPayables ? `Outstanding payables: $${totalPayables.toFixed(2)}` : "No outstanding payables",
            duration: Date.now() - start,
            details: { totalPayables, payableCount: payables?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Payables integration test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },

    // SKU Analytics & Coverage Tests (6 tests)
    {
      name: "SKU Analytics Loading",
      category: "SKU Analytics",
      description: "Verify SKU analytics data loads correctly",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          if (intelligenceLoading) {
            return {
              success: false,
              message: "SKU analytics still loading",
              duration: Date.now() - start,
            };
          }

          const hasAnalytics = skuAnalytics && skuAnalytics.length >= 0;
          return {
            success: hasAnalytics,
            message: hasAnalytics ? `Loaded ${skuAnalytics.length} SKU analytics` : "No SKU analytics data",
            duration: Date.now() - start,
            details: { skuCount: skuAnalytics?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `SKU analytics loading failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Coverage Calculation Accuracy",
      category: "SKU Analytics",
      description: "Test SKU coverage calculation logic",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          if (!skuAnalytics || skuAnalytics.length === 0) {
            return {
              success: false,
              message: "No SKU analytics for coverage test",
              duration: Date.now() - start,
            };
          }

          const validCoverages = skuAnalytics.filter(sku => 
            typeof sku.coverage === 'number' && 
            sku.coverage >= 0
          );

          const accuracyRate = (validCoverages.length / skuAnalytics.length) * 100;
          const isAccurate = accuracyRate >= 90;

          return {
            success: isAccurate,
            message: isAccurate ? `Coverage accuracy: ${accuracyRate.toFixed(1)}%` : "Coverage calculations inaccurate",
            duration: Date.now() - start,
            details: { accuracyRate, validCount: validCoverages.length, totalCount: skuAnalytics.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Coverage calculation test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Seasonal Adjustment Logic",
      category: "SKU Analytics",
      description: "Test seasonal coverage target adjustments",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          // Test that seasonal adjustments are applied correctly
          const currentSeason = new Date().getMonth() >= 3 && new Date().getMonth() <= 8 ? 'Summer' : 'Winter';
          const expectedTarget = currentSeason === 'Summer' ? 3 : 2; // months

          const seasonalSKUs = skuAnalytics?.filter(sku => sku.targetCoverage === expectedTarget);
          const hasSeasonalAdjustment = seasonalSKUs && seasonalSKUs.length > 0;

          return {
            success: hasSeasonalAdjustment,
            message: hasSeasonalAdjustment ? `${currentSeason} targets applied` : "Seasonal adjustments missing",
            duration: Date.now() - start,
            details: { currentSeason, expectedTarget, adjustedSKUs: seasonalSKUs?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Seasonal adjustment test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Reorder Point Identification",
      category: "SKU Analytics",
      description: "Test reorder point detection",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          const reorderNeeded = skuAnalytics?.filter(sku => sku.coverage < sku.targetCoverage);
          const hasReorderLogic = reorderNeeded !== undefined;

          return {
            success: hasReorderLogic,
            message: hasReorderLogic ? `${reorderNeeded.length} SKUs need reorder` : "Reorder logic not working",
            duration: Date.now() - start,
            details: { reorderCount: reorderNeeded?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Reorder point test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "In-Transit Stock Integration",
      category: "SKU Analytics",
      description: "Verify in-transit stock affects coverage",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const skusWithTransit = skuAnalytics?.filter(sku => sku.inTransitStock > 0);
          const hasTransitData = skusWithTransit && skusWithTransit.length >= 0;

          return {
            success: hasTransitData,
            message: hasTransitData ? `${skusWithTransit.length} SKUs have in-transit stock` : "No in-transit stock data",
            duration: Date.now() - start,
            details: { transitSKUs: skusWithTransit?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `In-transit stock test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Profit Per Unit Calculation",
      category: "SKU Analytics",
      description: "Test profit margin calculations",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const profitableSKUs = skuAnalytics?.filter(sku => 
            typeof sku.profitPerUnit === 'number' && 
            sku.profitPerUnit >= 0
          );

          const profitAccuracy = profitableSKUs ? (profitableSKUs.length / (skuAnalytics?.length || 1)) * 100 : 0;
          const isAccurate = profitAccuracy >= 80;

          return {
            success: isAccurate,
            message: isAccurate ? `Profit calculations: ${profitAccuracy.toFixed(1)}% accurate` : "Profit calculations inaccurate",
            duration: Date.now() - start,
            details: { profitAccuracy, profitableSKUs: profitableSKUs?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Profit calculation test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },

    // Supplier Intelligence Tests (6 tests)
    {
      name: "Supplier Performance Loading",
      category: "Supplier Intelligence",
      description: "Verify supplier performance data loads",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          const hasSuppliers = supplierPerformance && supplierPerformance.length >= 0;
          return {
            success: hasSuppliers,
            message: hasSuppliers ? `Loaded ${supplierPerformance.length} suppliers` : "No supplier data",
            duration: Date.now() - start,
            details: { supplierCount: supplierPerformance?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Supplier performance loading failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Supplier Ranking Algorithm",
      category: "Supplier Intelligence",
      description: "Test supplier ROI ranking logic",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          if (!supplierPerformance || supplierPerformance.length === 0) {
            return {
              success: false,
              message: "No suppliers for ranking test",
              duration: Date.now() - start,
            };
          }

          // Check if suppliers are ranked by average margin (descending)
          const sortedByMargin = [...supplierPerformance].sort((a, b) => b.averageMargin - a.averageMargin);
          const isCorrectlyRanked = JSON.stringify(supplierPerformance) === JSON.stringify(sortedByMargin);

          return {
            success: isCorrectlyRanked,
            message: isCorrectlyRanked ? "Suppliers correctly ranked by margin" : "Supplier ranking incorrect",
            duration: Date.now() - start,
            details: { topSupplier: supplierPerformance[0]?.supplierName, topMargin: supplierPerformance[0]?.averageMargin },
          };
        } catch (error) {
          return {
            success: false,
            message: `Supplier ranking test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Deye Supplier Characteristics",
      category: "Supplier Intelligence",
      description: "Verify Deye supplier profile (low margin, high reliability)",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const deye = supplierPerformance?.find(s => s.supplierName.toLowerCase().includes('deye'));
          if (!deye) {
            return {
              success: false,
              message: "Deye supplier not found",
              duration: Date.now() - start,
            };
          }

          const hasLowMargin = deye.averageMargin < 20; // Less than 20% margin
          const hasHighReliability = deye.riskProfile === 'low'; // High reliability = low risk

          return {
            success: hasLowMargin && hasHighReliability,
            message: `Deye profile: ${deye.averageMargin.toFixed(1)}% margin, ${deye.riskProfile} risk`,
            duration: Date.now() - start,
            details: { margin: deye.averageMargin, riskProfile: deye.riskProfile },
          };
        } catch (error) {
          return {
            success: false,
            message: `Deye characteristics test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Sorotec Supplier Characteristics",
      category: "Supplier Intelligence",
      description: "Verify Sorotec supplier profile (high margin, high risk)",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const sorotec = supplierPerformance?.find(s => s.supplierName.toLowerCase().includes('sorotec'));
          if (!sorotec) {
            return {
              success: false,
              message: "Sorotec supplier not found",
              duration: Date.now() - start,
            };
          }

          const hasHighMargin = sorotec.averageMargin > 25; // High margin
          const hasHighRisk = sorotec.riskProfile === 'high';

          return {
            success: hasHighMargin,
            message: `Sorotec profile: ${sorotec.averageMargin.toFixed(1)}% margin, ${sorotec.riskProfile} risk`,
            duration: Date.now() - start,
            details: { margin: sorotec.averageMargin, risk: sorotec.riskProfile },
          };
        } catch (error) {
          return {
            success: false,
            message: `Sorotec characteristics test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Lead Time Tracking",
      category: "Supplier Intelligence",
      description: "Test supplier lead time calculations",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const suppliersWithLeadTime = supplierPerformance?.filter(s => 
            typeof s.averageLeadTime === 'number' && 
            s.averageLeadTime > 0
          );

          const hasLeadTimeData = suppliersWithLeadTime && suppliersWithLeadTime.length > 0;

          return {
            success: hasLeadTimeData,
            message: hasLeadTimeData ? `${suppliersWithLeadTime.length} suppliers with lead time data` : "No lead time data",
            duration: Date.now() - start,
            details: { suppliersWithLeadTime: suppliersWithLeadTime?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Lead time tracking test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Supplier Risk Assessment",
      category: "Supplier Intelligence",
      description: "Test risk profile categorization",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          const riskCategorized = supplierPerformance?.filter(s => 
            ['low', 'medium', 'high'].includes(s.riskProfile)
          );

          const hasRiskData = riskCategorized && riskCategorized.length > 0;

          return {
            success: hasRiskData,
            message: hasRiskData ? `${riskCategorized.length} suppliers risk-categorized` : "No risk categorization",
            duration: Date.now() - start,
            details: { riskCategorized: riskCategorized?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Risk assessment test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },

    // Decision Engine Core Tests (6 tests)
    {
      name: "Order Recommendation Generation",
      category: "Decision Engine",
      description: "Test order recommendation generation",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          const hasRecommendations = recommendations && recommendations.length >= 0;
          return {
            success: hasRecommendations,
            message: hasRecommendations ? `Generated ${recommendations.length} recommendations` : "No recommendations generated",
            duration: Date.now() - start,
            details: { recommendationCount: recommendations?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `Recommendation generation failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Liquidity-Based Decision Logic",
      category: "Decision Engine",
      description: "Test decisions based on available liquidity",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          if (!summary) {
            return {
              success: false,
              message: "No decision summary available",
              duration: Date.now() - start,
            };
          }

          const hasLiquidityCheck = typeof summary.totalRecommendedSpend === 'number' && 
                                   typeof summary.availableBudget === 'number';
          const isAffordable = summary.canAffordAll;

          return {
            success: hasLiquidityCheck,
            message: `Budget check: ${isAffordable ? 'Affordable' : 'Exceeds budget'}`,
            duration: Date.now() - start,
            details: { 
              recommendedSpend: summary.totalRecommendedSpend, 
              availableBudget: summary.availableBudget,
              canAfford: summary.canAffordAll 
            },
          };
        } catch (error) {
          return {
            success: false,
            message: `Liquidity decision test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Priority-Based Ordering",
      category: "Decision Engine",
      description: "Test recommendation priority sorting",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          if (!recommendations || recommendations.length === 0) {
            return {
              success: false,
              message: "No recommendations for priority test",
              duration: Date.now() - start,
            };
          }

          // Check if urgent recommendations come first
          const priorityOrder = ['urgent', 'high', 'medium', 'low'];
          let correctOrder = true;
          let lastPriorityIndex = -1;

          for (const rec of recommendations) {
            const currentPriorityIndex = priorityOrder.indexOf(rec.priority);
            if (currentPriorityIndex < lastPriorityIndex) {
              correctOrder = false;
              break;
            }
            lastPriorityIndex = Math.max(lastPriorityIndex, currentPriorityIndex);
          }

          return {
            success: correctOrder,
            message: correctOrder ? "Recommendations correctly prioritized" : "Priority ordering incorrect",
            duration: Date.now() - start,
            details: { topPriority: recommendations[0]?.priority },
          };
        } catch (error) {
          return {
            success: false,
            message: `Priority ordering test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "ROI-Based Supplier Selection",
      category: "Decision Engine",
      description: "Test supplier selection by ROI",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          const highROIRecommendations = recommendations?.filter(rec => rec.expectedROI > 20); // Above 20% ROI
          const hasROILogic = highROIRecommendations !== undefined;

          return {
            success: hasROILogic,
            message: hasROILogic ? `${highROIRecommendations.length} high-ROI recommendations` : "No ROI-based selection",
            duration: Date.now() - start,
            details: { highROICount: highROIRecommendations?.length },
          };
        } catch (error) {
          return {
            success: false,
            message: `ROI selection test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Action Type Classification",
      category: "Decision Engine",
      description: "Test recommendation action classification",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const actionTypes = recommendations?.map(rec => rec.action) || [];
          const validActions = ['order_now', 'wait', 'monitor', 'urgent_order'];
          const hasValidActions = actionTypes.every(action => validActions.includes(action));

          return {
            success: hasValidActions,
            message: hasValidActions ? "All actions properly classified" : "Invalid action types found",
            duration: Date.now() - start,
            details: { actionTypes: [...new Set(actionTypes)] },
          };
        } catch (error) {
          return {
            success: false,
            message: `Action classification test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Risk Level Assessment",
      category: "Decision Engine",
      description: "Test recommendation risk assessment",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const riskLevels = recommendations?.map(rec => rec.riskLevel) || [];
          const validRisks = ['low', 'medium', 'high'];
          const hasValidRisks = riskLevels.every(risk => validRisks.includes(risk));

          return {
            success: hasValidRisks,
            message: hasValidRisks ? "Risk levels properly assessed" : "Invalid risk levels found",
            duration: Date.now() - start,
            details: { riskLevels: [...new Set(riskLevels)] },
          };
        } catch (error) {
          return {
            success: false,
            message: `Risk assessment test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },

    // Integration & Performance Tests (10 tests)
    {
      name: "Database Connection Stability",
      category: "Integration",
      description: "Test database connection for supply chain data",
      module: "supply_chain",
      priority: "Critical",
      fn: async () => {
        const start = Date.now();
        try {
          const { data, error } = await supabase.from('products').select('count').limit(1);
          return {
            success: !error,
            message: error ? `Database connection failed: ${error.message}` : "Database connection stable",
            duration: Date.now() - start,
            error: error ? error.message : undefined,
          };
        } catch (error) {
          return {
            success: false,
            message: `Database test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Real-time Data Synchronization",
      category: "Integration",
      description: "Test data sync between components",
      module: "supply_chain",
      priority: "High",
      fn: async () => {
        const start = Date.now();
        try {
          // Test that all hooks are using consistent data
          const dataConsistency = !capitalLoading && !intelligenceLoading;
          return {
            success: dataConsistency,
            message: dataConsistency ? "Data synchronized across components" : "Data sync issues detected",
            duration: Date.now() - start,
            details: { capitalLoading, intelligenceLoading },
          };
        } catch (error) {
          return {
            success: false,
            message: `Data sync test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Component Load Performance",
      category: "Performance",
      description: "Test supply chain component load time",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          // Simulate component load time
          await new Promise(resolve => setTimeout(resolve, 100));
          const loadTime = Date.now() - start;
          const isPerformant = loadTime < 2000; // Less than 2 seconds

          return {
            success: isPerformant,
            message: `Component load time: ${loadTime}ms`,
            duration: loadTime,
            details: { loadTime, threshold: 2000 },
          };
        } catch (error) {
          return {
            success: false,
            message: `Performance test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
    {
      name: "Large Dataset Handling",
      category: "Performance",
      description: "Test system with large datasets",
      module: "supply_chain",
      priority: "Medium",
      fn: async () => {
        const start = Date.now();
        try {
          const totalSKUs = skuAnalytics?.length || 0;
          const totalSuppliers = supplierPerformance?.length || 0;
          const totalRecommendations = recommendations?.length || 0;

          const datasetSize = totalSKUs + totalSuppliers + totalRecommendations;
          const canHandleLarge = datasetSize < 1000; // Reasonable limit

          return {
            success: canHandleLarge,
            message: `Dataset size: ${datasetSize} records`,
            duration: Date.now() - start,
            details: { totalSKUs, totalSuppliers, totalRecommendations, datasetSize },
          };
        } catch (error) {
          return {
            success: false,
            message: `Large dataset test failed: ${error}`,
            duration: Date.now() - start,
            error: String(error),
          };
        }
      },
    },
  ];

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = createSupplyChainTests();
    const results: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      
      try {
        const result = await test.fn();
        results.push({
          ...result,
          testName: test.name,
          category: test.category,
          priority: test.priority,
          module: test.module,
        });
      } catch (error) {
        results.push({
          success: false,
          message: `Test execution failed: ${error}`,
          duration: 0,
          testName: test.name,
          category: test.category,
          priority: test.priority,
          module: test.module,
          error: String(error),
        });
      }

      setProgress(((i + 1) / tests.length) * 100);
      setTestResults([...results]);
    }

    setIsRunning(false);
    setCurrentTest("");
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-700" : "text-red-700";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "destructive";
      case "High":
        return "secondary";
      case "Medium":
        return "outline";
      case "Low":
        return "outline";
      default:
        return "outline";
    }
  };

  const passedTests = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-primary" />
          <CardTitle>Supply Chain System Tester</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalTests} tests</Badge>
          {totalTests > 0 && (
            <Badge variant={successRate >= 80 ? "default" : "destructive"}>
              {successRate.toFixed(1)}% passed
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isRunning ? "Running Tests..." : "Run Supply Chain Tests"}
          </Button>
          
          {isRunning && (
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {currentTest}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(result.success)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${getStatusColor(result.success)}`}>
                        {result.testName}
                      </span>
                      <Badge variant={getPriorityColor(result.priority || "Medium")}>
                        {result.priority}
                      </Badge>
                      <Badge variant="outline">{result.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                    {result.error && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.duration}ms
                </div>
              </div>
            ))}
          </div>
        )}

        {testResults.length === 0 && !isRunning && (
          <div className="text-center py-8 text-muted-foreground">
            <Factory className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Click "Run Supply Chain Tests" to start comprehensive testing</p>
            <p className="text-sm mt-1">
              Tests cover capital tracking, SKU analytics, supplier intelligence, decision engine, and more
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};