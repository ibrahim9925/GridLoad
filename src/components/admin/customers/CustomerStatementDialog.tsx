// @ts-nocheck
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Copy } from "lucide-react";
import { generateStatementPDF } from "@/utils/bilingualPDF";
import { formatNIS } from "@/utils/formatters";

interface Props {
  open: boolean;
  onClose: () => void;
  customer: any;
  overdueAmount?: number;
  overdueDays?: number;
}

const PRESETS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "3m", label: "Last 3 months", days: 90 },
  { value: "ytd", label: "This year", days: 0 },
  { value: "all", label: "All time", days: -1 },
  { value: "custom", label: "Custom range", days: 0 },
];

const computeRange = (preset: string): { from: string; to: string } => {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  if (preset === "all") return { from: "1970-01-01", to };
  if (preset === "ytd") return { from: `${today.getFullYear()}-01-01`, to };
  const p = PRESETS.find((x) => x.value === preset);
  const days = p?.days ?? 30;
  const from = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
  return { from, to };
};

export default function CustomerStatementDialog({ open, onClose, customer, overdueAmount, overdueDays }: Props) {
  const { toast } = useToast();
  const [preset, setPreset] = useState("30d");
  const initial = computeRange("30d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [generating, setGenerating] = useState(false);

  const onPresetChange = (v: string) => {
    setPreset(v);
    if (v !== "custom") {
      const r = computeRange(v);
      setFrom(r.from); setTo(r.to);
    }
  };

  const fetchAndGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_customer_ledger", { p_customer_id: customer.id });
      if (error) throw error;
      const all = (data || []) as any[];
      const fromD = new Date(from);
      const toD = new Date(to + "T23:59:59");

      // Opening balance = sum of (debit - credit) for entries BEFORE fromD
      let opening = 0;
      const inRange: any[] = [];
      all.forEach((e) => {
        const d = new Date(e.entry_date);
        if (d < fromD) {
          opening += Number(e.debit_nis ?? 0) - Number(e.credit_nis ?? 0);
        } else if (d <= toD) {
          inRange.push(e);
        }
      });

      // Recompute running balance starting from opening
      let bal = opening;
      const entries = inRange.map((e) => {
        bal += Number(e.debit_nis ?? 0) - Number(e.credit_nis ?? 0);
        return {
          date: new Date(e.entry_date).toLocaleDateString(),
          type: e.entry_type === "sale" ? "SALE" : "PAYMENT",
          reference: e.reference || "—",
          originalAmount: e.original_amount,
          originalCurrency: e.original_currency,
          debitNis: Number(e.debit_nis ?? 0),
          creditNis: Number(e.credit_nis ?? 0),
          balanceNis: Math.round(bal * 100) / 100,
        };
      });

      await generateStatementPDF({
        customer: {
          name: customer.contact_person || customer.company_name || "—",
          company: customer.company_name,
          address: customer.address,
          phone: customer.phone,
          email: customer.email,
        },
        periodStart: from,
        periodEnd: to,
        openingBalance: Math.round(opening * 100) / 100,
        entries,
        closingBalance: Math.round(bal * 100) / 100,
        overdueAmount: overdueAmount && overdueAmount > 0 ? overdueAmount : undefined,
        overdueDays,
      });
      toast({ title: "Statement generated", description: `${entries.length} transactions` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err?.message || "Could not generate statement" });
    } finally {
      setGenerating(false);
    }
  };

  const copyWhatsApp = async () => {
    const outstanding = overdueAmount || 0;
    const name = customer.contact_person || customer.company_name || "";
    const msg = `السلام عليكم ${name}، إليكم كشف حسابكم للفترة من ${from} إلى ${to}. الرصيد المستحق: ${Math.round(outstanding)} شيكل. للاستفسار التواصل مع GridLoad.`;
    try {
      await navigator.clipboard.writeText(msg);
      toast({ title: "Copied", description: "WhatsApp message copied" });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Statement — {customer?.contact_person || customer?.company_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Period</Label>
            <Select value={preset} onValueChange={onPresetChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset("custom"); }} />
            </div>
          </div>
          {overdueAmount != null && overdueAmount > 0 && (
            <div className="p-3 border border-destructive bg-destructive/5 rounded text-sm">
              <span className="font-semibold text-destructive">Overdue: {formatNIS(overdueAmount)}</span>
              {overdueDays ? <span className="text-muted-foreground"> · {overdueDays} days</span> : null}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={copyWhatsApp}><Copy className="h-4 w-4 mr-2" />WhatsApp Message</Button>
          <Button onClick={fetchAndGenerate} disabled={generating}>
            <FileDown className="h-4 w-4 mr-2" />{generating ? "Generating…" : "Generate PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
