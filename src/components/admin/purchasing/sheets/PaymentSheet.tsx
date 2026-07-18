// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  shipmentId?: string | null;
  editPayment?: any | null;
  onSaved: () => void;
}

const PAYMENT_TYPES = [
  { value: "deposit", label: "Deposit" },
  { value: "balance", label: "Balance" },
  { value: "freight", label: "Freight" },
  { value: "clearance", label: "Clearance" },
  { value: "other", label: "Other" },
];

const CURRENCIES = ["NIS", "USD", "JOD", "EUR"];

const PaymentSheet: React.FC<Props> = ({ open, onOpenChange, poId, shipmentId = null, editPayment = null, onSaved }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);
  const [poCurrency, setPoCurrency] = useState<string>("USD");
  const [ackMismatch, setAckMismatch] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    currency: "USD",
    exchange_rate: 3.7,
    payment_type: "deposit",
    bank_account_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });

  const isEdit = !!editPayment?.id;

  useEffect(() => {
    if (!open) return;
    setAckMismatch(false);
    supabase
      .from("bank_accounts")
      .select("id, account_name, bank_name, currency")
      .eq("is_active", true)
      .order("account_name")
      .then(({ data }) => setBanks(data || []));
    if (poId) {
      supabase.from("purchase_orders").select("currency").eq("id", poId).single()
        .then(({ data }) => {
          const cur = (data?.currency || "USD").toUpperCase();
          setPoCurrency(cur);
          if (!editPayment) setForm((f) => ({ ...f, currency: cur }));
        });
    }
    if (editPayment) {
      // Parse reference from notes if formatted "Ref: xxx — rest"
      const rawNotes: string = editPayment.notes || "";
      let ref = "";
      let notes = rawNotes;
      const m = rawNotes.match(/^Ref:\s*([^—]+?)(?:\s*—\s*(.*))?$/);
      if (m) { ref = m[1].trim(); notes = (m[2] || "").trim(); }
      setForm({
        amount: Number(editPayment.amount) || 0,
        currency: editPayment.original_currency || "USD",
        exchange_rate: Number(editPayment.exchange_rate_to_nis) || 1,
        payment_type: editPayment.payment_type || "deposit",
        bank_account_id: editPayment.bank_account_id || "",
        payment_date: editPayment.payment_date || new Date().toISOString().split("T")[0],
        reference_number: ref,
        notes,
      });
    } else {
      setForm({
        amount: 0, currency: "USD", exchange_rate: 3.7, payment_type: "deposit",
        bank_account_id: "", payment_date: new Date().toISOString().split("T")[0],
        reference_number: "", notes: "",
      });
    }
  }, [open, poId, editPayment?.id]);

  const nisEquivalent =
    form.currency === "NIS" || form.currency === "ILS"
      ? form.amount
      : Math.round(form.amount * form.exchange_rate * 100) / 100;

  const selectedBank = banks.find((b) => b.id === form.bank_account_id);
  const bankCurrency = (selectedBank?.currency || "").toUpperCase();
  const normalizedPO = poCurrency === "ILS" ? "NIS" : poCurrency;
  const normalizedBank = bankCurrency === "ILS" ? "NIS" : bankCurrency;
  const currencyMismatch = !!selectedBank && normalizedBank !== normalizedPO;

  const canSubmit =
    form.amount > 0 &&
    !!form.bank_account_id &&
    !saving &&
    (!currencyMismatch || ackMismatch);

  const submit = async () => {
    if (!form.bank_account_id) {
      toast({ variant: "destructive", title: "Bank account required" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        purchase_order_id: poId,
        shipment_id: shipmentId || editPayment?.shipment_id || null,
        amount: form.amount,
        original_currency: form.currency,
        exchange_rate_to_nis: form.currency === "NIS" ? 1 : form.exchange_rate,
        nis_equivalent: nisEquivalent,
        payment_date: form.payment_date,
        payment_method: "bank_transfer",
        payment_type: form.payment_type,
        cost_category:
          form.payment_type === "freight" ? "freight" :
          form.payment_type === "clearance" ? "customs" :
          "supplier_payment",
        notes: [form.reference_number && `Ref: ${form.reference_number}`, form.notes].filter(Boolean).join(" — "),
        bank_account_id: form.bank_account_id,
      };
      const { error } = isEdit
        ? await supabase.from("po_payments_out").update(payload).eq("id", editPayment.id)
        : await supabase.from("po_payments_out").insert(payload);
      if (error) throw error;
      toast({ title: isEdit ? "Payment updated" : "Payment recorded" });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto rounded-t-2xl p-0">
        <div className="sticky top-0 bg-background z-10 px-5 pt-5 pb-3 border-b">
          <SheetHeader><SheetTitle>{isEdit ? "Edit Payment" : "Record Payment"}</SheetTitle></SheetHeader>
        </div>
        <div className="px-5 py-4 space-y-4 pb-32">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number" inputMode="decimal" step="0.01" min={0}
                className="text-base h-12"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.currency !== "NIS" && (
            <div>
              <Label>FX Rate to NIS</Label>
              <Input
                type="number" inputMode="decimal" step="0.0001"
                className="text-base h-12"
                value={form.exchange_rate || ""}
                onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">≈ ₪{nisEquivalent.toLocaleString()}</p>
            </div>
          )}

          <div>
            <Label>Payment Type</Label>
            <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Bank Account *</Label>
            <Select value={form.bank_account_id} onValueChange={(v) => setForm({ ...form, bank_account_id: v })}>
              <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select bank account" /></SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.bank_name} — {b.account_name} ({b.currency})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.bank_account_id && <p className="text-xs text-destructive mt-1">Required — payment cannot be recorded without a bank account</p>}
          </div>

          {currencyMismatch && (
            <div className="rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Currency mismatch</p>
                  <p className="text-amber-800 dark:text-amber-300 text-xs mt-1">
                    This PO is in <strong>{normalizedPO}</strong> but you selected a <strong>{normalizedBank}</strong> account.
                    Did you mean to record an FX transfer first? Or are you recording in {normalizedBank}?
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-200">
                    <p><strong>Option A:</strong> Pick a {normalizedPO} bank account and enter the amount in {normalizedPO}.</p>
                    <p><strong>Option B:</strong> Confirm below that you are recording the {normalizedBank} equivalent of this {normalizedPO} payment.</p>
                  </div>
                </div>
              </div>
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <Checkbox checked={ackMismatch} onCheckedChange={(v) => setAckMismatch(!!v)} className="mt-0.5" />
                <span className="text-xs text-amber-900 dark:text-amber-200">
                  I confirm I am recording the {normalizedBank} equivalent of this {normalizedPO} payment.
                </span>
              </label>
            </div>
          )}

          <div>
            <Label>Date</Label>
            <Input type="date" className="text-base h-12" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
          </div>

          <div>
            <Label>Reference Number</Label>
            <Input className="text-base h-12" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="SWIFT / Wire ref" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="text-base" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEdit ? "Save Changes" : "Record Payment")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PaymentSheet;
