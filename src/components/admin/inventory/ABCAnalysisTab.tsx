// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Package, DollarSign, RefreshCw } from 'lucide-react';

interface ABCAnalysisData {
  product_id: string;
  product_name: string;
  annual_consumption_value: number;
  abc_category: 'A' | 'B' | 'C';
  percentage_of_total: number;
}

const ABCAnalysisTab = () => {
  const [analysisData, setAnalysisData] = useState<ABCAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchABCAnalysis = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('calculate_abc_analysis');
      
      if (error) throw error;
      
      setAnalysisData((data || []).map((item: any) => ({
        ...item,
        abc_category: item.abc_category as 'A' | 'B' | 'C'
      })));
    } catch (error: any) {
      console.error('Error fetching ABC analysis:', error);
      toast({
        title: "Error",
        description: "Failed to load ABC analysis data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchABCAnalysis();
  }, []);

  const getCategoryStats = () => {
    const stats = {
      A: { count: 0, value: 0 },
      B: { count: 0, value: 0 },
      C: { count: 0, value: 0 }
    };

    analysisData.forEach(item => {
      stats[item.abc_category].count++;
      stats[item.abc_category].value += item.annual_consumption_value;
    });

    return stats;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'A': return 'bg-destructive';
      case 'B': return 'bg-warning';
      case 'C': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const stats = getCategoryStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['A', 'B', 'C'].map((category) => (
          <Card key={category}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Category {category}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats[category as keyof typeof stats].count}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats[category as keyof typeof stats].value)} annual value
              </p>
              <div className="mt-2">
                <Badge className={getCategoryColor(category)}>
                  {category === 'A' && 'High Value (80%)'}
                  {category === 'B' && 'Medium Value (15%)'}
                  {category === 'C' && 'Low Value (5%)'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analysis Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ABC Analysis Details</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchABCAnalysis}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Annual Value</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisData.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(item.abc_category)}>
                      {item.abc_category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.annual_consumption_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.percentage_of_total.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {item.abc_category === 'A' && (
                      <span className="text-sm text-destructive font-medium">Critical</span>
                    )}
                    {item.abc_category === 'B' && (
                      <span className="text-sm text-warning font-medium">Important</span>
                    )}
                    {item.abc_category === 'C' && (
                      <span className="text-sm text-muted-foreground">Routine</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Analysis Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analysis Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Category A Products (High Value)</h4>
            <p className="text-sm text-muted-foreground">
              These {stats.A.count} products represent the highest value items and should receive priority attention 
              for inventory management, supplier relationships, and demand forecasting.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Category B Products (Medium Value)</h4>
            <p className="text-sm text-muted-foreground">
              These {stats.B.count} products require moderate attention with standard inventory management practices.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Category C Products (Low Value)</h4>
            <p className="text-sm text-muted-foreground">
              These {stats.C.count} products can be managed with simpler inventory policies and bulk ordering.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ABCAnalysisTab;