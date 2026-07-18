// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDown, Search, Receipt, CreditCard, FileSpreadsheet } from "lucide-react";
import { formatNIS } from "@/utils/formatters";
import { generateInvoicePDF } from "@/utils/invoicePDF";
import PaymentDialog from "@/components/admin/PaymentDialog";

type SaleRow = {
  id: string;
  invoice_number: string | null;
  sale_number: string | null;
  sale_date: string | null;
  total_amount: number | null;
  amount_nis: number | null;
  currency: string | null;
  payment_status: string | null;
  balance_due: number | null;
  customer_id: string | null;
  deferred_due_date: string | null;
  customers?: { id: string; contact_person: string | null; company_name: string | null; address: string | null; email: string | null; phone: string | null; payment_terms_days: number | null } | null;
};

const statusColor = (s: string | null) => {
  switch (s) {
    case "paid": return "bg-green-500 text-white hover:bg-green-600";
    case "partial":
    case "partial_paid": return "bg-yellow-500 text-white hover:bg-yellow-600";
    case "overdue": return "bg-red-500 text-white hover:bg-red-600";
    default: return "bg-muted text-foreground";
  }
};

const computeStatus = (r: SaleRow): string => {
  const status = r.payment_status || "pending";
  if (status === "paid") return "paid";
  const balance = Number(r.balance_due ?? 0);
  if (balance <= 0.01) return "paid";
  // Overdue check
  const terms = r.customers?.payment_terms_days ?? null;
  if (terms != null && r.sale_date) {
    const due = new Date(r.sale_date);
    due.setDate(due.getDate() + terms);
    if (due < new Date()) return "overdue";
  }
  if (status === "partial_paid" || status === "partial") return "partial";
  return "pending";
};

export default function Invoices() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<SaleRow | null>(null);
  const [activeItems, setActiveItems] = useState<any[]>([]);
  const [activePayments, setActivePayments] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("id, invoice_number, sale_number, sale_date, total_amount, amount_nis, currency, payment_status, balance_due, customer_id, deferred_due_date, customers(id, contact_person, company_name, address, email, phone, payment_terms_days)")
        .order("sale_date", { ascending: false });
      if (error) throw error;
      setRows(Array.isArray(data) ? (data as any) : []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load invoices";
      console.error("Invoices load error:", err);
      setLoadError(msg);
      setRows([]);
      toast({ variant: "destructive", title: "Load failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const status = computeStatus(r);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (fromDate && r.sale_date && new Date(r.sale_date) < new Date(fromDate)) return false;
      if (toDate && r.sale_date && new Date(r.sale_date) > new Date(toDate + "T23:59:59")) return false;
      if (q) {
        const hay = [r.invoice_number, r.sale_number, r.customers?.contact_person, r.customers?.company_name]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, fromDate, toDate]);

  // Summary: current month + outstanding/overdue across filtered
  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthInvoiced = 0, monthCollected = 0, outstanding = 0, overdue = 0;
    rows.forEach((r) => {
      const nis = Number(r.amount_nis ?? r.total_amount ?? 0);
      const bal = Number(r.balance_due ?? 0);
      const paid = nis - bal;
      if (r.sale_date && new Date(r.sale_date) >= monthStart) {
        monthInvoiced += nis;
        monthCollected += Math.max(paid, 0);
      }
      outstanding += Math.max(bal, 0);
      if (computeStatus(r) === "overdue") overdue += Math.max(bal, 0);
    });
    return { monthInvoiced, monthCollected, outstanding, overdue };
  }, [rows]);

  const toggleSel = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };

  const exportCSV = () => {
    const target = selected.size ? filtered.filter(r => selected.has(r.id)) : filtered;
    if (!target.length) { toast({ title: "Nothing to export" }); return; }
    const headers = ["Invoice #", "Customer", "Date", "Due Date", "Total NIS", "Paid NIS", "Balance NIS", "Status", "Original Amount", "Currency"];
    const rowsCsv = target.map((r) => {
      const nis = Number(r.amount_nis ?? r.total_amount ?? 0);
      const bal = Number(r.balance_due ?? 0);
      const due = r.customers?.payment_terms_days != null && r.sale_date
        ? new Date(new Date(r.sale_date).getTime() + r.customers.payment_terms_days * 86400000).toLocaleDateString()
        : "";
      return [
        r.invoice_number || r.sale_number || r.id.slice(0, 8),
        (r.customers?.company_name || r.customers?.contact_person || "").replace(/,/g, " "),
        r.sale_date ? new Date(r.sale_date).toLocaleDateString() : "",
        due,
        nis.toFixed(2),
        (nis - bal).toFixed(2),
        bal.toFixed(2),
        computeStatus(r),
        Number(r.total_amount ?? 0).toFixed(2),
        r.currency || "NIS",
      ].join(",");
    });
    const csv = [headers.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${target.length} invoices` });
  };

  const openDetail = async (r: SaleRow) => {
    setActive(r);
    setActiveItems([]); setActivePayments([]);
    const [it, pa] = await Promise.all([
      supabase.from("sale_items").select("description, quantity, unit_price, total, products(name)").eq("sale_id", r.id),
      supabase.from("payments").select("id, amount, nis_equivalent, payment_method, payment_date, reference_number, status").eq("sale_id", r.id).order("payment_date", { ascending: false }),
    ]);
    setActiveItems((it.data as any[]) ?? []);
    setActivePayments((pa.data as any[]) ?? []);
  };

  const downloadPDF = async (row: SaleRow) => {
    setDownloadingId(row.id);
    try {
      const { data: items } = await supabase
        .from("sale_items")
        .select("description, quantity, unit_price, total, products(name)")
        .eq("sale_id", row.id);
      const lineItems = ((items as any[]) ?? []).map((it) => ({
        description: it.description || it.products?.name || "Item",
        quantity: Number(it.quantity ?? 0),
        unitPrice: Number(it.unit_price ?? 0),
        total: Number(it.total ?? Number(it.quantity ?? 0) * Number(it.unit_price ?? 0)),
      }));
      const total = Number(row.total_amount ?? 0);
      const paid = total - Number(row.balance_due ?? 0);
      const due = row.customers?.payment_terms_days != null && row.sale_date
        ? new Date(new Date(row.sale_date).getTime() + row.customers.payment_terms_days * 86400000).toLocaleDateString()
        : "";
      await generateInvoicePDF({
        invoiceNumber: row.invoice_number || row.sale_number || row.id.slice(0, 8),
        invoiceDate: row.sale_date ? new Date(row.sale_date).toLocaleDateString() : "",
        dueDate: due,
        customer: {
          name: row.customers?.contact_person ?? "—",
          company: row.customers?.company_name ?? undefined,
          address: row.customers?.address ?? "",
          email: row.customers?.email ?? undefined,
          phone: row.customers?.phone ?? undefined,
        },
        items: lineItems, subtotal: total, taxRate: 0, taxAmount: 0,
        totalAmount: total, amountPaid: paid, paymentStatus: row.payment_status ?? "pending",
      });
      toast({ title: "Invoice PDF generated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "PDF failed", description: err?.message || "Failed" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">All sales invoices across the system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Invoiced This Month</p><p className="text-2xl font-bold">{formatNIS(summary.monthInvoiced)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Collected This Month</p><p className="text-2xl font-bold text-green-600">{formatNIS(summary.monthCollected)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Outstanding</p><p className="text-2xl font-bold">{formatNIS(summary.outstanding)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Total Overdue</p><p className="text-2xl font-bold text-destructive">{formatNIS(summary.overdue)}</p></CardContent></Card>
      </div>

      {/* Filter bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search customer or invoice #" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" placeholder="From" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" placeholder="To" />
            {(search || statusFilter !== "all" || fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setFromDate(""); setToDate(""); }}>Clear</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-destructive font-medium">Could not load invoices</p>
              <p className="text-xs text-muted-foreground break-all px-4">{loadError}</p>
              <Button size="sm" variant="outline" onClick={load}>Retry</Button>
            </div>
          ) : loading ? (
            <p className="text-center py-12 text-muted-foreground">Loading invoices…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              {rows.length === 0 ? "No invoices yet — create your first sale" : "No invoices match the current filters."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total NIS</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const nis = Number(r.amount_nis ?? r.total_amount ?? 0);
                  const bal = Number(r.balance_due ?? 0);
                  const status = computeStatus(r);
                  const due = r.customers?.payment_terms_days != null && r.sale_date
                    ? new Date(new Date(r.sale_date).getTime() + r.customers.payment_terms_days * 86400000).toLocaleDateString()
                    : "—";
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetail(r)}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSel(r.id)} />
                      </TableCell>
                      <TableCell className="font-medium"><Receipt className="h-3 w-3 inline mr-1 text-primary" />{r.invoice_number || r.sale_number || r.id.slice(0, 8)}</TableCell>
                      <TableCell>{r.customers?.company_name || r.customers?.contact_person || "—"}</TableCell>
                      <TableCell>{r.sale_date ? new Date(r.sale_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{due}</TableCell>
                      <TableCell className="text-right">{formatNIS(nis)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatNIS(nis - bal)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatNIS(bal)}</TableCell>
                      <TableCell><Badge className={`capitalize ${statusColor(status)}`}>{status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setShowPayment(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {active.invoice_number || active.sale_number || active.id.slice(0, 8)}
                  <Badge className={`ml-2 capitalize ${statusColor(computeStatus(active))}`}>{computeStatus(active)}</Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{active.customers?.company_name || active.customers?.contact_person || "—"}</p>
                    {active.customers?.email && <p className="text-xs text-muted-foreground">{active.customers.email}</p>}
                    {active.customers?.phone && <p className="text-xs text-muted-foreground">{active.customers.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{active.sale_date ? new Date(active.sale_date).toLocaleDateString() : "—"}</p>
                    <p className="text-muted-foreground mt-2">Total / Balance</p>
                    <p className="font-medium">{formatNIS(Number(active.amount_nis ?? active.total_amount ?? 0))} / <span className="text-destructive">{formatNIS(Number(active.balance_due ?? 0))}</span></p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeItems.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No items</TableCell></TableRow>
                      ) : activeItems.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell>{it.description || it.products?.name || "Item"}</TableCell>
                          <TableCell className="text-right">{it.quantity}</TableCell>
                          <TableCell className="text-right">{Number(it.unit_price).toLocaleString()}</TableCell>
                          <TableCell className="text-right">{Number(it.total ?? it.quantity * it.unit_price).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Payment History</p>
                  {activePayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount NIS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activePayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}</TableCell>
                            <TableCell className="capitalize">{p.payment_method}</TableCell>
                            <TableCell>{p.reference_number || "—"}</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">{formatNIS(Number(p.nis_equivalent ?? p.amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={() => downloadPDF(active)} disabled={downloadingId === active.id} variant="outline" className="flex-1">
                    <FileDown className="h-4 w-4 mr-2" />
                    {downloadingId === active.id ? "Generating…" : "Download PDF"}
                  </Button>
                  <Button onClick={() => setShowPayment(true)} disabled={Number(active.balance_due ?? 0) <= 0} className="flex-1 bg-primary">
                    <CreditCard className="h-4 w-4 mr-2" />Record Payment
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {active && (
        <PaymentDialog
          open={showPayment}
          onClose={() => setShowPayment(false)}
          saleId={active.id}
          customerId={active.customer_id ?? undefined}
          saleAmount={Number(active.total_amount ?? 0)}
          balanceDue={Number(active.balance_due ?? 0)}
          onSuccess={() => { setShowPayment(false); load(); openDetail(active); }}
        />
      )}
    </div>
  );
}
