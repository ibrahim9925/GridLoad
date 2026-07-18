// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatNIS } from "@/utils/formatters";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

interface PendingCheck {
  id: string;
  check_number: string;
  issuing_bank: string | null;
  check_date: string | null;
  due_date: string;
  amount: number;
  currency: string;
  customer_id: string | null;
  customer_name: string;
  sale_id: string | null;
  sale_number: string | null;
  days_until_due: number;
}

const ChecksPanel: React.FC = () => {
  const [checks, setChecks] = useState<PendingCheck[]>([]);
  const [summary, setSummary] = useState<any>({ count: 0, total_amount_nis: 0, next_due_date: null });
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const [clearDialog, setClearDialog] = useState<{ open: boolean; check?: PendingCheck }>({ open: false });
  const [bounceDialog, setBounceDialog] = useState<{ open: boolean; check?: PendingCheck }>({ open: false });
  const [clearAccount, setClearAccount] = useState("");
  const [clearDate, setClearDate] = useState(new Date().toISOString().split("T")[0]);
  const [bounceReason, setBounceReason] = useState("");
  const [working, setWorking] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [c, s, b] = await Promise.all([
      supabase.rpc("get_pending_checks"),
      supabase.rpc("get_pending_checks_summary"),
      supabase.from("bank_accounts").select("id, name, bank_name, currency, current_balance").eq("is_active", true).order("name"),
    ]);
    if (c.error) toast.error(`Failed to load checks: ${c.error.message}`);
    else setChecks((c.data as any) || []);
    if (s.data) setSummary(s.data);
    if (b.data) setBankAccounts(b.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colorFor = (days: number) => {
    if (days <= 3) return "destructive";
    if (days <= 7) return "secondary";
    return "outline";
  };
  const rowTint = (days: number) =>
    days <= 3 ? "border-l-4 border-destructive bg-destructive/5" :
    days <= 7 ? "border-l-4 border-warning bg-warning/5" : "";

  const handleClear = async () => {
    if (!clearDialog.check || !clearAccount) return;
    setWorking(true);
    const { error } = await supabase.rpc("clear_check", {
      p_check_id: clearDialog.check.id,
      p_bank_account_id: clearAccount,
      p_cleared_date: clearDate,
    });
    setWorking(false);
    if (error) { toast.error(`Clear failed: ${error.message}`); return; }
    toast.success("Check marked cleared — bank balance updated");
    setClearDialog({ open: false });
    setClearAccount(""); setClearDate(new Date().toISOString().split("T")[0]);
    fetchData();
  };

  const handleBounce = async () => {
    if (!bounceDialog.check || !bounceReason.trim()) return;
    setWorking(true);
    const { error } = await supabase.rpc("bounce_check", {
      p_check_id: bounceDialog.check.id,
      p_reason: bounceReason.trim(),
    });
    setWorking(false);
    if (error) { toast.error(`Bounce failed: ${error.message}`); return; }
    toast.success("Check marked bounced — sale balance restored");
    setBounceDialog({ open: false });
    setBounceReason("");
    fetchData();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Pending Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Total Pending</div>
            <div className="text-xl font-bold">{formatNIS(summary.total_amount_nis || 0)}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Count</div>
            <div className="text-xl font-bold">{summary.count || 0}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-xs text-muted-foreground">Next Due</div>
            <div className="text-sm font-semibold">
              {summary.next_due_date ? new Date(summary.next_due_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
        ) : checks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No pending checks</div>
        ) : (
          <div className="space-y-2">
            {checks.map((c) => (
              <div key={c.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3 ${rowTint(c.days_until_due)}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{c.customer_name}</span>
                    <Badge variant={colorFor(c.days_until_due)}>
                      {c.days_until_due <= 0 ? "Due today" : `${c.days_until_due}d`}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Check #{c.check_number} · {c.issuing_bank || "—"} · Due {new Date(c.due_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-semibold mt-1">
                    {c.currency === "NIS" ? formatNIS(c.amount) : `${c.amount.toFixed(2)} ${c.currency}`}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="default" onClick={() => setClearDialog({ open: true, check: c })}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Cleared
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBounceDialog({ open: true, check: c })}>
                    <XCircle className="h-4 w-4 mr-1" /> Bounced
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Clear dialog */}
      <Dialog open={clearDialog.open} onOpenChange={(o) => !o && setClearDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Check Cleared</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Check #{clearDialog.check?.check_number} · {clearDialog.check?.customer_name}
            </div>
            <div>
              <Label>Deposited To Bank Account *</Label>
              <Select value={clearAccount} onValueChange={setClearAccount}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.bank_name ? `(${a.bank_name})` : ""} — {a.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cleared Date</Label>
              <Input type="date" value={clearDate} onChange={(e) => setClearDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialog({ open: false })}>Cancel</Button>
            <Button onClick={handleClear} disabled={working || !clearAccount}>
              {working ? "Working…" : "Confirm Clear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bounce dialog */}
      <Dialog open={bounceDialog.open} onOpenChange={(o) => !o && setBounceDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Check Bounced</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Check #{bounceDialog.check?.check_number} · {bounceDialog.check?.customer_name}
            </div>
            <div>
              <Label>Bounce Reason *</Label>
              <Textarea
                value={bounceReason}
                onChange={(e) => setBounceReason(e.target.value)}
                placeholder="Insufficient funds, stop payment, etc."
                rows={3}
              />
            </div>
            <div className="text-xs text-warning">
              A reversal payment will be created and the sale balance will return to outstanding.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBounceDialog({ open: false })}>Cancel</Button>
            <Button variant="destructive" onClick={handleBounce} disabled={working || !bounceReason.trim()}>
              {working ? "Working…" : "Confirm Bounce"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ChecksPanel;
