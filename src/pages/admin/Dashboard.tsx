// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Wallet, AlertTriangle, Banknote, TrendingUp, ArrowRight, Package, Coins,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import { formatNIS } from "@/utils/formatters";
import { useOverdueInvoices, useOverdueSummary } from "@/hooks/useOverdueData";

type Summary = {
  total_receivables_nis: number;
  total_overdue_nis: number;
  overdue_count: number;
  cash_position_nis: number;
  sales_this_month_nis: number;
};

const severityClass = (days: number) => {
  if (days >= 30) return "bg-red-900 text-white hover:bg-red-900";
  if (days >= 15) return "bg-red-600 text-white hover:bg-red-700";
  return "bg-orange-500 text-white hover:bg-orange-600";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentLedger, setRecentLedger] = useState<any[]>([]);
  const [openBundles, setOpenBundles] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const { data: overdueRows = [] } = useOverdueInvoices();
  const { data: overdueSummary } = useOverdueSummary();

  useEffect(() => {
    (async () => {
      const [s, ledger, bundles, cs, stock] = await Promise.all([
        (supabase as any).rpc("get_dashboard_summary"),
        supabase
          .from("bank_ledger")
          .select("id, date, description, amount, transaction_type, bank_account_id, bank_accounts(name)")
          .order("date", { ascending: false })
          .limit(10),
        (supabase as any).rpc("get_open_cash_bundles"),
        (supabase as any).rpc("get_cash_summary"),
        supabase
          .from("products")
          .select("id, name, current_stock, min_stock_level, product_suppliers(suppliers(name))")
          .eq("is_active", true)
          .order("current_stock", { ascending: true })
          .limit(8),
      ]);
      setSummary(s.data as Summary);
      setRecentLedger(ledger.data || []);
      setOpenBundles(bundles.data || []);
      setCashSummary(cs.data);
      // filter low stock client-side: current_stock <= min_stock_level
      const lowStockRows = (stock.data || []).filter(
        (p: any) => Number(p.current_stock || 0) <= Number(p.min_stock_level || 0),
      );
      setLowStock(lowStockRows);
    })();
  }, []);

  const topOverdue = overdueRows.slice(0, 8);

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">GridLoad Dashboard</h1>
          <p className="text-muted-foreground">Live business overview</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Total Receivables</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold break-words leading-tight">{summary ? formatNIS(summary.total_receivables_nis) : "—"}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Outstanding customer balance</p>
            </CardContent>
          </Card>

          <Card className={summary && summary.total_overdue_nis > 0 ? "border-red-600 border-2" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Overdue Right Now</CardTitle>
              <AlertTriangle className={`h-4 w-4 shrink-0 ${summary && summary.total_overdue_nis > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold break-words leading-tight ${summary && summary.total_overdue_nis > 0 ? "text-red-600" : ""}`}>
                {summary ? formatNIS(summary.total_overdue_nis) : "—"}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {summary ? `${summary.overdue_count} customer${summary.overdue_count === 1 ? "" : "s"}` : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Cash Position</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold break-words leading-tight">{summary ? formatNIS(summary.cash_position_nis) : "—"}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">All banks + cash drawer (NIS eq.)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">Sales This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600 break-words leading-tight">{summary ? formatNIS(summary.sales_this_month_nis) : "—"}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Calendar month-to-date</p>
            </CardContent>
          </Card>
        </div>

        {/* Cash bundles + Low stock side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {openBundles && openBundles.length > 0 && (
            <Card className="border-amber-500 border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-amber-600" />Undeposited Cash</CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/banking/cash-bundles")}>
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {cashSummary ? formatNIS(Number(cashSummary.undeposited_total_nis || 0)) : "—"}
                </div>
                <p className="text-sm text-muted-foreground">
                  {openBundles.length} open bundle{openBundles.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          )}

          {lowStock.length > 0 && (
            <Card className="border-orange-500 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-orange-600" />Low Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">{p.current_stock}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{p.min_stock_level}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.product_suppliers?.[0]?.suppliers?.name || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Overdue Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" /> Overdue Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topOverdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue invoices. 🎉</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOverdue.map((r) => (
                    <TableRow key={r.sale_id} className="cursor-pointer" onClick={() => navigate(`/admin/customers/${r.customer_id}`)}>
                      <TableCell className="font-medium">{r.customer_name}</TableCell>
                      <TableCell className="text-sm">{r.invoice_number}</TableCell>
                      <TableCell className="text-right font-bold">{formatNIS(r.outstanding_nis)}</TableCell>
                      <TableCell>
                        <Badge className={severityClass(r.days_overdue)}>{r.days_overdue} days</Badge>
                      </TableCell>
                      <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLedger.map((e) => {
                    const out = String(e.transaction_type || "").toUpperCase() === "OUT";
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{e.description || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.bank_accounts?.name || "—"}</TableCell>
                        <TableCell className={`text-right font-semibold ${out ? "text-red-600" : "text-green-600"}`}>
                          {out ? "−" : "+"}{formatNIS(Number(e.amount || 0))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
