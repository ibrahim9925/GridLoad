// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { 
  DollarSign, 
  Package, 
  TrendingUp,
  Calculator,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface InventoryValuation {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
  valuation_method: string;
  valuation_date: string;
  product?: {
    name: string;
    sku?: string;
    current_stock: number;
  };
}

interface ValuationSummary {
  method: string;
  total_value: number;
  items_count: number;
  avg_unit_cost: number;
  last_updated: string;
}

interface ValuationHistory {
  date: string;
  fifo_value: number;
  weighted_avg_value: number;
  lifo_value: number;
}

const InventoryValuationTab = () => {
  const [valuations, setValuations] = useState<InventoryValuation[]>([]);
  const [summaries, setSummaries] = useState<ValuationSummary[]>([]);
  const [history, setHistory] = useState<ValuationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchValuationData();
  }, []);

  const fetchValuationData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch current valuations
      const { data: valuationData, error: valuationError } = await supabase
        .from('inventory_valuations')
        .select(`
          *,
          products!inventory_valuations_product_id_fkey(name, sku, current_stock)
        `)
        .order('valuation_date', { ascending: false });

      if (valuationError) throw valuationError;
      setValuations(valuationData || []);

      // Calculate summaries by method
      const methodGroups = (valuationData || []).reduce((groups, val) => {
        if (!groups[val.valuation_method]) {
          groups[val.valuation_method] = [];
        }
        groups[val.valuation_method].push(val);
        return groups;
      }, {} as Record<string, InventoryValuation[]>);

      const calculatedSummaries: ValuationSummary[] = Object.entries(methodGroups).map(([method, items]) => ({
        method,
        total_value: items.reduce((sum, item) => sum + item.total_value, 0),
        items_count: items.length,
        avg_unit_cost: items.reduce((sum, item) => sum + item.unit_cost, 0) / items.length,
        last_updated: items[0]?.valuation_date || new Date().toISOString()
      }));

      setSummaries(calculatedSummaries);

      // Generate sample history data (in real app, this would come from historical records)
      generateHistoryData();

    } catch (error: any) {
      console.error('Error fetching valuation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory valuations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateHistoryData = () => {
    const historyData: ValuationHistory[] = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const baseValue = 250000;
      const variation = Math.random() * 20000 - 10000;
      
      historyData.push({
        date: format(date, 'MMM dd'),
        fifo_value: baseValue + variation,
        weighted_avg_value: baseValue + variation * 0.95,
        lifo_value: baseValue + variation * 1.05
      });
    }
    
    setHistory(historyData);
  };

  const calculateValuations = async () => {
    try {
      setIsCalculating(true);
      
      // Fetch products with stock movements for calculation
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          stock_movements(quantity, unit_cost, created_at, movement_type)
        `)
        .gt('current_stock', 0);

      if (error) throw error;

      const calculations = (products || []).map(product => {
        const movements = (product as any).stock_movements || [];
        const inMovements = movements
          .filter((m: any) => m.movement_type === 'in' && m.unit_cost)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (inMovements.length === 0) return null;

        // FIFO Calculation
        let remainingStock = product.current_stock;
        let fifoValue = 0;
        for (const movement of inMovements) {
          if (remainingStock <= 0) break;
          const quantity = Math.min(remainingStock, movement.quantity);
          fifoValue += quantity * movement.unit_cost;
          remainingStock -= quantity;
        }

        // Weighted Average Calculation
        const totalQuantity = inMovements.reduce((sum: number, m: any) => sum + m.quantity, 0);
        const totalCost = inMovements.reduce((sum: number, m: any) => sum + (m.quantity * m.unit_cost), 0);
        const avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        const weightedAvgValue = product.current_stock * avgCost;

        // LIFO Calculation (Last In, First Out)
        let lifoRemainingStock = product.current_stock;
        let lifoValue = 0;
        for (let i = inMovements.length - 1; i >= 0 && lifoRemainingStock > 0; i--) {
          const movement = inMovements[i];
          const quantity = Math.min(lifoRemainingStock, movement.quantity);
          lifoValue += quantity * movement.unit_cost;
          lifoRemainingStock -= quantity;
        }

        return {
          product_id: product.id,
          product_name: product.name,
          current_stock: product.current_stock,
          fifo_value: fifoValue,
          weighted_avg_value: weightedAvgValue,
          lifo_value: lifoValue,
          avg_unit_cost: avgCost
        };
      }).filter(Boolean);

      // Insert new valuations
      const today = new Date().toISOString().split('T')[0];
      const valuationRecords = calculations.flatMap(calc => [
        {
          product_id: calc!.product_id,
          quantity: calc!.current_stock,
          unit_cost: calc!.fifo_value / calc!.current_stock,
          total_value: calc!.fifo_value,
          valuation_method: 'fifo'
        },
        {
          product_id: calc!.product_id,
          quantity: calc!.current_stock,
          unit_cost: calc!.avg_unit_cost,
          total_value: calc!.weighted_avg_value,
          valuation_method: 'weighted_average'
        },
        {
          product_id: calc!.product_id,
          quantity: calc!.current_stock,
          unit_cost: calc!.lifo_value / calc!.current_stock,
          total_value: calc!.lifo_value,
          valuation_method: 'lifo'
        }
      ]);

      const { error: insertError } = await supabase
        .from('inventory_valuations')
        .insert(valuationRecords);

      if (insertError) throw insertError;

      toast({
        title: "Valuations Calculated",
        description: `Updated valuations for ${calculations.length} products using FIFO, LIFO, and Weighted Average methods.`,
      });

      await fetchValuationData();

    } catch (error: any) {
      console.error('Error calculating valuations:', error);
      toast({
        title: "Error",
        description: "Failed to calculate inventory valuations.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const filteredValuations = selectedMethod === 'all' 
    ? valuations 
    : valuations.filter(val => val.valuation_method === selectedMethod);

  const formatCurrency = (amount: number) => {
    return `₪${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount || 0)}`;
  };

  const getMethodBadge = (method: string) => {
    const variants = {
      fifo: 'default',
      lifo: 'secondary',
      weighted_average: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[method as keyof typeof variants] || 'outline'}>
        {method.toUpperCase().replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading inventory valuations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaries.map((summary) => (
          <Card key={summary.method}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {summary.method.toUpperCase().replace('_', ' ')} Method
                    </p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {summary.items_count} items • Avg: {formatCurrency(summary.avg_unit_cost)}
                    </p>
                  </div>
                </div>
                {getMethodBadge(summary.method)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Valuation History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation History Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Value']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="fifo_value" 
                stroke="#10b981" 
                name="FIFO"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="weighted_avg_value" 
                stroke="#f59e0b" 
                name="Weighted Average"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="lifo_value" 
                stroke="#ef4444" 
                name="LIFO"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedMethod} onValueChange={setSelectedMethod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="fifo">FIFO</SelectItem>
              <SelectItem value="lifo">LIFO</SelectItem>
              <SelectItem value="weighted_average">Weighted Average</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={calculateValuations} 
          disabled={isCalculating}
          className="flex items-center gap-2"
        >
          {isCalculating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          {isCalculating ? 'Calculating...' : 'Recalculate Valuations'}
        </Button>
      </div>

      {/* Detailed Valuations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Valuations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValuations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No valuations found. Click "Recalculate Valuations" to generate current data.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredValuations.slice(0, 50).map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{valuation.product?.name}</div>
                        {valuation.product?.sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {valuation.product.sku}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getMethodBadge(valuation.valuation_method)}</TableCell>
                    <TableCell>{valuation.quantity}</TableCell>
                    <TableCell>{formatCurrency(valuation.unit_cost)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(valuation.total_value)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">
                          {format(new Date(valuation.valuation_date), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {filteredValuations.length > 50 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Showing latest 50 of {filteredValuations.length} valuation records
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Method Explanations */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Methods Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-green-600">FIFO (First In, First Out)</h4>
              <p className="text-sm text-muted-foreground">
                Assumes the first items purchased are the first items sold. 
                Uses the cost of the oldest inventory for valuation.
                Best for businesses with perishable goods.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-yellow-600">Weighted Average</h4>
              <p className="text-sm text-muted-foreground">
                Calculates the average cost of all units in inventory.
                Smooths out price fluctuations over time.
                Most commonly used method for inventory valuation.
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2 text-red-600">LIFO (Last In, First Out)</h4>
              <p className="text-sm text-muted-foreground">
                Assumes the last items purchased are the first items sold.
                Uses the cost of the newest inventory for valuation.
                Can provide tax advantages during inflation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryValuationTab;