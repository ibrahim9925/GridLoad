// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess?: () => void;
}

export const InternalTransferDialog: React.FC<Props> = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    from_account_id: "",
    to_account_id: "",
    from_amount: "",
    exchange_rate: "",
    reference_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("bank_accounts")
      .select("id, name, bank_name, currency, current_balance")
      .eq("is_active", true)
      .order("bank_name")
      .then(({ data }) => setAccounts(data || []));
  }, [open]);

  const from = accounts.find((a) => a.id === form.from_account_id);
  const to = accounts.find((a) => a.id === form.to_account_id);
  const isFx = from && to && from.currency !== to.currency;
  const fromAmount = parseFloat(form.from_amount) || 0;
  const rate = parseFloat(form.exchange_rate) || 0;
  const toAmount = isFx ? fromAmount * rate : fromAmount;

  const submit = async () => {
    if (!from || !to) {
      toast({ variant: "destructive", title: "Select both accounts" });
      return;
    }
    if (from.id === to.id) {
      toast({ variant: "destructive", title: "Accounts must differ" });
      return;
    }
    if (fromAmount <= 0) {
      toast({ variant: "destructive", title: "Amount must be greater than 0" });
      return;
    }
    if (isFx && rate <= 0) {
      toast({ variant: "destructive", title: "Exchange rate required for FX transfers" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("record_internal_transfer", {
        p_from_account: from.id,
        p_to_account: to.id,
        p_from_amount: fromAmount,
        p_exchange_rate: isFx ? rate : null,
        p_reference: form.reference_number || null,
        p_notes: form.notes || null,
      });
      if (error) throw error;
      toast({ title: "Transfer recorded", description: `${fromAmount.toLocaleString()} ${from.currency} → ${toAmount.toLocaleString()} ${to.currency}` });
      onOpenChange(false);
      setForm({ from_account_id: "", to_account_id: "", from_amount: "", exchange_rate: "", reference_number: "", notes: "" });
      onSuccess?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Transfer failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Internal Transfer
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>From Account</Label>
            <Select value={form.from_account_id} onValueChange={(v) => setForm((p) => ({ ...p, from_account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency}) · {Number(a.current_balance ?? 0).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To Account</Label>
            <Select value={form.to_account_id} onValueChange={(v) => setForm((p) => ({ ...p, to_account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.id !== form.from_account_id).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>From Amount {from ? `(${from.currency})` : ""}</Label>
              <Input type="number" step="0.01" value={form.from_amount}
                onChange={(e) => setForm((p) => ({ ...p, from_amount: e.target.value }))} />
            </div>
            {isFx && (
              <div className="space-y-2">
                <Label>Exchange Rate ({from.currency}→{to.currency})</Label>
                <Input type="number" step="0.0001" value={form.exchange_rate}
                  onChange={(e) => setForm((p) => ({ ...p, exchange_rate: e.target.value }))} />
              </div>
            )}
          </div>

          {isFx && fromAmount > 0 && rate > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              Recipient receives <strong>{toAmount.toLocaleString()} {to.currency}</strong>.
              FX variance will be logged in <code>fx_transfers</code>.
            </div>
          )}

          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={form.reference_number}
              onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? "Recording…" : "Record Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InternalTransferDialog;
