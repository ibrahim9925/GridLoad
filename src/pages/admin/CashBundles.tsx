// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Banknote, ArrowLeft, Plus, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  partially_spent: "secondary",
  deposited: "outline",
  closed: "outline",
};

const CashBundles: React.FC = () => {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ original_amount: "", notes: "" });
  const [detail, setDetail] = useState<any | null>(null);
  const [detailExpenses, setDetailExpenses] = useState<any[]>([]);
  const [detailPo, setDetailPo] = useState<any[]>([]);
  const [detailDeposit, setDetailDeposit] = useState<any | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ bank_account_id: "", amount: "", variance_reason: "", reference: "" });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, a] = await Promise.all([
        supabase.from("cash_bundles").select("*").order("opened_date", { ascending: false }),
        supabase.from("bank_accounts").select("id, name, bank_name, currency").eq("is_active", true).eq("currency", "NIS").order("name"),
      ]);
      if (b.error) throw b.error;
      const list = b.data || [];
      // fetch remaining for each via RPC
      const enriched = await Promise.all(list.map(async (row: any) => {
        const { data } = await supabase.rpc("get_bundle_remaining", { p_bundle_id: row.id });
        return { ...row, remaining: Number(data ?? row.original_amount) };
      }));
      setBundles(enriched);
      setAccounts(a.data || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to load bundles", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const createBundle = async () => {
    const amt = parseFloat(createForm.original_amount);
    if (!(amt > 0)) {
      toast({ variant: "destructive", title: "Enter a positive amount" });
      return;
    }
    try {
      const { error } = await supabase.from("cash_bundles").insert({
        original_amount: amt, currency: "NIS", status: "open",
        source_type: "manual", notes: createForm.notes || null,
      });
      if (error) throw error;
      toast({ title: "Bundle created" });
      setCreateOpen(false);
      setCreateForm({ original_amount: "", notes: "" });
      await fetchAll();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: e.message });
    }
  };

  const openDetail = async (b: any) => {
    setDetail(b);
    const [exps, pops, dep] = await Promise.all([
      supabase.from("expenses").select("id, description, amount, currency, expense_date, vendor, category").eq("cash_bundle_id", b.id).order("expense_date", { ascending: false }),
      supabase.from("po_payments_out").select("id, amount, nis_equivalent, payment_date, payment_method, purchase_order_id").eq("cash_bundle_id", b.id).order("payment_date", { ascending: false }),
      b.deposit_batch_id ? supabase.from("deposit_batches").select("*").eq("id", b.deposit_batch_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setDetailExpenses(exps.data || []);
    setDetailPo(pops.data || []);
    setDetailDeposit(dep?.data || null);
  };

  const closeDetail = () => {
    setDetail(null); setDetailExpenses([]); setDetailPo([]); setDetailDeposit(null);
  };

  const openDeposit = (b: any) => {
    setDepositForm({ bank_account_id: "", amount: String(b.remaining ?? 0), variance_reason: "", reference: "" });
    setDepositOpen(true);
  };

  const submitDeposit = async () => {
    if (!detail) return;
    const amt = parseFloat(depositForm.amount);
    if (!(amt > 0) || !depositForm.bank_account_id) {
      toast({ variant: "destructive", title: "Select account and amount" });
      return;
    }
    if (amt !== detail.remaining && !depositForm.variance_reason.trim()) {
      toast({ variant: "destructive", title: "Variance reason required" });
      return;
    }
    try {
      const { error } = await supabase.rpc("deposit_cash_bundle", {
        p_bundle_id: detail.id,
        p_bank_account_id: depositForm.bank_account_id,
        p_deposited_amount: amt,
        p_variance_reason: depositForm.variance_reason || null,
        p_deposit_reference: depositForm.reference || null,
      });
      if (error) throw error;
      toast({ title: "Bundle deposited", description: `${amt.toLocaleString()} NIS deposited` });
      setDepositOpen(false);
      await fetchAll();
      closeDetail();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deposit failed", description: e.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7" /> Cash Bundles
          </h1>
          <p className="text-muted-foreground">Track large cash inflows from source to deposit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/admin/banking"><ArrowLeft className="h-4 w-4 mr-2" />Back to Banking</a>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Bundle
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" /> All Bundles
            <Badge variant="secondary">{bundles.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundles.map((b) => {
                const spent = Number(b.original_amount) - Number(b.remaining || 0);
                return (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => openDetail(b)}>
                    <TableCell className="font-medium">{b.reference_number}</TableCell>
                    <TableCell>{new Date(b.opened_date).toLocaleDateString()}</TableCell>
                    <TableCell>{b.source_type || "—"}</TableCell>
                    <TableCell className="text-right">₪ {Number(b.original_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-right">₪ {spent.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">₪ {Number(b.remaining || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[b.status] || "default"}>{b.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {b.status !== "closed" && b.status !== "deposited" && (
                        <Button size="sm" onClick={() => { openDetail(b); openDeposit(b); }}>Deposit</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {bundles.length === 0 && !loading && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">No cash bundles yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Cash Bundle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Original Amount (NIS)</Label>
              <Input type="number" step="0.01" value={createForm.original_amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, original_amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={createBundle}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detail?.reference_number} — Lifecycle</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><div className="text-muted-foreground">Status</div><Badge variant={STATUS_VARIANT[detail.status] || "default"}>{detail.status}</Badge></div>
                <div><div className="text-muted-foreground">Original</div><div className="font-semibold">₪ {Number(detail.original_amount).toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Spent</div><div className="font-semibold">₪ {(Number(detail.original_amount) - Number(detail.remaining || 0)).toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Remaining</div><div className="font-semibold">₪ {Number(detail.remaining || 0).toLocaleString()}</div></div>
              </div>

              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Expense spends</CardTitle></CardHeader>
                <CardContent className="py-2">
                  {detailExpenses.length === 0 ? <div className="text-sm text-muted-foreground">None</div> : (
                    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                      <TableBody>{detailExpenses.map((x) => (
                        <TableRow key={x.id}><TableCell>{new Date(x.expense_date).toLocaleDateString()}</TableCell><TableCell>{x.description}</TableCell><TableCell>{x.vendor || "—"}</TableCell><TableCell className="text-right">{Number(x.amount).toLocaleString()} {x.currency}</TableCell></TableRow>
                      ))}</TableBody></Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Supplier payments</CardTitle></CardHeader>
                <CardContent className="py-2">
                  {detailPo.length === 0 ? <div className="text-sm text-muted-foreground">None</div> : (
                    <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount (NIS)</TableHead></TableRow></TableHeader>
                      <TableBody>{detailPo.map((x) => (
                        <TableRow key={x.id}><TableCell>{x.payment_date ? new Date(x.payment_date).toLocaleDateString() : "—"}</TableCell><TableCell>{x.payment_method}</TableCell><TableCell className="text-right">₪ {Number(x.nis_equivalent ?? x.amount).toLocaleString()}</TableCell></TableRow>
                      ))}</TableBody></Table>
                  )}
                </CardContent>
              </Card>

              {detailDeposit && (
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm">Deposit</CardTitle></CardHeader>
                  <CardContent className="py-2 grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-muted-foreground">Batch</div><div>{detailDeposit.batch_number}</div></div>
                    <div><div className="text-muted-foreground">Reference</div><div>{detailDeposit.deposit_reference || "—"}</div></div>
                    <div><div className="text-muted-foreground">Deposited</div><div>₪ {Number(detailDeposit.deposited_amount).toLocaleString()}</div></div>
                    <div><div className="text-muted-foreground">Variance</div><div>₪ {Number(detailDeposit.cash_spent || 0).toLocaleString()}</div></div>
                    <div className="col-span-2"><div className="text-muted-foreground">Notes</div><div>{detailDeposit.notes || "—"}</div></div>
                  </CardContent>
                </Card>
              )}

              {detail.status !== "closed" && detail.status !== "deposited" && (
                <Button onClick={() => openDeposit(detail)} className="w-full">Deposit remaining</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit dialog */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Deposit Bundle {detail?.reference_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Bank Account (NIS)</Label>
              <Select value={depositForm.bank_account_id} onValueChange={(v) => setDepositForm((p) => ({ ...p, bank_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}{a.bank_name ? ` · ${a.bank_name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (NIS) — remaining {detail?.remaining}</Label>
              <Input type="number" step="0.01" value={depositForm.amount}
                onChange={(e) => setDepositForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={depositForm.reference}
                onChange={(e) => setDepositForm((p) => ({ ...p, reference: e.target.value }))} />
            </div>
            {detail && parseFloat(depositForm.amount || "0") !== Number(detail.remaining || 0) && (
              <div className="space-y-2">
                <Label>Variance reason (required)</Label>
                <Textarea rows={2} value={depositForm.variance_reason}
                  onChange={(e) => setDepositForm((p) => ({ ...p, variance_reason: e.target.value }))} />
              </div>
            )}
            <Button className="w-full" onClick={submitDeposit}>Confirm Deposit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashBundles;
