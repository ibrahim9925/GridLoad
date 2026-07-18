// @ts-nocheck
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "lucide-react";
import { formatNIS } from "@/utils/formatters";
import CurrencyAmountInput from "@/components/admin/shared/CurrencyAmountInput";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  saleId: string;
  customerId?: string;
  saleAmount: number;
  balanceDue: number;
  onSuccess?: () => void;
}

const PaymentDialog: React.FC<PaymentDialogProps> = ({
  open, onClose, saleId, customerId, saleAmount, balanceDue, onSuccess,
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    original_currency: "NIS",
    exchange_rate_to_nis: 1,
    nis_equivalent: 0,
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
    method_details: {} as any,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nisAmount = paymentData.original_currency === "NIS" ? paymentData.amount : paymentData.nis_equivalent;

    if (nisAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount" });
      return;
    }
    if (nisAmount > balanceDue + 0.01) {
      toast({ variant: "destructive", title: "Amount exceeds balance", description: `Balance due: ${formatNIS(balanceDue)}` });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: paymentRecord, error: paymentError } = await supabase.from("payments").insert({
        sale_id: saleId,
        customer_id: customerId || null,
        amount: nisAmount,
        original_amount: paymentData.amount,
        original_currency: paymentData.original_currency,
        exchange_rate_to_nis: paymentData.exchange_rate_to_nis,
        nis_equivalent: nisAmount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        notes: paymentData.notes || null,
        method_details: paymentData.method_details,
        status: "completed",
      }).select().single();
      if (paymentError) throw paymentError;

      // Track check separately so it doesn't post to bank ledger until cleared
      if (paymentData.payment_method === "check") {
        const md = paymentData.method_details || {};
        if (!md.check_number) throw new Error("Check number is required");
        if (!md.maturity_date) throw new Error("Due date is required for a check");
        const { error: checkErr } = await supabase.from("checks").insert([{
          check_number: String(md.check_number),
          issuing_bank: md.bank_name || null,
          check_date: md.check_date || null,
          due_date: md.maturity_date,
          amount: paymentData.amount,
          currency: paymentData.original_currency,
          customer_id: customerId || null,
          sale_id: saleId,
          payment_id: (paymentRecord as any).id,
          status: "pending",
          notes: md.account_holder ? `Account holder: ${md.account_holder}` : null,
        }]);
        if (checkErr) throw checkErr;
      }

      // Recalculate sale balance
      const { data: allPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("sale_id", saleId)
        .eq("status", "completed");
      const totalPaid = (allPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
      const newBalance = Math.max(saleAmount - totalPaid, 0);
      const paymentStatus = newBalance <= 0.01 ? "paid" : totalPaid > 0 ? "partial_paid" : "pending";

      await supabase.from("sales").update({
        balance_due: newBalance,
        payment_status: paymentStatus,
      }).eq("id", saleId);

      toast({ title: "Payment recorded", description: `${formatNIS(nisAmount)} — Balance: ${formatNIS(newBalance)}` });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const md = paymentData.method_details;
  const setMD = (key: string, val: string) =>
    setPaymentData({ ...paymentData, method_details: { ...md, [key]: val } });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />Record Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatNIS(saleAmount)}</div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{formatNIS(balanceDue)}</div>
              <div className="text-sm text-muted-foreground">Balance Due</div>
            </div>
          </div>

          {/* Amount + Currency */}
          <CurrencyAmountInput
            amount={paymentData.amount}
            currency={paymentData.original_currency}
            exchangeRate={paymentData.exchange_rate_to_nis}
            nisEquivalent={paymentData.nis_equivalent}
            onAmountChange={(v) => setPaymentData({ ...paymentData, amount: v })}
            onCurrencyChange={(v) => setPaymentData({ ...paymentData, original_currency: v })}
            onExchangeRateChange={(v) => setPaymentData({ ...paymentData, exchange_rate_to_nis: v })}
            onNisEquivalentChange={(v) => setPaymentData({ ...paymentData, nis_equivalent: v })}
            label="Payment Amount"
          />

          {/* Method */}
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v, method_details: {} })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="visa">Visa / Card</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields */}
          {paymentData.payment_method === "bank_transfer" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bank Name</Label><Input value={md.bank_name || ""} onChange={(e) => setMD("bank_name", e.target.value)} /></div>
              <div><Label>Reference #</Label><Input value={md.ref_number || ""} onChange={(e) => setMD("ref_number", e.target.value)} /></div>
              <div className="col-span-2"><Label>Sender Account Name</Label><Input value={md.sender_account || ""} onChange={(e) => setMD("sender_account", e.target.value)} /></div>
            </div>
          )}
          {paymentData.payment_method === "check" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check #</Label><Input value={md.check_number || ""} onChange={(e) => setMD("check_number", e.target.value)} /></div>
              <div><Label>Check Date</Label><Input type="date" value={md.check_date || ""} onChange={(e) => setMD("check_date", e.target.value)} /></div>
              <div><Label>Bank Name</Label><Input value={md.bank_name || ""} onChange={(e) => setMD("bank_name", e.target.value)} /></div>
              <div><Label>Account Holder</Label><Input value={md.account_holder || ""} onChange={(e) => setMD("account_holder", e.target.value)} /></div>
              <div className="col-span-2"><Label>Due Date (when cashable) *</Label><Input type="date" value={md.maturity_date || ""} onChange={(e) => setMD("maturity_date", e.target.value)} /></div>
            </div>
          )}
          {paymentData.payment_method === "visa" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last 4 Digits</Label><Input maxLength={4} value={md.last_4_digits || ""} onChange={(e) => setMD("last_4_digits", e.target.value)} /></div>
              <div><Label>Terminal Ref</Label><Input value={md.terminal_ref || ""} onChange={(e) => setMD("terminal_ref", e.target.value)} /></div>
            </div>
          )}
          {paymentData.payment_method === "deferred" && (
            <div className="grid grid-cols-1 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={md.due_date || ""} onChange={(e) => setMD("due_date", e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={md.deferred_notes || ""} onChange={(e) => setMD("deferred_notes", e.target.value)} rows={2} /></div>
            </div>
          )}

          {/* Date & Notes */}
          <div>
            <Label>Payment Date</Label>
            <Input type="date" value={paymentData.payment_date} onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
