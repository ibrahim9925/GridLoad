// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommissionPayment {
  id: string;
  sales_rep_id: string;
  period_start: string;
  period_end: string;
  base_commission: number;
  bonus_commission: number;
  total_commission: number;
  payment_date: string;
  payment_method: string;
  payment_reference: string;
  status: string;
  notes: string;
  staff?: {
    full_name: string;
  } | null;
}

interface CommissionPaymentTrackerProps {
  onPaymentUpdate?: () => void;
}

const CommissionPaymentTracker = ({ onPaymentUpdate }: CommissionPaymentTrackerProps) => {
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sales_rep_id: "",
    period_start: "",
    period_end: "",
    base_commission: "",
    bonus_commission: "0",
    payment_date: "",
    payment_method: "bank_transfer",
    payment_reference: "",
    status: "pending",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchSalesReps();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_payments")
        .select(`
          *,
          staff!commission_payments_sales_rep_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform data to handle potential null relationships
      const transformedData = (data || []).map(payment => ({
        ...payment,
        staff: payment.staff ? {
          full_name: (payment.staff as any).full_name || "Unknown"
        } : null
      }));
      
      setPayments(transformedData);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Error loading payments",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesReps = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("role", "sales_rep")
        .eq("is_active", true);

      if (error) throw error;
      setSalesReps(data || []);
    } catch (error) {
      console.error("Error fetching sales reps:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const baseCommission = parseFloat(formData.base_commission);
      const bonusCommission = parseFloat(formData.bonus_commission);
      
      const paymentData = {
        sales_rep_id: formData.sales_rep_id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        base_commission: baseCommission,
        bonus_commission: bonusCommission,
        total_commission: baseCommission + bonusCommission,
        payment_date: formData.payment_date || null,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      const { error } = await supabase
        .from("commission_payments")
        .insert(paymentData);

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: "Commission payment has been recorded successfully.",
      });

      setDialogOpen(false);
      resetForm();
      fetchPayments();
      onPaymentUpdate?.();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        variant: "destructive",
        title: "Error saving payment",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sales_rep_id: "",
      period_start: "",
      period_end: "",
      base_commission: "",
      bonus_commission: "0",
      payment_date: "",
      payment_method: "bank_transfer",
      payment_reference: "",
      status: "pending",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("commission_payments")
        .update({ 
          status: newStatus,
          payment_date: newStatus === "paid" ? new Date().toISOString().split('T')[0] : null
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Payment status updated to ${newStatus}.`,
      });

      fetchPayments();
      onPaymentUpdate?.();
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        variant: "destructive",
        title: "Error updating status",
        description: "Please try again later.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission Payments
          </span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Record Commission Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sales_rep_id">Sales Representative</Label>
                  <Select
                    value={formData.sales_rep_id}
                    onValueChange={(value) => setFormData({ ...formData, sales_rep_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesReps.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period_start">Period Start</Label>
                    <Input
                      id="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period_end">Period End</Label>
                    <Input
                      id="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_commission">Base Commission ($)</Label>
                    <Input
                      id="base_commission"
                      type="number"
                      step="0.01"
                      value={formData.base_commission}
                      onChange={(e) => setFormData({ ...formData, base_commission: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonus_commission">Bonus Commission ($)</Label>
                    <Input
                      id="bonus_commission"
                      type="number"
                      step="0.01"
                      value={formData.bonus_commission}
                      onChange={(e) => setFormData({ ...formData, bonus_commission: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Payment Reference</Label>
                  <Input
                    id="payment_reference"
                    value={formData.payment_reference}
                    onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                    placeholder="Transaction ID, Check number, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sales Rep</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Base</TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No commission payments found. Record your first payment to get started.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.staff?.full_name}
                  </TableCell>
                  <TableCell>
                    {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                  </TableCell>
                  <TableCell>${payment.base_commission.toFixed(2)}</TableCell>
                  <TableCell>${(payment.bonus_commission || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${payment.total_commission.toFixed(2)}</TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell>
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "pending" && (
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updatePaymentStatus(payment.id, "paid")}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CommissionPaymentTracker;
