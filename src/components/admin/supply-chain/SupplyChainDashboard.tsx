// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  AlertTriangle,
  BarChart3,
  Factory
} from "lucide-react";
import { CapitalOverviewCard } from "./CapitalOverviewCard";
import { OrderRecommendationsCard } from "./OrderRecommendationsCard";
import { useSupplierIntelligence } from "@/hooks/useSupplierIntelligence";

export const SupplyChainDashboard = () => {
  const { supplierPerformance, skuAnalytics, isLoading } = useSupplierIntelligence();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold mb-4">Supply Chain Decision Assistant</div>
        <div className="text-muted-foreground">Loading analysis...</div>
      </div>
    );
  }

  const criticalProducts = skuAnalytics.filter(sku => sku.coverage < sku.targetCoverage * 0.5);
  const totalProducts = skuAnalytics.length;
  const averageMargin = supplierPerformance.reduce((sum, s) => sum + s.averageMargin, 0) / supplierPerformance.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supply Chain Decision Assistant</h1>
          <p className="text-muted-foreground">
            AI-powered procurement decisions based on capital, inventory, and demand
          </p>
        </div>
        <Badge variant="default" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Active Analysis
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {criticalProducts.length}
                </div>
                <div className="text-sm text-muted-foreground">Critical Stock</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalProducts}
                </div>
                <div className="text-sm text-muted-foreground">Total SKUs</div>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {averageMargin.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Margin</div>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {supplierPerformance.length}
                </div>
                <div className="text-sm text-muted-foreground">Suppliers</div>
              </div>
              <Factory className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Product Analysis</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CapitalOverviewCard />
            <OrderRecommendationsCard />
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SKU Coverage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skuAnalytics.slice(0, 10).map((sku) => (
                  <div key={sku.productId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sku.productName}</span>
                        <Badge variant="outline" className="text-xs">
                          {sku.supplierName}
                        </Badge>
                        {sku.reorderNeeded && (
                          <Badge variant="destructive" className="text-xs">
                            Reorder Needed
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {sku.coverage.toFixed(1)}m / {sku.targetCoverage.toFixed(1)}m
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${sku.profitPerUnit}/unit profit
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min((sku.coverage / sku.targetCoverage) * 100, 100)} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      Stock: {sku.currentStock} | In-transit: {sku.inTransitStock} | 
                      Monthly sales: {sku.monthlySales}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.map((supplier, index) => (
                  <div key={supplier.supplierId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{supplier.supplierName}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.totalOrders} orders | {supplier.averageLeadTime.toFixed(0)} day lead time
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {supplier.averageMargin.toFixed(1)}% margin
                        </span>
                        <Badge variant={
                          supplier.riskProfile === 'low' ? 'default' :
                          supplier.riskProfile === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {supplier.riskProfile} risk
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ROI Score: {supplier.roiRanking.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reliability: {supplier.reliabilityScore.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};