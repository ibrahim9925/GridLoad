// @ts-nocheck

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentSchedule {
  id: string;
  sale_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: string;
  customer_name: string;
  invoice_number: string;
}

interface BulkPaymentProcessorProps {
  schedules: PaymentSchedule[];
  onRefresh: () => void;
}

const BulkPaymentProcessor = ({ schedules, onRefresh }: BulkPaymentProcessorProps) => {
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState("bank_transfer");
  const [bulkReference, setBulkReference] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchedules(schedules.filter(s => s.status !== "paid").map(s => s.id));
    } else {
      setSelectedSchedules([]);
    }
  };

  const handleSelectSchedule = (scheduleId: string, checked: boolean) => {
    if (checked) {
      setSelectedSchedules(prev => [...prev, scheduleId]);
    } else {
      setSelectedSchedules(prev => prev.filter(id => id !== scheduleId));
    }
  };

  const handleBulkPayment = async () => {
    if (selectedSchedules.length === 0) {
      toast({
        variant: "destructive",
        title: "No payments selected",
        description: "Please select at least one payment to process.",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const selectedScheduleDetails = schedules.filter(s => selectedSchedules.includes(s.id));
      
      // Create bulk payment records
      const paymentRecords = selectedScheduleDetails.map(schedule => ({
        sale_id: schedule.sale_id,
        payment_schedule_id: schedule.id,
        amount: schedule.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: bulkPaymentMethod,
        reference_number: bulkReference || `BULK-${Date.now()}`,
        notes: `Bulk payment processing - ${selectedScheduleDetails.length} payments`,
      }));

      const { error: paymentError } = await supabase
        .from("payments")
        .insert(paymentRecords);

      if (paymentError) throw paymentError;

      // Update payment schedules to paid status
      const { error: scheduleError } = await supabase
        .from("payment_schedules")
        .update({ status: "paid" })
        .in("id", selectedSchedules);

      if (scheduleError) throw scheduleError;

      toast({
        title: "Bulk Payment Processed",
        description: `Successfully processed ${selectedSchedules.length} payments.`,
      });

      setSelectedSchedules([]);
      setBulkReference("");
      onRefresh();
    } catch (error) {
      console.error("Error processing bulk payment:", error);
      toast({
        variant: "destructive",
        title: "Error processing payments",
        description: "Please try again later.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportSelectedPayments = () => {
    const selectedData = schedules.filter(s => selectedSchedules.includes(s.id));
    const csvContent = [
      ["Customer", "Invoice", "Installment", "Due Date", "Amount", "Status"],
      ...selectedData.map(s => [
        s.customer_name,
        s.invoice_number,
        s.installment_number.toString(),
        s.due_date,
        s.amount.toString(),
        s.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingSchedules = schedules.filter(s => s.status !== "paid");
  const selectedAmount = schedules
    .filter(s => selectedSchedules.includes(s.id))
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Bulk Payment Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Actions Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={bulkPaymentMethod} onValueChange={setBulkPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bulk Reference</Label>
            <Input
              value={bulkReference}
              onChange={(e) => setBulkReference(e.target.value)}
              placeholder="Batch reference number"
            />
          </div>
          <div className="space-y-2">
            <Label>Selected Amount</Label>
            <div className="text-2xl font-bold text-green-600">
              ${selectedAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleBulkPayment}
            disabled={selectedSchedules.length === 0 || isProcessing}
            className="flex-1"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process {selectedSchedules.length} Payment{selectedSchedules.length !== 1 ? 's' : ''}
          </Button>
          <Button
            variant="outline"
            onClick={exportSelectedPayments}
            disabled={selectedSchedules.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Payment Schedules Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSchedules.length === pendingSchedules.length && pendingSchedules.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Installment</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id} className={schedule.status === "paid" ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSchedules.includes(schedule.id)}
                      onCheckedChange={(checked) => handleSelectSchedule(schedule.id, !!checked)}
                      disabled={schedule.status === "paid"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{schedule.customer_name}</TableCell>
                  <TableCell>{schedule.invoice_number}</TableCell>
                  <TableCell>#{schedule.installment_number}</TableCell>
                  <TableCell>{new Date(schedule.due_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">${schedule.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={schedule.status === "paid" ? "default" : schedule.status === "overdue" ? "destructive" : "secondary"}>
                      {schedule.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkPaymentProcessor;
