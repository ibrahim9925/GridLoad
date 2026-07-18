// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNIS } from "@/utils/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
  onDone?: () => void;
}

const BulkPaymentDialog: React.FC<Props> = ({ open, onClose, customerId, customerName, onDone }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "confirm">("input");

  useEffect(() => {
    if (!open) return;
    setAmount(""); setReference(""); setNotes(""); setPreview(null); setStep("input");
    supabase.from("bank_accounts").select("id, name, bank_name, currency").eq("is_active", true)
      .then(({ data }) => setBankAccounts(data || []));
  }, [open]);

  const runPreview = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("preview_bulk_allocation", {
        p_customer_id: customerId, p_amount_nis: amt,
      });
      if (error) throw error;
      setPreview(data);
      setStep("confirm");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  const confirm = async () => {
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc("record_bulk_customer_payment", {
        p_customer_id: customerId,
        p_amount_nis: Number(amount),
        p_payment_method: method,
        p_payment_date: date,
        p_bank_account_id: bankAccountId || null,
        p_reference: reference || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      toast({ title: "Payment recorded", description: `${formatNIS(Number(amount))} allocated across invoices.` });
      onDone?.();
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Bulk Payment — {customerName || "Customer"}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount (NIS)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bank Account (optional)</label>
              <Select value={bankAccountId || "none"} onValueChange={(v) => setBankAccountId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.bank_name} — {a.name} ({a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reference</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-3">
            <div className="bg-muted rounded p-3 text-sm">
              <div className="flex justify-between"><span>Total payment</span><b>{formatNIS(preview.total_amount_nis)}</b></div>
              <div className="flex justify-between mt-1"><span>Unallocated credit</span>
                <b className={preview.unallocated_credit_nis > 0 ? "text-amber-600" : ""}>
                  {formatNIS(preview.unallocated_credit_nis)}
                </b>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-semibold text-muted-foreground">FIFO Allocation Breakdown</div>
              {preview.allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">No outstanding invoices — full amount will be stored as credit.</p>
              ) : preview.allocations.map((a: any, i: number) => (
                <div key={i} className="flex justify-between items-center border rounded p-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.sale_ref}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.sale_date).toLocaleDateString()} · outstanding {formatNIS(a.outstanding_nis)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge>{formatNIS(a.allocated_nis)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={runPreview} disabled={loading || !Number(amount)}>Preview Allocation</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")} disabled={loading}>Back</Button>
              <Button onClick={confirm} disabled={loading}>{loading ? "Recording…" : "Confirm & Record"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPaymentDialog;
