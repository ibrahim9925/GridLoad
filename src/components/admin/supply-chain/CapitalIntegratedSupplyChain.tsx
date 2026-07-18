// @ts-nocheck
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BankLedgerManager } from "@/components/admin/financial/BankLedgerManager";
import { useEnhancedCapitalTracking } from "@/hooks/useEnhancedCapitalTracking";
import { useEnhancedSupplyChainDecisions } from "@/hooks/useEnhancedSupplyChainDecisions";
import { useMultiCurrencyFinancials } from "@/hooks/useMultiCurrencyFinancials";
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Package,
  Clock,
  Shield
} from "lucide-react";

export const CapitalIntegratedSupplyChain = () => {
  const { capitalData, isLoading: capitalLoading } = useEnhancedCapitalTracking();
  const { recommendations, summary } = useEnhancedSupplyChainDecisions();
  const { bankAccounts, bankLedgerEntries } = useMultiCurrencyFinancials();

  // Calculate capital allocation for supply chain
  const calculateSupplyChainCapital = () => {
    const totalBankBalance = bankAccounts.reduce((sum, account) => 
      sum + (account.current_balance || 0), 0
    );

    const supplierPayments = bankLedgerEntries
      .filter(entry => entry.transaction_type === 'outbound' && 
               entry.purpose?.toLowerCase().includes('supplier'))
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    const pendingOrders = recommendations
      .filter(rec => rec.action === 'order_now')
      .reduce((sum, rec) => sum + rec.estimatedCost, 0);

    return {
      availableCapital: totalBankBalance,
      allocatedToSuppliers: supplierPayments,
      pendingOrderValue: pendingOrders,
      utilizationRate: totalBankBalance > 0 ? 
        (supplierPayments / totalBankBalance) * 100 : 0,
      remainingCapacity: Math.max(0, totalBankBalance - supplierPayments - pendingOrders)
    };
  };

  const supplyChainCapital = calculateSupplyChainCapital();

  if (capitalLoading) {
    return <div className="p-6">Loading capital analysis...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Capital Overview for Supply Chain */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Available Capital</p>
                <p className="text-lg font-bold">
                  ₪{supplyChainCapital.availableCapital.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Supplier Allocated</p>
                <p className="text-lg font-bold">
                  ₪{supplyChainCapital.allocatedToSuppliers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-lg font-bold">
                  ₪{supplyChainCapital.pendingOrderValue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-xs text-muted-foreground">Utilization</p>
                <p className="text-lg font-bold">
                  {supplyChainCapital.utilizationRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-info" />
              <div>
                <p className="text-xs text-muted-foreground">Remaining Capacity</p>
                <p className="text-lg font-bold">
                  ₪{supplyChainCapital.remainingCapacity.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capital Constraint Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Capital-Constrained Purchase Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Capital Usage Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Capital Utilization</span>
                <span>{supplyChainCapital.utilizationRate.toFixed(1)}%</span>
              </div>
              <Progress value={supplyChainCapital.utilizationRate} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>₪{supplyChainCapital.allocatedToSuppliers.toLocaleString()} allocated</span>
                <span>₪{supplyChainCapital.remainingCapacity.toLocaleString()} available</span>
              </div>
            </div>

            {/* Prioritized Recommendations */}
            <div className="space-y-3">
              <h4 className="font-medium">Recommended Orders (Capital-Optimized)</h4>
              {recommendations
                .filter(rec => rec.action === 'order_now')
                .sort((a, b) => b.expectedROI - a.expectedROI)
                .slice(0, 8)
                .map((rec, index) => {
                  const canAfford = rec.estimatedCost <= supplyChainCapital.remainingCapacity;
                  
                  return (
                    <div key={rec.productId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </div>
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' :
                          rec.priority === 'high' ? 'default' : 'secondary'
                        }>
                          {rec.priority}
                        </Badge>
                        <div>
                          <p className="font-medium">{rec.productName}</p>
                          <p className="text-sm text-muted-foreground">{rec.supplierName}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span>ROI: {rec.expectedROI.toFixed(1)}%</span>
                            <span>•</span>
                            <span>Risk: {rec.riskLevel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${canAfford ? 'text-foreground' : 'text-destructive'}`}>
                          ₪{rec.estimatedCost.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Qty: {rec.recommendedQuantity}</p>
                        <Badge variant={canAfford ? 'default' : 'destructive'} className="text-xs">
                          {canAfford ? 'Affordable' : 'Over Budget'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Capital Recommendations */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Capital Management Insights</h4>
                <div className="space-y-2 text-sm">
                  {supplyChainCapital.utilizationRate > 80 && (
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span>High capital utilization - consider additional funding</span>
                    </div>
                  )}
                  {supplyChainCapital.pendingOrderValue > supplyChainCapital.remainingCapacity && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Pending orders exceed available capital by ₪{(supplyChainCapital.pendingOrderValue - supplyChainCapital.remainingCapacity).toLocaleString()}</span>
                    </div>
                  )}
                  {summary.canAffordAll && (
                    <div className="flex items-center gap-2 text-success">
                      <Shield className="h-4 w-4" />
                      <span>All priority orders can be funded with current capital</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Full Banking Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Banking Ledger & Capital Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <BankLedgerManager />
        </CardContent>
      </Card>
    </div>
  );
};