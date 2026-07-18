// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, AlertCircle, CheckCircle, Package, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  total_containers: number;
  on_time_delivery_rate: number;
  average_delivery_days: number;
  average_variance_days: number;
  quality_score: number;
  performance_grade: string;
}

interface ContainerAnalytics {
  total_containers: number;
  completed_containers: number;
  average_transit_days: number;
  on_time_delivery_rate: number;
  pending_customs: number;
  overdue_containers: number;
}

interface DeliveryTrend {
  month: string;
  containers: number;
  average_days: number;
  on_time_rate: number;
}

export const ContainerAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<ContainerAnalytics | null>(null);
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformance[]>([]);
  const [deliveryTrends, setDeliveryTrends] = useState<DeliveryTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch container analytics
      const { data: containers, error: containersError } = await supabase
        .from('containers')
        .select('*, supplier:suppliers(name)');

      if (containersError) throw containersError;

      // Calculate overall analytics
      const totalContainers = containers?.length || 0;
      const completedContainers = containers?.filter(c => c.status === 'completed').length || 0;
      const pendingCustoms = containers?.filter(c => c.status === 'customs_processing').length || 0;
      
      const currentDate = new Date();
      const overdueContainers = containers?.filter(c => {
        if (!c.estimated_delivery_date) return false;
        return new Date(c.estimated_delivery_date) < currentDate && c.status !== 'completed';
      }).length || 0;

      // Fetch analytics from the analytics table
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('container_analytics')
        .select('*');

      if (analyticsError) throw analyticsError;

      const avgTransitDays = analyticsData?.length ? 
        analyticsData.reduce((sum, a) => sum + (a.total_transit_days || 0), 0) / analyticsData.length : 0;
      
      const onTimeRate = analyticsData?.length ?
        (analyticsData.filter(a => a.on_time_delivery).length / analyticsData.length) * 100 : 0;

      const analytics: ContainerAnalytics = {
        total_containers: totalContainers,
        completed_containers: completedContainers,
        average_transit_days: Math.round(avgTransitDays),
        on_time_delivery_rate: Math.round(onTimeRate),
        pending_customs: pendingCustoms,
        overdue_containers: overdueContainers,
      };

      setAnalytics(analytics);

      // Fetch supplier performance
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*');

      if (suppliersError) throw suppliersError;

      const supplierStats: SupplierPerformance[] = [];
      
      for (const supplier of suppliers || []) {
        const supplierContainers = containers?.filter(c => c.supplier_id === supplier.id) || [];
        const supplierAnalytics = analyticsData?.filter(a => a.supplier_id === supplier.id) || [];
        
        if (supplierContainers.length > 0) {
          const onTime = supplierAnalytics.filter(a => a.on_time_delivery).length;
          const onTimeRate = supplierAnalytics.length ? (onTime / supplierAnalytics.length) * 100 : 0;
          const avgDays = supplierAnalytics.length ? 
            supplierAnalytics.reduce((sum, a) => sum + (a.total_transit_days || 0), 0) / supplierAnalytics.length : 0;
          const avgVariance = supplierAnalytics.length ?
            supplierAnalytics.reduce((sum, a) => sum + Math.abs(a.delivery_variance_days || 0), 0) / supplierAnalytics.length : 0;
          const qualityScore = supplierAnalytics.length ?
            supplierAnalytics.reduce((sum, a) => sum + (a.quality_score || 5), 0) / supplierAnalytics.length : 5;

          let grade = 'F';
          if (qualityScore >= 4.5 && onTimeRate >= 90) grade = 'A';
          else if (qualityScore >= 4.0 && onTimeRate >= 80) grade = 'B';
          else if (qualityScore >= 3.5 && onTimeRate >= 70) grade = 'C';
          else if (qualityScore >= 3.0 && onTimeRate >= 60) grade = 'D';

          supplierStats.push({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            total_containers: supplierContainers.length,
            on_time_delivery_rate: Math.round(onTimeRate),
            average_delivery_days: Math.round(avgDays),
            average_variance_days: Math.round(avgVariance),
            quality_score: Math.round(qualityScore * 100) / 100,
            performance_grade: grade,
          });
        }
      }

      setSupplierPerformance(supplierStats.sort((a, b) => b.quality_score - a.quality_score));

      // Generate delivery trends (mock data for demo)
      const trends: DeliveryTrend[] = [
        { month: 'Jan', containers: 12, average_days: 28, on_time_rate: 85 },
        { month: 'Feb', containers: 15, average_days: 26, on_time_rate: 88 },
        { month: 'Mar', containers: 18, average_days: 30, on_time_rate: 82 },
        { month: 'Apr', containers: 14, average_days: 27, on_time_rate: 90 },
        { month: 'May', containers: 20, average_days: 25, on_time_rate: 92 },
        { month: 'Jun', containers: 16, average_days: 29, on_time_rate: 87 },
      ];

      setDeliveryTrends(trends);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch container analytics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">Total Containers</p>
                <p className="text-2xl font-bold">{analytics.total_containers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{analytics.completed_containers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">Avg Transit Days</p>
                <p className="text-2xl font-bold">{analytics.average_transit_days}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">On-Time Rate</p>
                <p className="text-2xl font-bold">{analytics.on_time_delivery_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Truck className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">In Customs</p>
                <p className="text-2xl font-bold">{analytics.pending_customs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{analytics.overdue_containers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Delivery Trends</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Trends</CardTitle>
              <CardDescription>Monthly container delivery performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={deliveryTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="containers" fill="hsl(var(--primary))" name="Containers" />
                  <Line yAxisId="right" type="monotone" dataKey="on_time_rate" stroke="hsl(var(--destructive))" name="On-Time Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Performance metrics by supplier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.map((supplier) => (
                  <div key={supplier.supplier_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge className={`${getGradeColor(supplier.performance_grade)} text-white`}>
                        {supplier.performance_grade}
                      </Badge>
                      <div>
                        <p className="font-medium">{supplier.supplier_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplier.total_containers} containers • {supplier.on_time_delivery_rate}% on-time
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-medium">{supplier.average_delivery_days} days</p>
                        <p className="text-xs text-muted-foreground">Avg Delivery</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium">{supplier.quality_score}/5.0</p>
                        <p className="text-xs text-muted-foreground">Quality Score</p>
                      </div>
                      
                      <div className="w-24">
                        <Progress value={supplier.on_time_delivery_rate} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};