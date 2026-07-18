// @ts-nocheck

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package, TrendingDown, PackageOpen } from "lucide-react";
import AdvancedStockAlerts from "@/components/admin/inventory/AdvancedStockAlerts";
import StockMovementsTab from "@/components/admin/inventory/StockMovementsTab";
import InventoryValuationTab from "@/components/admin/inventory/InventoryValuationTab";
import ABCAnalysisTab from "@/components/admin/inventory/ABCAnalysisTab";
import { useOptimizedProductsData } from "@/hooks/useOptimizedProductsData";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { formatNIS } from "@/utils/formatters";

const InventoryManagement = () => {
  const {
    products: filteredProducts,
    isLoading,
  } = useOptimizedProductsData();

  // Unified threshold: reorder_point (default 5 if null/zero)
  const thresholdOf = (p: any) => (p.reorder_point && p.reorder_point > 0 ? p.reorder_point : 5);

  const lowStockProducts = filteredProducts.filter(p =>
    (p.current_stock || 0) > 0 && (p.current_stock || 0) <= thresholdOf(p)
  );

  const outOfStockProducts = filteredProducts.filter(p => (p.current_stock || 0) === 0);
  const totalStockValue = filteredProducts.reduce((sum, p) => {
    const unit = (p.cost_price && p.cost_price > 0)
      ? p.cost_price
      : (p.standard_selling_price || 0);
    return sum + ((p.current_stock || 0) * unit);
  }, 0);

  const criticalStockProducts = filteredProducts.filter(p =>
    (p.current_stock || 0) <= thresholdOf(p)
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-full space-y-4 md:space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels, track movements, and manage inventory operations</p>
        </div>
        <LoadingSkeleton type="stats" count={4} />
        <LoadingSkeleton type="table" count={10} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate">Inventory Management</h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Monitor stock levels, track movements, and manage inventory operations
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Inventory Alert:</strong> {outOfStockProducts.length} products are out of stock 
            and {lowStockProducts.length} products are running low.
          </AlertDescription>
        </Alert>
      )}

      {/* Inventory Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-5 w-5 md:h-8 md:w-8 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">Stock Value</p>
                <p className="text-sm md:text-2xl font-bold truncate">{formatNIS(totalStockValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-5 w-5 md:h-8 md:w-8 text-yellow-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">Low Stock</p>
                <p className="text-sm md:text-2xl font-bold text-yellow-600">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 min-w-0">
              <TrendingDown className="h-5 w-5 md:h-8 md:w-8 text-red-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">Out of Stock</p>
                <p className="text-sm md:text-2xl font-bold text-red-600">{outOfStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center gap-2 min-w-0">
              <PackageOpen className="h-5 w-5 md:h-8 md:w-8 text-orange-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate">Reorder</p>
                <p className="text-sm md:text-2xl font-bold text-orange-600">{criticalStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="alerts" className="whitespace-nowrap">Stock Alerts</TabsTrigger>
            <TabsTrigger value="movements" className="whitespace-nowrap">Stock Movements</TabsTrigger>
            <TabsTrigger value="valuation" className="whitespace-nowrap">Inventory Valuation</TabsTrigger>
            <TabsTrigger value="analytics" className="whitespace-nowrap">ABC Analysis</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="alerts">
          <AdvancedStockAlerts />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovementsTab />
        </TabsContent>

        <TabsContent value="valuation">
          <InventoryValuationTab />
        </TabsContent>

        <TabsContent value="analytics">
          <ABCAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;
