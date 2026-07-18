// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Download,
  Eye,
  CheckCircle
} from 'lucide-react';
import CommissionTargetManager from './CommissionTargetManager';
import CommissionPaymentTracker from './CommissionPaymentTracker';
import CommissionReports from './CommissionReports';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CommissionStats {
  totalEarned: number;
  pendingCommission: number;
  targetAchievement: number;
  salesRepsCount: number;
  averageCommissionRate: number;
  monthlyCommissions: number;
  commissionsYTD: number;
  topPerformer: string;
}

interface CommissionSummary {
  salesRepId: string;
  salesRepName: string;
  totalSales: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  commissionRate: number;
  lastPaymentDate?: string;
}

const CommissionManagementDashboard = () => {
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [commissionSummaries, setCommissionSummaries] = useState<CommissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCommissionData = async () => {
    try {
      setIsLoading(true);

      // Fetch commission payments and calculate stats
      const { data: commissionPayments, error: paymentsError } = await supabase
        .from('commission_payments')
        .select('*');

      if (paymentsError) throw paymentsError;

      // Fetch sales data with staff info
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          staff!sales_sales_rep_id_fkey(full_name, commission_rate)
        `)
        .not('sales_rep_id', 'is', null);

      if (salesError) throw salesError;

      if (salesError) throw salesError;

      // Calculate comprehensive stats
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentYear = new Date().getFullYear();

      const totalEarned = commissionPayments?.reduce((sum, payment) => 
        sum + (payment.total_commission || 0), 0) || 0;

      const pendingCommissions = commissionPayments?.filter(p => p.status === 'pending')
        .reduce((sum, payment) => sum + (payment.total_commission || 0), 0) || 0;

      const monthlyCommissions = commissionPayments?.filter(p => 
        p.period_start?.startsWith(currentMonth))
        .reduce((sum, payment) => sum + (payment.total_commission || 0), 0) || 0;

      const commissionsYTD = commissionPayments?.filter(p => 
        new Date(p.period_start || '').getFullYear() === currentYear)
        .reduce((sum, payment) => sum + (payment.total_commission || 0), 0) || 0;

      // Get unique sales reps
      const salesReps = [...new Set(salesData?.map(s => s.sales_rep_id))];

      // Calculate commission summaries by sales rep
      const summaries: CommissionSummary[] = salesReps.map(repId => {
        const repSales = salesData?.filter(s => s.sales_rep_id === repId) || [];
        const repCommissions = commissionPayments?.filter(c => c.sales_rep_id === repId) || [];
        
        const totalSales = repSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const totalCommission = repCommissions.reduce((sum, comm) => sum + (comm.total_commission || 0), 0);
        const paidCommission = repCommissions.filter(c => c.status === 'paid')
          .reduce((sum, comm) => sum + (comm.total_commission || 0), 0);
        const pendingCommission = repCommissions.filter(c => c.status === 'pending')
          .reduce((sum, comm) => sum + (comm.total_commission || 0), 0);

        const lastPayment = repCommissions
          .filter(c => c.payment_date)
          .sort((a, b) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())[0];

        return {
          salesRepId: repId,
          salesRepName: repSales[0]?.staff?.full_name || 'Unknown',
          totalSales,
          totalCommission,
          paidCommission,
          pendingCommission,
          commissionRate: repSales[0]?.staff?.commission_rate || 0,
          lastPaymentDate: lastPayment?.payment_date
        };
      });

      // Calculate top performer
      const topPerformer = summaries.reduce((top, current) => 
        current.totalCommission > top.totalCommission ? current : top, 
        summaries[0] || { salesRepName: 'N/A', totalCommission: 0 });

      const calculatedStats: CommissionStats = {
        totalEarned,
        pendingCommission: pendingCommissions,
        targetAchievement: 85, // This would come from targets in real implementation
        salesRepsCount: salesReps.length,
        averageCommissionRate: summaries.reduce((sum, s) => sum + s.commissionRate, 0) / summaries.length || 0,
        monthlyCommissions,
        commissionsYTD,
        topPerformer: topPerformer?.salesRepName || 'N/A'
      };

      setStats(calculatedStats);
      setCommissionSummaries(summaries);

    } catch (error) {
      console.error('Error fetching commission data:', error);
      toast({
        title: "Error",
        description: "Failed to load commission data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const handleTargetUpdate = () => {
    fetchCommissionData();
    toast({
      title: "Success",
      description: "Commission targets updated successfully",
    });
  };

  const handlePaymentUpdate = () => {
    fetchCommissionData();
    toast({
      title: "Success", 
      description: "Commission payment processed successfully",
    });
  };

  const processAllPendingCommissions = async () => {
    try {
      const pendingPayments = commissionSummaries.filter(s => s.pendingCommission > 0);
      
      for (const payment of pendingPayments) {
        const { error } = await supabase
          .from('commission_payments')
          .update({ 
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'bank_transfer'
          })
          .eq('sales_rep_id', payment.salesRepId)
          .eq('status', 'pending');

        if (error) throw error;
      }

      await fetchCommissionData();
      toast({
        title: "Success",
        description: `Processed ${pendingPayments.length} commission payments`,
      });
    } catch (error) {
      console.error('Error processing commissions:', error);
      toast({
        title: "Error",
        description: "Failed to process commission payments",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Commission Management</h1>
          <p className="text-muted-foreground">Track and manage sales commission payments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={processAllPendingCommissions} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Process All Pending
          </Button>
          <Button variant="outline" onClick={fetchCommissionData}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalEarned?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              YTD: ${stats?.commissionsYTD?.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${stats?.pendingCommission?.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sales Reps</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.salesRepsCount}</div>
            <p className="text-xs text-muted-foreground">
              Avg Rate: {stats?.averageCommissionRate?.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{stats?.topPerformer}</div>
            <p className="text-xs text-muted-foreground">
              This month: ${stats?.monthlyCommissions?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Rep Commission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionSummaries.map((summary) => (
              <div key={summary.salesRepId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{summary.salesRepName}</h3>
                  <p className="text-sm text-muted-foreground">
                    Total Sales: ${summary.totalSales.toLocaleString()} | 
                    Rate: {summary.commissionRate}%
                  </p>
                  {summary.lastPaymentDate && (
                    <p className="text-xs text-muted-foreground">
                      Last Payment: {new Date(summary.lastPaymentDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Earned: ${summary.totalCommission.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">
                      Paid: ${summary.paidCommission.toLocaleString()}
                    </div>
                    {summary.pendingCommission > 0 && (
                      <div className="text-sm text-orange-600">
                        Pending: ${summary.pendingCommission.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <Badge variant={summary.pendingCommission > 0 ? "secondary" : "default"}>
                    {summary.pendingCommission > 0 ? "Pending" : "Up to Date"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="targets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="targets">Commission Targets</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-6">
          <CommissionTargetManager onTargetUpdate={handleTargetUpdate} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <CommissionPaymentTracker onPaymentUpdate={handlePaymentUpdate} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <CommissionReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionManagementDashboard;