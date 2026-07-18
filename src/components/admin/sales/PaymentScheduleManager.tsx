// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, DollarSign, Plus, Check, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PaymentDialog from "./PaymentDialog";

interface PaymentSchedule {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
  notes?: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

interface PaymentScheduleManagerProps {
  saleId: string;
  totalAmount: number;
  isInstallment: boolean;
  onPaymentSuccess?: () => void;
}

const PaymentScheduleManager = ({ saleId, totalAmount, isInstallment, onPaymentSuccess }: PaymentScheduleManagerProps) => {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (saleId) {
      fetchSchedulesAndPayments();
    }
  }, [saleId]);

  const fetchSchedulesAndPayments = async () => {
    try {
      setIsLoading(true);
      
      // Fetch payment schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("payment_schedules")
        .select("*")
        .eq("sale_id", saleId)
        .order("installment_number");

      if (schedulesError) throw schedulesError;

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("sale_id", saleId)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      setSchedules(schedulesData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching schedules and payments:", error);
      toast({
        variant: "destructive",
        title: "Error loading payment data",
        description: "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordPayment = (schedule?: PaymentSchedule) => {
    setSelectedSchedule(schedule || null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSaved = () => {
    fetchSchedulesAndPayments();
    setPaymentDialogOpen(false);
    setSelectedSchedule(null);
    onPaymentSuccess?.(); // Notify parent component to refresh sales data
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <Check className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = totalAmount - totalPaid;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payment information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-blue-800">Total Amount</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
              <div className="text-sm text-green-800">Total Paid</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(remainingBalance)}</div>
              <div className="text-sm text-orange-800">Remaining Balance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Schedules */}
      {isInstallment && schedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      #{schedule.installment_number}
                    </TableCell>
                    <TableCell>
                      {new Date(schedule.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatCurrency(schedule.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(schedule.status)} className="gap-1">
                        {getStatusIcon(schedule.status)}
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {schedule.status !== "paid" && (
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(schedule)}
                        >
                          Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Payment History</CardTitle>
          <Button onClick={() => handleRecordPayment()}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-5">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%]">Date</TableHead>
                  <TableHead className="w-[16%]">Amount</TableHead>
                  <TableHead className="w-[18%]">Method</TableHead>
                  <TableHead className="w-[22%]">Reference</TableHead>
                  <TableHead className="w-[28%]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="break-words">{payment.reference_number || "-"}</TableCell>
                    <TableCell className="break-words">{payment.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onSave={handlePaymentSaved}
        saleId={saleId}
        schedule={selectedSchedule}
        maxAmount={remainingBalance}
      />
    </div>
  );
};

export default PaymentScheduleManager;
