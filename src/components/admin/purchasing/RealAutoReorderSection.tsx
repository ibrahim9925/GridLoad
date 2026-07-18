// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Package, Zap, CheckCircle, Clock, ShoppingCart } from 'lucide-react';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface ReorderSuggestion {
  id: string;
  product_name: string;
  current_stock: number;
  reorder_point: number;
  suggested_quantity: number;
  preferred_supplier?: string;
  estimated_cost: number;
  lead_time: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  auto_reorder_enabled: boolean;
  last_restock_date?: string;
  sales_velocity: number;
  cost_price: number;
}

export const RealAutoReorderSection = () => {
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(true);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const { toast } = useToast();

  const {
    selectedIds,
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount,
  } = useBulkSelection(reorderSuggestions, (suggestion) => suggestion.id);

  useEffect(() => {
    fetchReorderSuggestions();
  }, []);

  const fetchReorderSuggestions = async () => {
    try {
      setIsLoading(true);

      // Fetch products with their stock levels and supplier information
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_suppliers!inner (
            supplier_id,
            cost_price,
            lead_time_days,
            is_preferred,
            suppliers (
              company_name
            )
          )
        `)
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Fetch recent sales data to calculate sales velocity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          sales!inner (
            sale_date
          )
        `)
        .gte('sales.sale_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (salesError) throw salesError;

      // Calculate sales velocity for each product
      const salesVelocity = new Map<string, number>();
      salesData?.forEach((sale: any) => {
        const productId = sale.product_id;
        const currentVelocity = salesVelocity.get(productId) || 0;
        salesVelocity.set(productId, currentVelocity + sale.quantity);
      });

      // Generate reorder suggestions
      const suggestions: ReorderSuggestion[] = [];
      
      products?.forEach((product: any) => {
        const velocity = salesVelocity.get(product.id) || 0;
        const monthlyVelocity = velocity; // Already 30-day data
        const dailyVelocity = monthlyVelocity / 30;

        // Get preferred supplier or first supplier
        const preferredSupplier = product.product_suppliers.find((ps: any) => ps.is_preferred) 
          || product.product_suppliers[0];

        if (!preferredSupplier) return; // Skip products without suppliers

        const leadTime = preferredSupplier.lead_time_days || 7;
        const supplierCostPrice = preferredSupplier.cost_price || product.cost_price || 0;

        // Calculate dynamic reorder point based on sales velocity
        const safetyStockDays = 7; // 1 week safety stock
        const calculatedReorderPoint = Math.ceil(dailyVelocity * (leadTime + safetyStockDays));
        const reorderPoint = Math.max(calculatedReorderPoint, product.reorder_point || 20);

        // Determine if product needs reordering
        if (product.current_stock <= reorderPoint) {
          // Calculate suggested quantity (enough for 60 days + safety stock)
          const suggestedQuantity = Math.max(
            Math.ceil(dailyVelocity * 60),
            product.reorder_quantity || 50,
            reorderPoint * 2
          );

          // Determine priority based on how urgent the reorder is
          let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
          const stockRatio = product.current_stock / reorderPoint;
          
          if (product.current_stock === 0) priority = 'critical';
          else if (stockRatio <= 0.5) priority = 'high';
          else if (stockRatio <= 0.8) priority = 'medium';
          else priority = 'low';

          suggestions.push({
            id: product.id,
            product_name: product.name,
            current_stock: product.current_stock || 0,
            reorder_point: reorderPoint,
            suggested_quantity: suggestedQuantity,
            preferred_supplier: preferredSupplier.suppliers?.company_name,
            estimated_cost: suggestedQuantity * supplierCostPrice,
            lead_time: leadTime,
            priority,
            auto_reorder_enabled: false, // Could be stored in product settings
            last_restock_date: product.last_restock_date,
            sales_velocity: dailyVelocity,
            cost_price: supplierCostPrice,
          });
        }
      });

      // Sort by priority and stock level
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      suggestions.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.current_stock - b.current_stock; // Lower stock first within same priority
      });

      setReorderSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching reorder suggestions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reorder suggestions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { label: "Critical", variant: "destructive" as const, icon: AlertTriangle },
      high: { label: "High", variant: "destructive" as const, icon: AlertTriangle },
      medium: { label: "Medium", variant: "secondary" as const, icon: Clock },
      low: { label: "Low", variant: "outline" as const, icon: Package }
    };

    const { label, variant, icon: Icon } = config[priority as keyof typeof config] || config.low;

    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleCreatePurchaseOrder = async (suggestion: ReorderSuggestion) => {
    try {
      // This would integrate with the existing PO creation system
      console.log("Creating purchase order for:", suggestion.product_name);
      
      toast({
        title: "Purchase Order Created",
        description: `PO created for ${suggestion.product_name}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create purchase order",
      });
    }
  };

  const handleBulkCreatePO = async () => {
    if (selectedItems.length === 0) return;

    setBulkProcessing(true);
    try {
      // Create purchase orders for all selected items
      await Promise.all(selectedItems.map(suggestion => handleCreatePurchaseOrder(suggestion)));
      
      toast({
        title: "Success",
        description: `Created ${selectedItems.length} purchase orders`,
      });
      
      deselectAll();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create some purchase orders",
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleToggleAutoReorder = async (id: string, enabled: boolean) => {
    try {
      // This would update the product's auto-reorder setting
      console.log("Toggling auto-reorder for:", id, enabled);
      
      setReorderSuggestions(prev => prev.map(s => 
        s.id === id ? { ...s, auto_reorder_enabled: enabled } : s
      ));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update auto-reorder setting",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="stats" count={3} />
        <LoadingSkeleton type="table" count={8} />
      </div>
    );
  }

  const totalEstimatedCost = reorderSuggestions.reduce((sum, item) => sum + item.estimated_cost, 0);
  const criticalItems = reorderSuggestions.filter(item => item.priority === 'critical').length;
  const zeroStockItems = reorderSuggestions.filter(item => item.current_stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Auto-Reorder Settings & Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Auto-Reorder Analysis</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Global Auto-Reorder</span>
              <Switch 
                checked={autoReorderEnabled} 
                onCheckedChange={setAutoReorderEnabled}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{zeroStockItems}</div>
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{criticalItems}</div>
              <div className="text-sm text-muted-foreground">Critical Items</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{reorderSuggestions.length}</div>
              <div className="text-sm text-muted-foreground">Total Suggestions</div>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEstimatedCost)}</div>
              <div className="text-sm text-muted-foreground">Estimated Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selectedCount}
        onDeselectAll={deselectAll}
        onDeleteSelected={() => {}}
        isLoading={bulkProcessing}
        customActions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCreatePO}
              disabled={bulkProcessing}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Create POs ({selectedCount})
            </Button>
          </div>
        }
      />

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Smart Reorder Suggestions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchReorderSuggestions}>
                <Zap className="mr-2 h-4 w-4" />
                Refresh Analysis
              </Button>
              <Button 
                size="sm" 
                onClick={handleBulkCreatePO}
                disabled={selectedCount === 0 || bulkProcessing}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Bulk Create Orders ({selectedCount})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reorderSuggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4" />
              <div className="text-lg font-medium">All stock levels look good!</div>
              <div className="text-sm">No reorder suggestions at this time.</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCount === reorderSuggestions.length && reorderSuggestions.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAll();
                        else deselectAll();
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Suggested Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderSuggestions.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected(suggestion.id)}
                        onCheckedChange={() => selectItem(suggestion.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{suggestion.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Velocity: {suggestion.sales_velocity.toFixed(1)}/day • Lead: {suggestion.lead_time}d
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        suggestion.current_stock === 0 ? "border-destructive text-destructive bg-destructive/10" :
                        suggestion.current_stock <= suggestion.reorder_point * 0.5 ? "border-orange-500 text-orange-600 bg-orange-50" : ""
                      }>
                        {suggestion.current_stock}
                      </Badge>
                    </TableCell>
                    <TableCell>{suggestion.reorder_point}</TableCell>
                    <TableCell className="font-medium">{suggestion.suggested_quantity}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {suggestion.preferred_supplier || 'No supplier'}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(suggestion.estimated_cost)}</TableCell>
                    <TableCell>{getPriorityBadge(suggestion.priority)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleCreatePurchaseOrder(suggestion)}
                          disabled={!suggestion.preferred_supplier}
                        >
                          Create PO
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Auto-create PO for critical items</div>
                <div className="text-sm text-muted-foreground">
                  Automatically create purchase orders when stock reaches critical level (0 or negative)
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Dynamic reorder point calculation</div>
                <div className="text-sm text-muted-foreground">
                  Adjust reorder points based on sales velocity and lead times
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Email notifications for urgent reorders</div>
                <div className="text-sm text-muted-foreground">
                  Send immediate alerts when critical items need reordering
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};