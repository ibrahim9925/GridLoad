import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { AlertTriangle, DollarSign, Clock, TrendingUp, Search, Filter, Plus, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentDialog from "@/components/admin/sales/PaymentDialog";
import { generatePaymentReceiptPDF } from "@/utils/invoicePDF";

interface PaymentRecord {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  currency: string;
  notes: string;
  recorded_by: string;
  customer_name: string;
  invoice_number: string;
  sale_total: number;
  balance_due: number;
}

interface PaymentScheduleRecord {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
  customer_name: string;
  invoice_number: string;
  days_overdue: number;
}

interface PaymentStats {
  total_collected: number;
  total_outstanding: number;
  overdue_amount: number;
  pending_amount: number;
  collection_rate: number;
  overdue_count: number;
}

const ComprehensivePayments = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentScheduleRecord[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    total_collected: 0,
    total_outstanding: 0,
    overdue_amount: 0,
    pending_amount: 0,
    collection_rate: 0,
    overdue_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { toast } = useToast();

  const {
    selectedIds: selectedPaymentIds,
    selectedItems: selectedPayments,
    selectItem: selectPayment,
    selectAll: selectAllPayments,
    deselectAll: deselectAllPayments,
    isSelected: isPaymentSelected,
    selectedCount: selectedPaymentCount,
  } = useBulkSelection(paymentRecords, (record) => record.id);

  const {
    selectedIds: selectedScheduleIds,
    selectedItems: selectedSchedules,
    selectItem: selectSchedule,
    selectAll: selectAllSchedules,
    deselectAll: deselectAllSchedules,
    isSelected: isScheduleSelected,
    selectedCount: selectedScheduleCount,
  } = useBulkSelection(paymentSchedules, (schedule) => schedule.id);

  useEffect(() => {
    fetchAllPaymentData();
  }, []);

  const fetchAllPaymentData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch payment records with related data
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          sales!payments_sale_id_fkey (
            invoice_number,
            total_amount,
            balance_due,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name
            )
          )
        `)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Transform payment records
      const transformedPayments: PaymentRecord[] = (paymentsData || []).map((payment: any) => ({
        ...payment,
        customer_name: payment.sales?.customers?.contact_person || 'Unknown',
        invoice_number: payment.sales?.invoice_number || `SALE-${payment.sale_id?.slice(0, 8)}`,
        sale_total: payment.sales?.total_amount || 0,
        balance_due: payment.sales?.balance_due || 0,
      }));

      // Fetch payment schedules with related data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('payment_schedules')
        .select(`
          *,
          sales!payment_schedules_sale_id_fkey (
            invoice_number,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name
            )
          )
        `)
        .order('due_date', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Transform payment schedules and calculate overdue days
      const transformedSchedules: PaymentScheduleRecord[] = (schedulesData || []).map((schedule: any) => {
        const dueDate = new Date(schedule.due_date);
        const today = new Date();
        const daysOverdue = schedule.status === 'overdue' 
          ? Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          ...schedule,
          customer_name: schedule.sales?.customers?.contact_person || 'Unknown',
          invoice_number: schedule.sales?.invoice_number || `SALE-${schedule.sale_id?.slice(0, 8)}`,
          days_overdue: Math.max(0, daysOverdue),
        };
      });

      // Calculate payment statistics
      const totalCollected = transformedPayments.reduce((sum, p) => sum + p.amount, 0);
      const overdueSchedules = transformedSchedules.filter(s => s.status === 'overdue');
      const pendingSchedules = transformedSchedules.filter(s => s.status === 'pending');
      const overdueAmount = overdueSchedules.reduce((sum, s) => sum + s.amount, 0);
      const pendingAmount = pendingSchedules.reduce((sum, s) => sum + s.amount, 0);
      const totalOutstanding = overdueAmount + pendingAmount;

      const stats: PaymentStats = {
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        overdue_amount: overdueAmount,
        pending_amount: pendingAmount,
        collection_rate: totalOutstanding > 0 ? (totalCollected / (totalCollected + totalOutstanding)) * 100 : 100,
        overdue_count: overdueSchedules.length,
      };

      setPaymentRecords(transformedPayments);
      setPaymentSchedules(transformedSchedules);
      setPaymentStats(stats);

    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment data",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = (schedule?: PaymentScheduleRecord) => {
    setSelectedSchedule(schedule);
    setPaymentDialogOpen(true);
  };

  const handlePaymentCreated = () => {
    fetchAllPaymentData();
    setPaymentDialogOpen(false);
    setSelectedSchedule(null);
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const updates = selectedSchedules.map(schedule => 
        supabase
          .from('payment_schedules')
          .update({ status: newStatus })
          .eq('id', schedule.id)
      );

      await Promise.all(updates);
      
      toast({
        title: "Success",
        description: `Updated ${selectedSchedules.length} payment schedules`,
      });
      
      deselectAllSchedules();
      fetchAllPaymentData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update payment schedules",
      });
    }
  };

  const generateReceipt = async (payment: PaymentRecord) => {
    const receiptData = {
      receiptNumber: `RCP-${payment.id.slice(0, 8)}`,
      paymentDate: payment.payment_date,
      customer: {
        name: payment.customer_name,
        company: ""
      },
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      forInvoice: payment.invoice_number
    };
    
    await generatePaymentReceiptPDF(receiptData);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'paid': 'default',
      'pending': 'secondary',
      'overdue': 'destructive',
      'partial': 'outline',
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const filteredPayments = paymentRecords.filter(payment => {
    const matchesSearch = payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredSchedules = paymentSchedules.filter(schedule => {
    const matchesSearch = schedule.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="stats" count={4} />
        <LoadingSkeleton type="table" count={8} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Comprehensive payment tracking and management</p>
        </div>
        <Button onClick={() => handleRecordPayment()}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${paymentStats.total_collected.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${paymentStats.total_outstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending + Overdue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${paymentStats.overdue_amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{paymentStats.overdue_count} payments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Collection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {paymentStats.collection_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Payment Schedules</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="customer-view">Customer View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers or invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BulkActionBar
            selectedCount={selectedScheduleCount}
            onDeselectAll={deselectAllSchedules}
            onDeleteSelected={() => {}}
            customActions={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('paid')}
                >
                  Mark Paid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('overdue')}
                >
                  Mark Overdue
                </Button>
              </div>
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Payment Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedScheduleCount === filteredSchedules.length && filteredSchedules.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) selectAllSchedules();
                          else deselectAllSchedules();
                        }}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <Checkbox
                          checked={isScheduleSelected(schedule.id)}
                          onCheckedChange={() => selectSchedule(schedule.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{schedule.customer_name}</TableCell>
                      <TableCell>{schedule.invoice_number}</TableCell>
                      <TableCell>{new Date(schedule.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>${schedule.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        {schedule.days_overdue > 0 && (
                          <Badge variant="destructive">{schedule.days_overdue} days</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordPayment(schedule)}
                            disabled={schedule.status === 'paid'}
                          >
                            Record Payment
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{payment.customer_name}</TableCell>
                      <TableCell>{payment.invoice_number}</TableCell>
                      <TableCell>${payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{payment.reference_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReceipt(payment)}
                        >
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="mx-auto h-12 w-12 mb-4" />
                <div className="text-lg font-medium">Customer payment analytics coming soon</div>
                <div className="text-sm">View payment history by customer, outstanding balances, and payment trends</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onPaymentCreated={handlePaymentCreated}
        selectedSchedule={selectedSchedule}
      />
    </div>
  );
};

export default ComprehensivePayments;