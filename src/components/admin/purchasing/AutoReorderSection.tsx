// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Package, Zap, CheckCircle, Clock, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReorderSuggestion {
  id: string;
  product_name: string;
  current_stock: number;
  reorder_point: number;
  suggested_quantity: number;
  preferred_supplier: string;
  estimated_cost: number;
  lead_time: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  auto_reorder_enabled: boolean;
}

export const AutoReorderSection = () => {
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(true);
  
  // Mock data - in production, this would come from API
  const reorderSuggestions: ReorderSuggestion[] = [
    {
      id: "1",
      product_name: "Solar Panel 400W Monocrystalline",
      current_stock: 5,
      reorder_point: 20,
      suggested_quantity: 50,
      preferred_supplier: "SolarTech Solutions",
      estimated_cost: 12500,
      lead_time: 14,
      priority: "critical",
      auto_reorder_enabled: true
    },
    {
      id: "2",
      product_name: "MPPT Charge Controller 60A",
      current_stock: 8,
      reorder_point: 15,
      suggested_quantity: 25,
      preferred_supplier: "PowerMax Components",
      estimated_cost: 3750,
      lead_time: 7,
      priority: "high",
      auto_reorder_enabled: false
    },
    {
      id: "3",
      product_name: "Lithium Battery 100Ah",
      current_stock: 12,
      reorder_point: 25,
      suggested_quantity: 30,
      preferred_supplier: "GreenEnergy Supply",
      estimated_cost: 9000,
      lead_time: 10,
      priority: "medium",
      auto_reorder_enabled: true
    }
  ];

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

  const handleCreatePurchaseOrder = (suggestion: ReorderSuggestion) => {
    console.log("Creating purchase order for:", suggestion.product_name);
    // Implementation would go here
  };

  const handleToggleAutoReorder = (id: string, enabled: boolean) => {
    console.log("Toggling auto-reorder for:", id, enabled);
    // Implementation would go here
  };

  const totalEstimatedCost = reorderSuggestions.reduce((sum, item) => sum + item.estimated_cost, 0);
  const criticalItems = reorderSuggestions.filter(item => item.priority === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Auto-Reorder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Auto-Reorder Settings</span>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{criticalItems}</div>
              <div className="text-sm text-muted-foreground">Critical Items</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{reorderSuggestions.length}</div>
              <div className="text-sm text-muted-foreground">Total Suggestions</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalEstimatedCost)}</div>
              <div className="text-sm text-muted-foreground">Estimated Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reorder Suggestions</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Auto-Generate All
              </Button>
              <Button size="sm">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Bulk Create Orders
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Suggested Qty</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Est. Cost</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Auto-Reorder</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reorderSuggestions.map((suggestion) => (
                <TableRow key={suggestion.id}>
                  <TableCell>
                    <div className="font-medium">{suggestion.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Lead time: {suggestion.lead_time} days
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      suggestion.current_stock <= suggestion.reorder_point ? "border-destructive text-destructive" : ""
                    }>
                      {suggestion.current_stock}
                    </Badge>
                  </TableCell>
                  <TableCell>{suggestion.reorder_point}</TableCell>
                  <TableCell className="font-medium">{suggestion.suggested_quantity}</TableCell>
                  <TableCell>{suggestion.preferred_supplier}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(suggestion.estimated_cost)}</TableCell>
                  <TableCell>{getPriorityBadge(suggestion.priority)}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={suggestion.auto_reorder_enabled}
                      onCheckedChange={(checked) => handleToggleAutoReorder(suggestion.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleCreatePurchaseOrder(suggestion)}
                      >
                        Create PO
                      </Button>
                      <Button variant="outline" size="sm">
                        Adjust
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Automation Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Auto-create PO for critical items</div>
                <div className="text-sm text-muted-foreground">
                  Automatically create purchase orders when stock reaches critical level
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Email notifications for reorder suggestions</div>
                <div className="text-sm text-muted-foreground">
                  Send daily email digest of reorder suggestions to procurement team
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Prefer suppliers with better ratings</div>
                <div className="text-sm text-muted-foreground">
                  Prioritize suppliers with higher quality and delivery ratings
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