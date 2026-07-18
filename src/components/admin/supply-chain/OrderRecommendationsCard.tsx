// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign
} from "lucide-react";
import { useSupplyChainDecisions } from "@/hooks/useSupplyChainDecisions";

export const OrderRecommendationsCard = () => {
  const { recommendations, summary } = useSupplyChainDecisions();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'order_now': return <ShoppingCart className="h-4 w-4" />;
      case 'wait_for_clearance': return <Clock className="h-4 w-4" />;
      case 'monitor': return <CheckCircle className="h-4 w-4" />;
      case 'delay': return <AlertTriangle className="h-4 w-4" />;
      default: return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'order_now': return 'default';
      case 'wait_for_clearance': return 'secondary';
      case 'monitor': return 'outline';
      case 'delay': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const orderNowRecommendations = recommendations.filter(r => r.action === 'order_now');
  const budgetUtilization = summary.availableBudget > 0 
    ? (summary.totalRecommendedSpend / summary.availableBudget) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Order Recommendations
          </div>
          <Badge variant={summary.canAffordAll ? 'default' : 'destructive'}>
            {summary.canAffordAll ? 'Within Budget' : 'Budget Exceeded'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              ${summary.totalRecommendedSpend.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Recommended Spend</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              ${summary.availableBudget.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Available Budget</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              {budgetUtilization.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Budget Utilization</div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Budget Utilization</span>
            <span className="text-sm text-muted-foreground">
              {Math.min(budgetUtilization, 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(budgetUtilization, 100)} 
            className="h-2"
          />
          {budgetUtilization > 100 && (
            <div className="text-xs text-destructive">
              Exceeds budget by ${(summary.totalRecommendedSpend - summary.availableBudget).toLocaleString()}
            </div>
          )}
        </div>

        {/* Liquidity Warning */}
        {summary.liquidityWarning && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              High frozen capital ratio - consider waiting for container clearance
            </span>
          </div>
        )}

        {/* Immediate Action Items */}
        {orderNowRecommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Immediate Orders Recommended ({orderNowRecommendations.length})
            </h4>
            <div className="space-y-2">
              {orderNowRecommendations.slice(0, 5).map((rec) => (
                <div key={rec.productId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rec.productName}</span>
                      <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rec.supplierName}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Coverage: {rec.currentCoverage.toFixed(1)}m / {rec.targetCoverage.toFixed(1)}m target
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rec.reasoning}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {rec.recommendedQuantity} units
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${rec.estimatedCost.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">
                      {rec.expectedROI.toFixed(1)}% ROI
                    </div>
                  </div>
                </div>
              ))}
              
              {orderNowRecommendations.length > 5 && (
                <div className="text-center">
                  <Button variant="outline" size="sm">
                    View {orderNowRecommendations.length - 5} More Recommendations
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Recommendations Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">All Product Analysis ({recommendations.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {['order_now', 'wait_for_clearance', 'monitor', 'delay'].map(action => {
              const count = recommendations.filter(r => r.action === action).length;
              return (
                <div key={action} className="text-center p-2 border rounded">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {getActionIcon(action)}
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="text-muted-foreground capitalize">
                    {action.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seasonal Adjustments */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="text-sm font-medium">Seasonal Adjustments Applied</h4>
          {summary.seasonalAdjustments.map((adjustment, index) => (
            <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {adjustment}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};