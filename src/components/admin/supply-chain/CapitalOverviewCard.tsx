// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useCapitalTracking } from "@/hooks/useCapitalTracking";

export const CapitalOverviewCard = () => {
  const { capitalData, frozenCapitalItems, isLoading } = useCapitalTracking();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Capital Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const utilizationRate = (capitalData.frozenCapital / capitalData.injectedCapital) * 100;
  const liquidityRate = (capitalData.availableLiquidity / capitalData.injectedCapital) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Capital Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Capital Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              ${capitalData.injectedCapital.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Injected Capital</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${capitalData.availableLiquidity.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${capitalData.frozenCapital.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Frozen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${capitalData.outstandingPayables.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Payables</div>
          </div>
        </div>

        {/* Utilization Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Capital Utilization</span>
            <span className="text-sm text-muted-foreground">{utilizationRate.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationRate} className="h-2" />
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Liquidity Available</span>
            <span className="text-sm text-muted-foreground">{liquidityRate.toFixed(1)}%</span>
          </div>
          <Progress value={liquidityRate} className="h-2" />
        </div>

        {/* Frozen Capital Details */}
        {frozenCapitalItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frozen Capital Breakdown</span>
              {capitalData.frozenCapitalReleaseDate && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Next release: {new Date(capitalData.frozenCapitalReleaseDate).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              {frozenCapitalItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.containerNumber}</span>
                  <div className="flex items-center gap-2">
                    <span>${item.amount.toLocaleString()}</span>
                    <Badge variant={
                      item.status === 'in_transit' ? 'secondary' :
                      item.status === 'port_arrival' ? 'default' : 'outline'
                    } className="text-xs">
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {frozenCapitalItems.length > 3 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{frozenCapitalItems.length - 3} more containers
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {liquidityRate > 30 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">
              {liquidityRate > 30 ? 'Healthy liquidity' : 'Low liquidity warning'}
            </span>
          </div>
          <Badge variant={liquidityRate > 30 ? 'default' : 'destructive'}>
            {liquidityRate > 30 ? 'Good' : 'Caution'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};