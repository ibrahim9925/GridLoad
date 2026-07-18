// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Package, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface AnalyticsData {
  monthlySpend: number;
  spendGrowth: number;
  averageOrderValue: number;
  averageLeadTime: number;
  onTimeDelivery: number;
  costSavings: number;
  totalContainers: number;
  completedContainers: number;
  topSuppliers: Array<{
    name: string;
    spend: number;
    orders: number;
    onTimeRate: number;
  }>;
  categorySpend: Array<{
    category: string;
    amount: number;
    percentage: number;
    containerCount: number;
  }>;
  leadTimeAnalysis: {
    averageTransitDays: number;
    averageCustomsDays: number;
    averageLocalDeliveryDays: number;
  };
}

export const RealProcurementAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch containers data with related information
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select(`
          *,
          suppliers:supplier_id (
            name,
            contact_person
          ),
          container_products (
            quantity,
            unit_cost,
            total_cost,
            product_name
          )
        `);

      if (containersError) throw containersError;

      // Fetch purchase orders for additional spend analysis
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers:supplier_id (
            name
          )
        `);

      if (poError) throw poError;

      // Calculate analytics
      const currentMonth = new Date();
      const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

      // Current month containers
      const currentMonthContainers = containers?.filter(c => 
        new Date(c.created_at) >= currentMonthStart
      ) || [];

      // Last month containers
      const lastMonthContainers = containers?.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= lastMonth && createdDate < currentMonthStart;
      }) || [];

      // Calculate monthly spend
      const currentMonthSpend = currentMonthContainers.reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const lastMonthSpend = lastMonthContainers.reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const spendGrowth = lastMonthSpend > 0 ? ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

      // Calculate average order value
      const totalContainerValue = containers?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0;
      const averageOrderValue = containers?.length > 0 ? totalContainerValue / containers.length : 0;

      // Calculate lead times (simplified - using date differences)
      const completedContainers = containers?.filter(c => c.status === 'completed' || c.status === 'delivered') || [];
      const leadTimes = completedContainers
        .filter(c => c.order_date && c.delivered_date)
        .map(c => {
          const orderDate = new Date(c.order_date);
          const deliveredDate = new Date(c.delivered_date!);
          return Math.ceil((deliveredDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        });

      const averageLeadTime = leadTimes.length > 0 
        ? leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length 
        : 0;

      // Calculate on-time delivery
      const onTimeContainers = completedContainers.filter(c => {
        if (!c.estimated_delivery_date || !c.delivered_date) return false;
        const estimated = new Date(c.estimated_delivery_date);
        const actual = new Date(c.delivered_date);
        return actual <= estimated;
      }).length;

      const onTimeDelivery = completedContainers.length > 0 
        ? (onTimeContainers / completedContainers.length) * 100 
        : 0;

      // Top suppliers analysis
      const supplierStats = new Map();
      containers?.forEach((container: any) => {
        if (container.suppliers) {
          const supplierName = (container.suppliers as any)?.name || 'Unknown';
          const existing = supplierStats.get(supplierName) || { 
            name: supplierName, 
            spend: 0, 
            orders: 0,
            onTimeDeliveries: 0,
            totalDeliveries: 0
          };
          
          existing.spend += container.total_cost || 0;
          existing.orders += 1;
          
          if (container.status === 'completed' || container.status === 'delivered') {
            existing.totalDeliveries += 1;
            if (container.estimated_delivery_date && container.delivered_date) {
              const estimated = new Date(container.estimated_delivery_date);
              const actual = new Date(container.delivered_date);
              if (actual <= estimated) {
                existing.onTimeDeliveries += 1;
              }
            }
          }
          
          supplierStats.set(supplierName, existing);
        }
      });

      const topSuppliers = Array.from(supplierStats.values())
        .map(supplier => ({
          ...supplier,
          onTimeRate: supplier.totalDeliveries > 0 
            ? (supplier.onTimeDeliveries / supplier.totalDeliveries) * 100 
            : 0
        }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5);

      // Category analysis (based on container products)
      const categoryStats = new Map();
      containers?.forEach(container => {
        container.container_products?.forEach((product: any) => {
          // Simple category inference based on product name keywords
          let category = 'Other';
          const productName = product.product_name?.toLowerCase() || '';
          
          if (productName.includes('panel') || productName.includes('solar')) category = 'Solar Panels';
          else if (productName.includes('inverter')) category = 'Inverters';
          else if (productName.includes('battery')) category = 'Batteries';
          else if (productName.includes('mount') || productName.includes('rack')) category = 'Mounting';
          else if (productName.includes('cable') || productName.includes('wire')) category = 'Cables & Accessories';

          const existing = categoryStats.get(category) || { 
            category, 
            amount: 0, 
            containerCount: 0 
          };
          
          existing.amount += product.total_cost || 0;
          existing.containerCount += 1;
          
          categoryStats.set(category, existing);
        });
      });

      const totalCategorySpend = Array.from(categoryStats.values()).reduce((sum, cat) => sum + cat.amount, 0);
      const categorySpend = Array.from(categoryStats.values())
        .map(cat => ({
          ...cat,
          percentage: totalCategorySpend > 0 ? (cat.amount / totalCategorySpend) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

      // Lead time analysis (simplified)
      const leadTimeAnalysis = {
        averageTransitDays: Math.round(averageLeadTime * 0.6), // Assume 60% of lead time is transit
        averageCustomsDays: Math.round(averageLeadTime * 0.25), // 25% customs
        averageLocalDeliveryDays: Math.round(averageLeadTime * 0.15), // 15% local delivery
      };

      // Cost savings (simple calculation based on container cost vs estimated retail)
      const totalContainerCost = totalContainerValue;
      const estimatedRetailValue = totalContainerCost * 1.4; // Assume 40% markup
      const costSavings = estimatedRetailValue - totalContainerCost;

      const analyticsData: AnalyticsData = {
        monthlySpend: currentMonthSpend,
        spendGrowth,
        averageOrderValue,
        averageLeadTime: Math.round(averageLeadTime),
        onTimeDelivery: Math.round(onTimeDelivery),
        costSavings,
        totalContainers: containers?.length || 0,
        completedContainers: completedContainers.length,
        topSuppliers,
        categorySpend,
        leadTimeAnalysis,
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="stats" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingSkeleton type="cards" />
        <LoadingSkeleton type="cards" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.monthlySpend)}</div>
            <div className={`flex items-center gap-1 text-xs ${
              analytics.spendGrowth >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {analytics.spendGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(analytics.spendGrowth).toFixed(1)}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Container Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {analytics.totalContainers} containers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageLeadTime} days</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedContainers} completed containers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.onTimeDelivery}%</div>
            <Progress value={analytics.onTimeDelivery} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Lead Time Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Time Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.leadTimeAnalysis.averageTransitDays} days</div>
              <div className="text-sm text-muted-foreground">Average Transit Time</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.leadTimeAnalysis.averageCustomsDays} days</div>
              <div className="text-sm text-muted-foreground">Average Customs Processing</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.leadTimeAnalysis.averageLocalDeliveryDays} days</div>
              <div className="text-sm text-muted-foreground">Average Local Delivery</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topSuppliers.map((supplier, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {supplier.orders} orders • {supplier.onTimeRate.toFixed(1)}% on-time
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(supplier.spend)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((supplier.spend / analytics.monthlySpend) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categorySpend.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-sm">{formatCurrency(category.amount)}</span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                  <div className="text-right text-xs text-muted-foreground">
                    {category.percentage.toFixed(1)}% • {category.containerCount} containers
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">{formatCurrency(analytics.costSavings)}</div>
              <div className="text-sm text-muted-foreground">Estimated Total Savings</div>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">{analytics.completedContainers}</div>
              <div className="text-sm text-muted-foreground">Completed Containers</div>
            </div>
            <div className="text-center p-4 bg-orange-500/10 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.averageLeadTime} days</div>
              <div className="text-sm text-muted-foreground">Average Lead Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};