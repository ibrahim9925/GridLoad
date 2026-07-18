// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, DollarSign, Calendar, CheckCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";

interface PendingDeliveryPayment {
  id: string;
  invoice_number: string;
  total_amount: number;
  delivery_company_name: string;
  delivery_date: string;
  expected_payment_date: string;
  customer_name: string;
  company_name?: string;
  days_overdue: number;
}

const DeliveryCompanySettlement = () => {
  const [pendingPayments, setPendingPayments] = useState<PendingDeliveryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingDeliveryPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          total_amount,
          delivery_company_name,
          delivery_date,
          expected_payment_date,
          customers!sales_customer_id_fkey(contact_person, company_name)
        `)
        .eq("payment_status", "delivered_pending_payment")
        .eq("delivery_company_settled", false)
        .order("expected_payment_date", { ascending: true });

      if (error) throw error;

      const paymentsWithOverdue = (data || []).map(payment => {
        const expectedDate = new Date(payment.expected_payment_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: payment.id,
          invoice_number: payment.invoice_number || `INV-${payment.id.substring(0, 8)}`,
          total_amount: payment.total_amount,
          delivery_company_name: payment.delivery_company_name,
          delivery_date: payment.delivery_date,
          expected_payment_date: payment.expected_payment_date,
          customer_name: (payment.customers as any)?.contact_person || "Unknown",
          company_name: (payment.customers as any)?.company_name,
          days_overdue: Math.max(0, daysDiff),
        };
      });

      setPendingPayments(paymentsWithOverdue);
    } catch (error: any) {
      console.error("Error fetching pending payments:", error);
      toast({
        variant: "destructive",
        title: "Error loading pending payments",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettlePayment = (payment: PendingDeliveryPayment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.total_amount.toString());
    setSettleDialogOpen(true);
  };

  const processSettlement = async () => {
    if (!selectedPayment) return;

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          sale_id: selectedPayment.id,
          amount: parseFloat(paymentAmount),
          payment_method: "delivery_company",
          payment_date: paymentDate,
          reference_number: paymentReference || `DC-${selectedPayment.delivery_company_name}-${Date.now()}`,
          notes: `Settlement from ${selectedPayment.delivery_company_name}`,
        });

      if (paymentError) throw paymentError;

      // Update sale status
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          payment_status: "paid",
          delivery_company_settled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPayment.id);

      if (saleError) throw saleError;

      toast({
        title: "Payment Settled",
        description: `${formatCurrency(parseFloat(paymentAmount))} received from ${selectedPayment.delivery_company_name}`,
      });

      setSettleDialogOpen(false);
      setSelectedPayment(null);
      setPaymentAmount("");
      setPaymentReference("");
      fetchPendingPayments();
    } catch (error: any) {
      console.error("Error settling payment:", error);
      toast({
        variant: "destructive",
        title: "Error settling payment",
        description: error.message,
      });
    }
  };

  const filteredPayments = pendingPayments.filter(payment =>
    payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.delivery_company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = pendingPayments.reduce((sum, payment) => sum + payment.total_amount, 0);
  const overdueCount = pendingPayments.filter(p => p.days_overdue > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                <p className="text-sm text-muted-foreground">Total Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{pendingPayments.length}</p>
                <p className="text-sm text-muted-foreground">Pending Settlements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Company Settlements
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, company, or invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchPendingPayments} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Expected Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading pending payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No pending delivery company payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">
                        {payment.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.customer_name}</div>
                          {payment.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {payment.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{payment.delivery_company_name}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.delivery_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.expected_payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.days_overdue > 0 ? (
                          <Badge variant="destructive">
                            {payment.days_overdue} days overdue
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSettlePayment(payment)}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Settle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settlement Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Delivery Company Payment</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Invoice</Label>
                  <p className="font-mono">{selectedPayment.invoice_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p>{selectedPayment.customer_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Company</Label>
                  <p>{selectedPayment.delivery_company_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Original Amount</Label>
                  <p className="font-mono">{formatCurrency(selectedPayment.total_amount)}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Payment Amount</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Payment Date</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-reference">Reference Number (Optional)</Label>
                  <Input
                    id="payment-reference"
                    placeholder="e.g., Transfer ref, cheque number..."
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processSettlement}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Settle Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryCompanySettlement;