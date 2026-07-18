// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnhancedCapitalTracking } from "@/hooks/useEnhancedCapitalTracking";
import { useBankingCapitalIntegration } from "@/hooks/useBankingCapitalIntegration";
import { useEnhancedSupplierIntelligence } from "@/hooks/useEnhancedSupplierIntelligence";
import { useEnhancedSupplyChainDecisions } from "@/hooks/useEnhancedSupplyChainDecisions";
import { RealTimeIntelligencePanel } from "./RealTimeIntelligencePanel";
import { RealSupplyChainIntelligence } from "./RealSupplyChainIntelligence";
import { SampleDataGenerator } from "../SampleDataGenerator";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Package,
  Activity,
  Clock,
  Target,
  Zap,
  Shield,
  BarChart3
} from "lucide-react";

export const EnhancedSupplyChainDashboard = () => {
  const { capitalData, frozenCapitalItems, isLoading: capitalLoading, refetch: refetchCapital } = useEnhancedCapitalTracking();
  const { capitalData: bankingCapital, isLoading: bankingLoading, refetch: refetchBanking } = useBankingCapitalIntegration();
  const { supplierPerformance, skuAnalytics, isLoading: intelligenceLoading, refetch: refetchIntelligence } = useEnhancedSupplierIntelligence();
  const { recommendations, summary } = useEnhancedSupplyChainDecisions();

  const [lastRefresh, setLastRefresh] = React.useState<Date>(new Date());
  
  const isLoading = capitalLoading || intelligenceLoading || bankingLoading;
  const hasErrors = !capitalData && !capitalLoading;

  const handleRefresh = async () => {
    setLastRefresh(new Date());
    await Promise.all([refetchCapital(), refetchIntelligence(), refetchBanking()]);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading Supply Chain Intelligence...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Analyzing real-time data from SQL functions...
          </p>
        </div>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <div className="p-6 space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Data Loading Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Unable to load supply chain data. This might be due to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Database function errors (check network logs)</li>
              <li>Missing sample data</li>
              <li>Authentication issues</li>
            </ul>
            <Button onClick={handleRefresh} className="mt-4">
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const criticalStock = skuAnalytics?.filter(sku => sku.priority === 'critical').length || 0;
  const totalSKUs = skuAnalytics?.length || 0;
  const avgMargin = supplierPerformance?.length > 0 ? 
    supplierPerformance.reduce((sum, s) => sum + s.avgMargin, 0) / supplierPerformance.length : 0;
  const topPerformingSuppliers = supplierPerformance?.filter(s => s.performanceScore > 80).length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Supply Chain Intelligence</h1>
          <p className="text-muted-foreground">AI-powered procurement & inventory decisions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Badge variant="outline" className="text-sm">
            {summary?.currentSeason || 'Unknown'} Season
          </Badge>
          <Badge 
            variant={summary?.liquidityWarning ? "destructive" : "secondary"} 
            className="text-sm"
          >
            {summary?.liquidityWarning ? "Liquidity Alert" : "Healthy Cash Flow"}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Capital</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bankingCapital ? (
                <>₪{bankingCapital.availableCapitalNis.toLocaleString()} / ${bankingCapital.availableCapitalUsd.toLocaleString()}</>
              ) : (
                <>₪{capitalData?.availableLiquidity?.toLocaleString() || '0'}</>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {bankingCapital ? `${bankingCapital.utilizationRate?.toFixed(1)}% utilization` : `${capitalData?.utilizationRate?.toFixed(1) || '0'}% utilization`}
            </p>
            <Progress 
              value={bankingCapital?.utilizationRate || capitalData?.utilizationRate || 0} 
              className="mt-2"
            />
            {bankingCapital && (
              <p className="text-xs text-success mt-1">
                Real-time banking data connected
              </p>
            )}
            {!bankingCapital && !capitalData?.availableLiquidity && (
              <p className="text-xs text-destructive mt-1">
                Data unavailable - check SQL functions
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStock}</div>
            <p className="text-xs text-muted-foreground">
              of {totalSKUs} total SKUs
            </p>
            <Progress 
              value={(criticalStock / Math.max(totalSKUs, 1)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{avgMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Weighted by volume
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Suppliers</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{topPerformingSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              of {supplierPerformance?.length || 0} suppliers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="banking" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Banking
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Smart Decisions
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Supplier Intel
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory Analysis
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            AI Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Real-Time Intelligence Panel */}
          <RealTimeIntelligencePanel />
          
          {/* Capital Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Capital Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    ₪{capitalData.injectedCapital.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Injected</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    ₪{capitalData.frozenCapital.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Frozen Capital</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    ₪{capitalData.availableLiquidity.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Available Now</p>
                </div>
              </div>

              {frozenCapitalItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Frozen Capital Breakdown</h4>
                  {frozenCapitalItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === 'container' ? 'default' : 'secondary'} className="text-xs">
                          {item.type === 'container' ? 'Container' : 'PO'}
                        </Badge>
                        <span className="text-sm">{item.description}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₪{item.amount.toLocaleString()}</div>
                        {item.releaseDate && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.releaseDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Real-Time Banking Capital Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bankingCapital ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
                      <div className="text-2xl font-bold text-success">
                        ${bankingCapital.totalCapitalUsd.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Total USD Capital</p>
                      <p className="text-xs text-success">
                        Available: ${bankingCapital.availableCapitalUsd.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="text-2xl font-bold text-primary">
                        ₪{bankingCapital.totalCapitalNis.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Total NIS Capital</p>
                      <p className="text-xs text-primary">
                        Available: ₪{bankingCapital.availableCapitalNis.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <div className="text-2xl font-bold text-warning">
                        ₪{bankingCapital.frozenCapital.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Frozen in Orders</p>
                      <p className="text-xs text-warning">
                        {bankingCapital.utilizationRate.toFixed(1)}% Utilization
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Purchase Recommendations with Capital Constraints</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {recommendations?.slice(0, 5).map((rec, index) => {
                            const canAffordUSD = rec.estimatedCost <= bankingCapital.availableCapitalUsd;
                            const canAffordNIS = (rec.estimatedCost * 3.7) <= bankingCapital.availableCapitalNis; // Rough USD-NIS conversion
                            
                            return (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <p className="font-medium">{rec.productName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Qty: {rec.recommendedQuantity} | ROI: {rec.expectedROI?.toFixed(1)}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">${rec.estimatedCost?.toLocaleString()}</p>
                                  <div className="flex gap-1">
                                    <Badge variant={canAffordUSD ? "default" : "destructive"} className="text-xs">
                                      USD {canAffordUSD ? "✓" : "✗"}
                                    </Badge>
                                    <Badge variant={canAffordNIS ? "default" : "destructive"} className="text-xs">
                                      NIS {canAffordNIS ? "✓" : "✗"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Currency Optimization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-3 bg-muted/50 rounded">
                            <p className="text-sm font-medium">Optimal Currency for Large Orders</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {bankingCapital.availableCapitalUsd > bankingCapital.availableCapitalNis / 3.7 
                                ? "Use USD for major purchases" 
                                : "Use NIS for cost efficiency"}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">USD Liquidity</span>
                              <span className="text-sm font-medium">
                                {((bankingCapital.availableCapitalUsd / bankingCapital.totalCapitalUsd) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={(bankingCapital.availableCapitalUsd / bankingCapital.totalCapitalUsd) * 100} />
                            
                            <div className="flex justify-between">
                              <span className="text-sm">NIS Liquidity</span>
                              <span className="text-sm font-medium">
                                {((bankingCapital.availableCapitalNis / bankingCapital.totalCapitalNis) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={(bankingCapital.availableCapitalNis / bankingCapital.totalCapitalNis) * 100} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Banking Integration Pending</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your banking data to see real-time capital analysis
                  </p>
                  <Button onClick={refetchBanking} className="mt-4">
                    Connect Banking Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-6">
          {/* Order Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Smart Order Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Budget Summary */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended Spend</p>
                    <p className="text-2xl font-bold">₪{summary.totalRecommendedSpend.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Budget</p>
                    <p className="text-2xl font-bold text-success">₪{summary.availableBudget.toLocaleString()}</p>
                  </div>
                  <Badge variant={summary.canAffordAll ? "default" : "destructive"}>
                    {summary.canAffordAll ? "Budget OK" : "Budget Exceeded"}
                  </Badge>
                </div>

                {/* Risk Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <div className="text-lg font-bold text-destructive">{summary.riskAssessment.highRiskOrders}</div>
                    <p className="text-xs text-muted-foreground">High Risk Orders</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <div className="text-lg font-bold text-warning">
                      ₪{summary.riskAssessment.totalRiskExposure.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Risk Exposure</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded">
                    <div className="text-lg font-bold text-success">{summary.riskAssessment.diversificationScore.toFixed(0)}%</div>
                    <p className="text-xs text-muted-foreground">Diversification</p>
                  </div>
                </div>

                {/* Top Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-medium">Immediate Actions Required</h4>
                  {recommendations.filter(r => r.action === 'order_now').slice(0, 5).map((rec) => (
                    <div key={rec.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' : 
                          rec.priority === 'high' ? 'default' : 'secondary'
                        }>
                          {rec.priority}
                        </Badge>
                        <div>
                          <p className="font-medium">{rec.productName}</p>
                          <p className="text-sm text-muted-foreground">{rec.supplierName}</p>
                          <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₪{rec.estimatedCost.toLocaleString()}</p>
                        <p className="text-sm text-success">{rec.expectedROI.toFixed(1)}% ROI</p>
                        <p className="text-xs text-muted-foreground">Qty: {rec.recommendedQuantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seasonal Insights */}
                <div className="space-y-2">
                  <h4 className="font-medium">Seasonal & Timing Insights</h4>
                  {summary.seasonalAdjustments.map((adjustment, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{adjustment}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.slice(0, 10).map((supplier) => (
                  <div key={supplier.supplierId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{supplier.supplierName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            supplier.riskProfile === 'low' ? 'default' : 
                            supplier.riskProfile === 'high' ? 'destructive' : 'secondary'
                          } className="text-xs">
                            {supplier.riskProfile} risk
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {supplier.totalOrders} orders
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium">{supplier.avgMargin.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Margin</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{supplier.reliability.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Reliability</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{supplier.avgLeadTime}d</div>
                        <div className="text-xs text-muted-foreground">Lead Time</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{supplier.expectedROI.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">ROI</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SKU Coverage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skuAnalytics.slice(0, 15).map((sku) => (
                  <div key={sku.productId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        sku.priority === 'critical' ? 'destructive' : 
                        sku.priority === 'high' ? 'default' : 'secondary'
                      }>
                        {sku.priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{sku.productName}</p>
                        <p className="text-sm text-muted-foreground">{sku.supplierName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium">{sku.currentStock}</div>
                        <div className="text-xs text-muted-foreground">Stock</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{sku.coverage.toFixed(1)}m</div>
                        <div className="text-xs text-muted-foreground">Coverage</div>
                        <Progress 
                          value={(sku.coverage / sku.targetCoverage) * 100} 
                          className="h-1 mt-1"
                        />
                      </div>
                      <div>
                        <Badge variant={
                          sku.recommendedAction === 'order_now' ? 'destructive' :
                          sku.recommendedAction === 'reorder_soon' ? 'default' : 'secondary'
                        } className="text-xs">
                          {sku.recommendedAction === 'order_now' ? 'Order Now' :
                           sku.recommendedAction === 'reorder_soon' ? 'Reorder Soon' : 'Monitor'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <RealSupplyChainIntelligence />
        </TabsContent>
      </Tabs>
    </div>
  );
};