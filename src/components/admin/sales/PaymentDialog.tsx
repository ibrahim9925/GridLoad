// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSchedule?: any;
  onSuccess?: () => void;
  onPaymentCreated?: () => void;
  onSave?: () => void;
  saleId?: string;
  schedule?: any;
  maxAmount?: number;
}

const PaymentDialog = ({
  open,
  onClose,
  selectedSchedule,
  onSuccess,
  onPaymentCreated,
  onSave,
  saleId,
  schedule,
  maxAmount,
}: PaymentDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section 1 — Link to transaction
  const [transactionType, setTransactionType] = useState<string>(saleId ? "sale" : "sale");
  const [linkedSaleId, setLinkedSaleId] = useState(saleId || selectedSchedule?.sale_id || schedule?.sale_id || "");
  const [linkedPoId, setLinkedPoId] = useState("");
  const [sales, setSales] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  // Section 2 — Amount & Currency
  const [amount, setAmount] = useState(selectedSchedule?.amount?.toString() || schedule?.amount?.toString() || maxAmount?.toString() || "");
  const [currency, setCurrency] = useState("NIS");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [nisEquivalent, setNisEquivalent] = useState("0");

  // Section 3 — Payment Method
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankName, setBankName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState(
    `PAY-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  );
  const [senderAccount, setSenderAccount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState<Date | undefined>();
  const [accountHolder, setAccountHolder] = useState("");
  const [maturityDate, setMaturityDate] = useState<Date | undefined>();
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [terminalRef, setTerminalRef] = useState("");
  const [deferredDueDate, setDeferredDueDate] = useState<Date | undefined>();
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Section 4 — Date & Notes
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  // Fetch sales and POs for dropdowns
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [salesRes, poRes] = await Promise.all([
        supabase.from("sales").select("id, sale_number, customer_id, total_amount, balance_due, customers(contact_person)").order("created_at", { ascending: false }).limit(50),
        supabase.from("purchase_orders").select("id, order_number, supplier_id, total_amount, suppliers(name)").order("created_at", { ascending: false }).limit(50),
      ]);
      setSales(salesRes.data || []);
      setPurchaseOrders(poRes.data || []);
    };
    fetchData();
  }, [open]);

  // Auto-fetch exchange rate when currency changes
  useEffect(() => {
    if (currency === "NIS") {
      setExchangeRate("1");
      return;
    }
    const fetchRate = async () => {
      const { data } = await supabase.rpc("get_exchange_rate", {
        p_from_currency: currency,
        p_to_currency: "NIS",
        p_date: new Date().toISOString().split("T")[0],
      });
      if (data) setExchangeRate(data.toString());
    };
    fetchRate();
  }, [currency]);

  // Auto-calculate NIS equivalent
  useEffect(() => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(exchangeRate) || 1;
    setNisEquivalent((amt * rate).toFixed(2));
  }, [amount, exchangeRate]);

  const handleDocumentUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const ext = file.name.split(".").pop();
      const fileName = `payments/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
      setDocumentUrl(urlData.publicUrl);
      toast({ title: "Document uploaded", description: file.name });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const paymentAmount = parseFloat(amount);
      if (!amount || paymentAmount <= 0) throw new Error("Amount must be greater than zero");
      if (maxAmount && paymentAmount > maxAmount) throw new Error(`Amount cannot exceed ₪${maxAmount.toFixed(2)}`);

      // Build method_details based on payment method
      const methodDetails: any = {};
      if (paymentMethod === "bank_transfer") {
        methodDetails.bank_name = bankName;
        methodDetails.reference_number = referenceNumber;
        methodDetails.sender_account = senderAccount;
      } else if (paymentMethod === "check") {
        methodDetails.check_number = checkNumber;
        methodDetails.check_date = checkDate?.toISOString().split("T")[0];
        methodDetails.bank_name = bankName;
        methodDetails.account_holder = accountHolder;
        methodDetails.maturity_date = maturityDate?.toISOString().split("T")[0];
      } else if (paymentMethod === "credit_card") {
        methodDetails.last_four_digits = lastFourDigits;
        methodDetails.terminal_ref = terminalRef;
      } else if (paymentMethod === "deferred") {
        methodDetails.due_date = deferredDueDate?.toISOString().split("T")[0];
      }

      const targetSaleId = transactionType === "sale" ? linkedSaleId : null;
      const targetPoId = transactionType === "po" ? linkedPoId : null;

      if (transactionType === "sale" && !targetSaleId) throw new Error("Please select a sale");
      if (transactionType === "po" && !targetPoId) throw new Error("Please select a purchase order");

      const nisAmt = parseFloat(nisEquivalent);
      const rate = parseFloat(exchangeRate);

      // 1. Insert into payments table
      const paymentData: any = {
        amount: nisAmt,
        original_amount: paymentAmount,
        original_currency: currency,
        exchange_rate_to_nis: rate,
        nis_equivalent: nisAmt,
        payment_method: paymentMethod,
        payment_date: paymentDate.toISOString().split("T")[0],
        reference_number: referenceNumber || null,
        method_details: methodDetails,
        notes: notes || null,
        document_url: documentUrl || null,
        sale_id: targetSaleId || null,
      };

      const { data: paymentRecord, error: paymentError } = await supabase
        .from("payments")
        .insert([paymentData])
        .select()
        .single();

      if (paymentError) {
        console.error("❌ Payment error:", paymentError);
        throw paymentError;
      }

      console.log("✅ Payment recorded:", paymentRecord);

      // If method is CHECK — also create a pending check row (no bank ledger impact yet)
      if (paymentMethod === "check") {
        if (!checkNumber.trim()) throw new Error("Check number is required");
        if (!maturityDate) throw new Error("Due date is required for a check");
        const { error: checkErr } = await supabase.from("checks").insert([{
          check_number: checkNumber.trim(),
          issuing_bank: bankName || null,
          check_date: checkDate ? checkDate.toISOString().split("T")[0] : null,
          due_date: maturityDate.toISOString().split("T")[0],
          amount: paymentAmount,
          currency,
          customer_id: targetSaleId
            ? (sales.find((s) => s.id === targetSaleId)?.customer_id || null)
            : null,
          sale_id: targetSaleId || null,
          payment_id: (paymentRecord as any).id,
          status: "pending",
          notes: accountHolder ? `Account holder: ${accountHolder}` : null,
        }]);
        if (checkErr) {
          console.error("❌ Check insert error:", checkErr);
          throw checkErr;
        }
      }

      // 2. If linked to Sale — recalculate balance
      if (targetSaleId) {
        const { data: salePayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("sale_id", targetSaleId);

        const totalPaid = (salePayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        const { data: sale } = await supabase
          .from("sales")
          .select("total_amount")
          .eq("id", targetSaleId)
          .single();

        if (sale) {
          const newBalance = Math.max(0, (sale.total_amount || 0) - totalPaid);
          const newStatus = newBalance <= 0 ? "paid" : "partial";
          await supabase
            .from("sales")
            .update({ balance_due: newBalance, payment_status: newStatus })
            .eq("id", targetSaleId);
        }
      }

      // 3. If linked to PO — insert into po_payments_out
      if (targetPoId) {
        await supabase.from("po_payments_out").insert([{
          purchase_order_id: targetPoId,
          amount: paymentAmount,
          original_currency: currency,
          exchange_rate_to_nis: rate,
          nis_equivalent: nisAmt,
          payment_method: paymentMethod,
          payment_date: paymentDate.toISOString().split("T")[0],
          method_details: methodDetails,
          notes: notes || null,
          document_url: documentUrl || null,
          cost_category: "supplier_payment",
        }]);

        // Auto-create expense for PO payment
        await supabase.from("expenses").insert([{
          category: "parts",
          amount: nisAmt,
          expense_date: paymentDate.toISOString().split("T")[0],
          description: `PO Payment - ${purchaseOrders.find((p) => p.id === targetPoId)?.order_number || targetPoId}`,
          source_type: "po_payment",
          source_id: targetPoId,
          purchase_order_id: targetPoId,
        }]);
      }

      // Bank ledger entries are now created automatically by DB triggers
      // (tr_payments_to_bank_ledger / tr_po_payments_out_to_bank_ledger)
      // whenever a payment row has a bank_account_id. Bank account balance
      // is recomputed by tr_bank_ledger_sync_balance.

      toast({
        title: "Payment recorded",
        description: `Payment of ₪${nisAmt.toFixed(2)} has been successfully recorded.`,
      });

      onSuccess?.();
      onPaymentCreated?.();
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error("❌ Payment error:", error);
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: error.message || "An error occurred while recording the payment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 — Link to Transaction */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-sm font-semibold">Link to Transaction</Label>
            <RadioGroup value={transactionType} onValueChange={setTransactionType} className="flex gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sale" id="type-sale" />
                <Label htmlFor="type-sale" className="cursor-pointer">Customer Sale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="po" id="type-po" />
                <Label htmlFor="type-po" className="cursor-pointer">Supplier PO</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="type-expense" />
                <Label htmlFor="type-expense" className="cursor-pointer">Operating Expense</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="type-other" />
                <Label htmlFor="type-other" className="cursor-pointer">Other</Label>
              </div>
            </RadioGroup>

            {transactionType === "sale" && (
              <Select value={linkedSaleId} onValueChange={setLinkedSaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sale..." />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sale_number || s.id.slice(0, 8)} — {s.customers?.contact_person || "Unknown"} — Balance: ₪{s.balance_due?.toFixed(2) || "0.00"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {transactionType === "po" && (
              <Select value={linkedPoId} onValueChange={setLinkedPoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase order..." />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.order_number || po.id.slice(0, 8)} — {po.suppliers?.name || "Unknown"} — ₪{po.total_amount?.toFixed(2) || "0.00"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Section 2 — Amount & Currency */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-sm font-semibold">Amount & Currency</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIS">₪ NIS</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="JOD">JOD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Exchange Rate to NIS</Label>
                <Input type="number" step="0.0001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>NIS Equivalent</Label>
                <Input value={`₪ ${nisEquivalent}`} readOnly className="bg-muted" />
              </div>
            </div>
          </div>

          {/* Section 3 — Payment Method */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-sm font-semibold">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Visa / Card</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>

            {paymentMethod === "bank_transfer" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Quds Bank" />
                </div>
                <div className="space-y-1">
                  <Label>Reference / Transaction #</Label>
                  <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Sender Account Name</Label>
                  <Input value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)} />
                </div>
              </div>
            )}

            {paymentMethod === "check" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Check Number</Label>
                  <Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Check Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !checkDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkDate ? format(checkDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={checkDate} onSelect={setCheckDate} /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Account Holder</Label>
                  <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Due Date (when cashable) *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left", !maturityDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {maturityDate ? format(maturityDate, "PPP") : "Pick due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={maturityDate} onSelect={setMaturityDate} /></PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {paymentMethod === "credit_card" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Last 4 Digits</Label>
                  <Input value={lastFourDigits} onChange={(e) => setLastFourDigits(e.target.value)} maxLength={4} placeholder="1234" />
                </div>
                <div className="space-y-1">
                  <Label>Terminal Reference</Label>
                  <Input value={terminalRef} onChange={(e) => setTerminalRef(e.target.value)} />
                </div>
              </div>
            )}

            {paymentMethod === "deferred" && (
              <div className="space-y-1">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left", !deferredDueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deferredDueDate ? format(deferredDueDate, "PPP") : "Select due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deferredDueDate} onSelect={setDeferredDueDate} /></PopoverContent>
                </Popover>
              </div>
            )}

            {/* Document Upload */}
            <div className="space-y-1">
              <Label>Attach Document (Swift / Receipt / Slip)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ variant: "destructive", title: "File too large", description: "Max 10MB" });
                        return;
                      }
                      setDocumentFile(file);
                      handleDocumentUpload(file);
                    }
                  }}
                  className="flex-1"
                />
                {isUploading && <span className="text-sm text-muted-foreground animate-pulse">Uploading...</span>}
                {documentUrl && <span className="text-sm text-primary">✓ Uploaded</span>}
              </div>
            </div>
          </div>

          {/* Section 4 — Date & Notes */}
          <div className="space-y-3 p-4 border rounded-lg">
            <Label className="text-sm font-semibold">Date & Notes</Label>
            <div className="space-y-1">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !paymentDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentDate} onSelect={(d) => d && setPaymentDate(d)} /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
