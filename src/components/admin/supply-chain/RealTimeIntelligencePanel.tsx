// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEnhancedCapitalTracking } from "@/hooks/useEnhancedCapitalTracking";
import { useEnhancedSupplierIntelligence } from "@/hooks/useEnhancedSupplierIntelligence";
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Clock,
  Target,
  DollarSign,
  Calendar,
  Package2,
  Zap
} from "lucide-react";

export const RealTimeIntelligencePanel = () => {
  const { capitalData, frozenCapitalItems } = useEnhancedCapitalTracking();
  const { skuAnalytics, getCurrentSeason } = useEnhancedSupplierIntelligence();

  // Calculate key intelligence metrics
  const criticalStockItems = skuAnalytics.filter(item => item.priority === 'critical');
  const lowCoverageItems = skuAnalytics.filter(item => item.coverage < 1);
  const highVelocityItems = skuAnalytics
    .filter(item => item.monthlySales > 0)
    .sort((a, b) => b.monthlySales - a.monthlySales)
    .slice(0, 5);

  // Calculate stock-out predictions
  const stockoutRisks = skuAnalytics
    .filter(item => item.coverage < 2 && item.monthlySales > 0)
    .map(item => ({
      ...item,
      daysUntilStockout: Math.round((item.currentStock / (item.monthlySales / 30)) || 0)
    }))
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

  // Calculate cash release timeline
  const nearTermReleases = frozenCapitalItems
    .filter(item => item.releaseDate)
    .map(item => ({
      ...item,
      daysUntilRelease: Math.ceil((new Date(item.releaseDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))
    .filter(item => item.daysUntilRelease > 0 && item.daysUntilRelease <= 60)
    .sort((a, b) => a.daysUntilRelease - b.daysUntilRelease);

  // Calculate seasonal insights
  const currentSeason = getCurrentSeason();
  const seasonalMultiplier = currentSeason === 'summer' ? 1.3 : 
                           currentSeason === 'winter' ? 0.8 : 1.0;

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {(criticalStockItems.length > 0 || capitalData.utilizationRate > 85) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Urgent Action Required:</strong> {criticalStockItems.length} critical stock items
            {capitalData.utilizationRate > 85 && `, ${capitalData.utilizationRate.toFixed(1)}% capital utilization`}
          </AlertDescription>
        </Alert>
      )}

      {/* Real-Time Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stock Coverage Intelligence */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 className="h-5 w-5" />
              Stock Coverage Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top moving products with coverage analysis */}
            <div className="space-y-3">
              <h4 className="font-medium">High-Velocity Products Coverage</h4>
              {highVelocityItems.map((item) => {
                const weeksOfCoverage = item.monthlySales > 0 ? (item.currentStock / (item.monthlySales / 4)) : 999;
                const coverageHealth = weeksOfCoverage > 8 ? 'healthy' : weeksOfCoverage > 4 ? 'warning' : 'critical';
                
                return (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        coverageHealth === 'critical' ? 'destructive' : 
                        coverageHealth === 'warning' ? 'default' : 'secondary'
                      }>
                        {item.priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.monthlySales}/month • {item.currentStock} in stock
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {weeksOfCoverage > 99 ? '∞' : `${weeksOfCoverage.toFixed(1)}`} weeks
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.coverage.toFixed(1)} months coverage
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stock-out predictions */}
            {stockoutRisks.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Stock-out Timeline Predictions
                </h4>
                {stockoutRisks.slice(0, 3).map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-2 border border-destructive/20 rounded">
                    <div>
                      <p className="font-medium text-destructive">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Current: {item.currentStock} units</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">
                        {item.daysUntilStockout} days
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(Date.now() + item.daysUntilStockout * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash Flow Intelligence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Flow Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current liquidity status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Available Cash</span>
                <span className="font-bold">₪{capitalData.availableLiquidity.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Frozen Capital</span>
                <span className="font-medium">₪{capitalData.frozenCapital.toLocaleString()}</span>
              </div>
              <Progress value={capitalData.utilizationRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {capitalData.utilizationRate.toFixed(1)}% capital utilization
              </p>
            </div>

            {/* Cash release timeline */}
            {nearTermReleases.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Cash Releases
                </h4>
                {nearTermReleases.slice(0, 3).map((release) => (
                  <div key={release.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">₪{release.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {release.type === 'container' ? 'Container' : 'Purchase Order'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {release.daysUntilRelease} days
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Safe ordering capacity */}
            <div className="p-3 bg-success/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Safe Ordering Capacity</span>
              </div>
              <p className="text-lg font-bold text-success mt-1">
                ₪{(capitalData.availableLiquidity * 0.7).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                70% of available liquidity (recommended buffer)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Seasonal & Market Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Current Season</h4>
              <p className="text-2xl font-bold capitalize">{currentSeason}</p>
              <p className="text-sm text-muted-foreground">
                {seasonalMultiplier > 1 ? `${((seasonalMultiplier - 1) * 100).toFixed(0)}% higher demand` :
                 seasonalMultiplier < 1 ? `${((1 - seasonalMultiplier) * 100).toFixed(0)}% lower demand` :
                 'Normal demand period'}
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Demand Trend</h4>
              <div className="flex items-center justify-center gap-2">
                {seasonalMultiplier > 1 ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : seasonalMultiplier < 1 ? (
                  <TrendingDown className="h-5 w-5 text-destructive" />
                ) : (
                  <div className="h-5 w-5 bg-muted rounded" />
                )}
                <span className="font-bold">
                  {seasonalMultiplier > 1 ? 'Rising' : seasonalMultiplier < 1 ? 'Declining' : 'Stable'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Based on historical patterns</p>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium">Preparation Status</h4>
              <p className="text-2xl font-bold">
                {lowCoverageItems.length === 0 ? '✓' : '⚠️'}
              </p>
              <p className="text-sm text-muted-foreground">
                {lowCoverageItems.length === 0 ? 
                  'Ready for seasonal demand' : 
                  `${lowCoverageItems.length} items need attention`
                }
              </p>
            </div>
          </div>

          {/* Action recommendations */}
          <div className="mt-4 p-4 bg-info/10 rounded-lg">
            <h4 className="font-medium text-info mb-2">Immediate Recommendations</h4>
            <ul className="text-sm space-y-1">
              {criticalStockItems.length > 0 && (
                <li>• Order {criticalStockItems.length} critical stock items immediately</li>
              )}
              {capitalData.utilizationRate > 75 && (
                <li>• Consider delaying non-critical orders - high capital utilization</li>
              )}
              {nearTermReleases.length > 0 && (
                <li>• ₪{nearTermReleases.reduce((sum, r) => sum + r.amount, 0).toLocaleString()} cash releasing in next 60 days</li>
              )}
              {seasonalMultiplier > 1.1 && (
                <li>• Increase inventory by {Math.round((seasonalMultiplier - 1) * 100)}% for seasonal demand</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};