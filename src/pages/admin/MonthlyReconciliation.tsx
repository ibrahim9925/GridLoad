// @ts-nocheck
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNIS } from "@/utils/formatters";
import { AlertTriangle, Banknote, ArrowDown, ArrowUp, FileWarning, Wallet, Coins, Receipt } from "lucide-react";

const toMonthRange = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startISO: start.toISOString(), endISO: end.toISOString(), startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), y, m };
};

const num = (v: any) => Number(v || 0);

const useReconciliation = (ym: string) => {
  return useQuery({
    queryKey: ["monthly-recon", ym],
    queryFn: async () => {
      const { startISO, endISO, startDate, endDate } = toMonthRange(ym);

      const [salesQ, paymentsQ, checksQ, expensesQ, poPayQ, fxQ, ledgerAllQ, accountsQ, bundlesQ, custQ] = await Promise.all([
        supabase.from("sales").select("id,sale_number,invoice_number,sale_date,amount_nis,balance_due,total_amount,currency,customer_id,payment_status,expected_payment_date").gte("sale_date", startISO).lt("sale_date", endISO).neq("status", "cancelled"),
        supabase.from("payments").select("id,sale_id,customer_id,payment_date,payment_method,amount_nis,nis_equivalent,bank_account_id,reference_number,notes,status").gte("payment_date", startISO).lt("payment_date", endISO),
        supabase.from("checks").select("id,check_number,issuing_bank,check_date,due_date,amount,currency,customer_id,sale_id,status,cleared_date,cleared_to_bank_account_id"),
        supabase.from("expenses").select("id,amount,expense_date,description,category").gte("expense_date", startDate).lt("expense_date", endDate),
        supabase.from("po_payments_out").select("id,amount,currency,payment_date,bank_account_id,po_id").gte("payment_date", startDate).lt("payment_date", endDate),
        supabase.from("fx_transfers").select("id,from_account_id,to_account_id,from_amount,to_amount,from_currency,to_currency,transfer_date").gte("transfer_date", startDate).lt("transfer_date", endDate),
        supabase.from("bank_ledger").select("id,bank_account_id,transaction_type,amount,currency,nis_value,date,description,category,reference_type").lt("date", endDate),
        supabase.from("bank_accounts").select("id,account_name,bank_name,currency,current_balance,opening_balance").eq("is_active", true),
        supabase.from("cash_bundles").select("id,reference_number,opened_date,original_amount,currency,status,deposit_batch_id"),
        supabase.from("customers").select("id,contact_person,company_name"),
      ]);

      const err = [salesQ, paymentsQ, checksQ, expensesQ, poPayQ, fxQ, ledgerAllQ, accountsQ, bundlesQ, custQ].find((r) => r.error);
      if (err?.error) throw err.error;

      const sales = salesQ.data || [];
      const payments = paymentsQ.data || [];
      const allChecks = checksQ.data || [];
      const expenses = expensesQ.data || [];
      const poPayments = poPayQ.data || [];
      const fx = fxQ.data || [];
      const ledger = ledgerAllQ.data || [];
      const accounts = accountsQ.data || [];
      const bundles = bundlesQ.data || [];
      const customers = custQ.data || [];
      const custMap = new Map(customers.map((c) => [c.id, c.company_name || c.contact_person || "—"]));

      // SALES RECONCILIATION
      const totalInvoiced = sales.reduce((s, x) => s + num(x.amount_nis || x.total_amount), 0);
      const cashPayments = payments.filter((p) => (p.payment_method || "").toLowerCase() === "cash" && p.status !== "cancelled");
      const checkPayments = payments.filter((p) => (p.payment_method || "").toLowerCase() === "check" && p.status !== "cancelled");
      const transferPayments = payments.filter((p) => {
        const m = (p.payment_method || "").toLowerCase();
        return p.status !== "cancelled" && m !== "cash" && m !== "check";
      });
      const sumNIS = (arr: any[]) => arr.reduce((s, x) => s + num(x.nis_equivalent || x.amount_nis), 0);
      const cashReceived = sumNIS(cashPayments);
      const checksReceived = sumNIS(checkPayments);
      const transfersReceived = sumNIS(transferPayments);
      const outstandingFromMonth = sales.reduce((s, x) => s + num(x.balance_due), 0);

      // BANK RECONCILIATION
      const ledgerInMonth = ledger.filter((l) => l.date >= startDate && l.date < endDate);
      const ledgerBefore = ledger.filter((l) => l.date < startDate);
      const signedAmount = (l: any) => {
        const t = (l.transaction_type || "").toLowerCase();
        const v = num(l.nis_value || l.amount);
        const isOut = t.includes("withdraw") || t.includes("out") || t.includes("debit") || t === "payment" || t === "expense";
        const isIn = t.includes("deposit") || t.includes("in") || t.includes("credit") || t === "receipt";
        if (isOut && !isIn) return -Math.abs(v);
        if (isIn && !isOut) return Math.abs(v);
        // default: positive
        return v;
      };
      const accountRecon = accounts.map((a) => {
        const accBefore = ledgerBefore.filter((l) => l.bank_account_id === a.id);
        const accIn = ledgerInMonth.filter((l) => l.bank_account_id === a.id);
        const opening = num(a.opening_balance) + accBefore.reduce((s, l) => s + signedAmount(l), 0);
        const moneyIn = accIn.filter((l) => signedAmount(l) > 0).reduce((s, l) => s + signedAmount(l), 0);
        const moneyOut = accIn.filter((l) => signedAmount(l) < 0).reduce((s, l) => s + Math.abs(signedAmount(l)), 0);
        const expectedClosing = opening + moneyIn - moneyOut;
        const actualClosing = num(a.current_balance);
        const variance = actualClosing - expectedClosing;
        return { account: a, opening, moneyIn, moneyOut, expectedClosing, actualClosing, variance, entries: accIn };
      });

      // CASH FLOW SUMMARY (all NIS)
      const totalIn = accountRecon.reduce((s, r) => s + r.moneyIn, 0);
      const totalOut = accountRecon.reduce((s, r) => s + r.moneyOut, 0);
      const pendingChecksAll = allChecks.filter((c) => c.status === "pending");
      const pendingChecksTotal = pendingChecksAll.reduce((s, c) => s + num(c.amount), 0);
      const undepositedBundles = bundles.filter((b) => b.status === "open" || b.status === "partially_spent");
      const undepositedCash = undepositedBundles.reduce((s, b) => s + num(b.original_amount), 0);

      // GAPS
      const outstandingInvoices = sales
        .filter((s) => num(s.balance_due) > 0.01)
        .map((s) => {
          const ageDays = Math.floor((Date.now() - new Date(s.sale_date).getTime()) / 86400000);
          return {
            ...s,
            customer_name: custMap.get(s.customer_id) || "—",
            age_days: ageDays,
          };
        })
        .sort((a, b) => b.age_days - a.age_days);

      return {
        sales, payments, allChecks, accountRecon,
        salesRecon: {
          totalInvoiced, cashReceived, checksReceived, transfersReceived,
          outstandingFromMonth,
          cashPayments, checkPayments, transferPayments,
        },
        cashFlow: { totalIn, totalOut, outstanding: outstandingFromMonth, pendingChecksTotal, undepositedCash },
        gaps: { outstandingInvoices, pendingChecks: pendingChecksAll, undepositedBundles },
        custMap,
      };
    },
    staleTime: 30_000,
  });
};

const StatCard = ({ title, value, icon: Icon, tone = "default", onClick, sub }: any) => {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "success" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card className={onClick ? "cursor-pointer hover:bg-accent/40 transition" : ""} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-5 w-5 ${toneCls}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${toneCls}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
};

const MonthlyReconciliation: React.FC = () => {
  const now = new Date();
  const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [ym, setYm] = useState(defaultYM);
  const { data, isLoading, error } = useReconciliation(ym);
  const [drill, setDrill] = useState<null | { title: string; rows: any[]; kind: string }>(null);

  const ageBuckets = useMemo(() => {
    const out = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    (data?.gaps.outstandingInvoices || []).forEach((s) => {
      const a = s.age_days;
      const amt = num(s.balance_due);
      if (a <= 30) out["0-30"] += amt;
      else if (a <= 60) out["31-60"] += amt;
      else if (a <= 90) out["61-90"] += amt;
      else out["90+"] += amt;
    });
    return out;
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Reconciliation</h1>
          <p className="text-muted-foreground text-sm">Sales, bank, cash flow and gaps for the selected month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => setYm(defaultYM)}>Today</Button>
        </div>
      </div>

      {isLoading && <div className="text-muted-foreground">Loading…</div>}
      {error && <div className="text-destructive">Failed to load: {(error as any).message}</div>}

      {data && (
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="bank">Bank</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="gaps">Gaps</TabsTrigger>
          </TabsList>

          {/* SALES */}
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard title="Total Invoiced" value={formatNIS(data.salesRecon.totalInvoiced)} icon={Receipt}
                onClick={() => setDrill({ title: "Invoices this month", kind: "sales", rows: data.sales })} />
              <StatCard title="Cash Received" value={formatNIS(data.salesRecon.cashReceived)} icon={Coins} tone="success"
                onClick={() => setDrill({ title: "Cash payments", kind: "payments", rows: data.salesRecon.cashPayments })} />
              <StatCard title="Checks Received" value={formatNIS(data.salesRecon.checksReceived)} icon={Receipt} tone="success"
                onClick={() => setDrill({ title: "Check payments", kind: "payments", rows: data.salesRecon.checkPayments })} />
              <StatCard title="Bank Transfers" value={formatNIS(data.salesRecon.transfersReceived)} icon={ArrowDown} tone="success"
                onClick={() => setDrill({ title: "Bank transfer payments", kind: "payments", rows: data.salesRecon.transferPayments })} />
              <StatCard title="Still Outstanding" value={formatNIS(data.salesRecon.outstandingFromMonth)} icon={FileWarning} tone="warn"
                onClick={() => setDrill({ title: "Outstanding invoices (from this month)", kind: "sales", rows: data.sales.filter((s: any) => num(s.balance_due) > 0.01) })} />
            </div>
            <Card>
              <CardHeader><CardTitle>Collection breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Collected: {formatNIS(data.salesRecon.cashReceived + data.salesRecon.checksReceived + data.salesRecon.transfersReceived)} •
                  Outstanding (this month's invoices): {formatNIS(data.salesRecon.outstandingFromMonth)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BANK */}
          <TabsContent value="bank" className="space-y-4">
            {data.accountRecon.map((r) => {
              const off = Math.abs(r.variance) > 0.5;
              return (
                <Card key={r.account.id} className={off ? "border-destructive/60" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{r.account.account_name} <span className="text-sm text-muted-foreground font-normal">({r.account.bank_name} · {r.account.currency})</span></span>
                      {off && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Unreconciled</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div><div className="text-muted-foreground">Opening</div><div className="font-semibold">{formatNIS(r.opening)}</div></div>
                      <div><div className="text-muted-foreground">Money In</div><div className="font-semibold text-emerald-600">+{formatNIS(r.moneyIn)}</div></div>
                      <div><div className="text-muted-foreground">Money Out</div><div className="font-semibold text-destructive">-{formatNIS(r.moneyOut)}</div></div>
                      <div><div className="text-muted-foreground">Expected Closing</div><div className="font-semibold">{formatNIS(r.expectedClosing)}</div></div>
                      <div><div className="text-muted-foreground">Actual Closing</div><div className="font-semibold">{formatNIS(r.actualClosing)}</div></div>
                    </div>
                    {off && (
                      <div className="mt-3 text-sm text-destructive">
                        Variance: {formatNIS(r.variance)} — investigate missing/duplicate ledger entries.
                      </div>
                    )}
                    <Button variant="link" className="px-0 mt-2" onClick={() => setDrill({ title: `${r.account.account_name} – ledger entries`, kind: "ledger", rows: r.entries })}>
                      View {r.entries.length} entries
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {data.accountRecon.length === 0 && <div className="text-muted-foreground">No active bank accounts.</div>}
          </TabsContent>

          {/* CASH FLOW */}
          <TabsContent value="cashflow" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard title="Money In" value={formatNIS(data.cashFlow.totalIn)} icon={ArrowDown} tone="success" />
              <StatCard title="Money Out" value={formatNIS(data.cashFlow.totalOut)} icon={ArrowUp} tone="danger" />
              <StatCard title="Net Position" value={formatNIS(data.cashFlow.totalIn - data.cashFlow.totalOut)} icon={Wallet}
                tone={data.cashFlow.totalIn - data.cashFlow.totalOut >= 0 ? "success" : "danger"} />
              <StatCard title="Pending Checks" value={formatNIS(data.cashFlow.pendingChecksTotal)} icon={Receipt} tone="warn"
                sub={`${data.gaps.pendingChecks.length} checks`} />
              <StatCard title="Undeposited Cash" value={formatNIS(data.cashFlow.undepositedCash)} icon={Coins} tone="warn"
                sub={`${data.gaps.undepositedBundles.length} bundles`} />
            </div>
            <Card>
              <CardHeader><CardTitle>Outstanding from this month's invoices</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold text-amber-600">{formatNIS(data.cashFlow.outstanding)}</CardContent>
            </Card>
          </TabsContent>

          {/* GAPS */}
          <TabsContent value="gaps" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Outstanding Invoices by Age</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
                  {Object.entries(ageBuckets).map(([k, v]) => (
                    <div key={k} className="rounded-md border p-3">
                      <div className="text-muted-foreground">{k} days</div>
                      <div className="font-semibold">{formatNIS(v as number)}</div>
                    </div>
                  ))}
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead>
                    <TableHead>Age</TableHead><TableHead className="text-right">Balance Due</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.gaps.outstandingInvoices.slice(0, 50).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.invoice_number || s.sale_number || s.id.slice(0, 8)}</TableCell>
                        <TableCell>{s.customer_name}</TableCell>
                        <TableCell>{new Date(s.sale_date).toLocaleDateString()}</TableCell>
                        <TableCell>{s.age_days}d</TableCell>
                        <TableCell className="text-right font-medium">{formatNIS(s.balance_due)}</TableCell>
                      </TableRow>
                    ))}
                    {data.gaps.outstandingInvoices.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No outstanding invoices.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Pending Checks by Due Date</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Check #</TableHead><TableHead>Bank</TableHead><TableHead>Customer</TableHead>
                    <TableHead>Due</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[...data.gaps.pendingChecks].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.check_number}</TableCell>
                        <TableCell>{c.issuing_bank || "—"}</TableCell>
                        <TableCell>{data.custMap.get(c.customer_id) || "—"}</TableCell>
                        <TableCell>{c.due_date}</TableCell>
                        <TableCell className="text-right font-medium">{formatNIS(c.amount)}</TableCell>
                      </TableRow>
                    ))}
                    {data.gaps.pendingChecks.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No pending checks.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Undeposited Cash Bundles</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Reference</TableHead><TableHead>Opened</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.gaps.undepositedBundles.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.reference_number}</TableCell>
                        <TableCell>{new Date(b.opened_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatNIS(b.original_amount)}</TableCell>
                      </TableRow>
                    ))}
                    {data.gaps.undepositedBundles.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">All cash deposited.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Drill-in dialog */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{drill?.title}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {drill?.kind === "payments" && (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Ref</TableHead>
                  <TableHead>Sale</TableHead><TableHead className="text-right">Amount (NIS)</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {drill.rows.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell>{p.reference_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.sale_id?.slice(0, 8) || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatNIS(p.nis_equivalent || p.amount_nis)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {drill?.kind === "sales" && (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Invoice</TableHead><TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Balance Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {drill.rows.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.invoice_number || s.sale_number || s.id.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(s.sale_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{formatNIS(s.amount_nis || s.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatNIS(s.balance_due)}</TableCell>
                      <TableCell><Badge variant="outline">{s.payment_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {drill?.kind === "ledger" && (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {drill.rows.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.date}</TableCell>
                      <TableCell>{l.transaction_type}</TableCell>
                      <TableCell className="text-xs">{l.description || l.category || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatNIS(l.nis_value || l.amount)} {l.currency && l.currency !== "NIS" && l.currency !== "ILS" ? <span className="text-xs text-muted-foreground">({l.currency} {Number(l.amount).toLocaleString()})</span> : null}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyReconciliation;
