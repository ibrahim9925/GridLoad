// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, FileText, Download, ArrowRightCircle } from "lucide-react";
import { useQuotationsData, Quotation } from "@/hooks/useQuotationsData";
import { QuotationDialog } from "@/components/admin/quotations/QuotationDialog";
import { supabase } from "@/integrations/supabase/client";
import { generateQuotationPDF } from "@/utils/bilingualPDF";
import { formatNIS } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, FileText as FileTextIcon } from "lucide-react";
import { format } from "date-fns";

const statusBadge = (s: string) => {
  switch (s) {
    case "accepted": return "bg-green-500 text-white";
    case "sent": return "bg-blue-500 text-white";
    case "rejected": return "bg-red-500 text-white";
    case "expired": return "bg-gray-400 text-white";
    default: return "bg-muted";
  }
};

export default function Quotations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quotations, isLoading, error, saveQuotation, deleteQuotation, convertToInvoice, refetch } = useQuotationsData();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return quotations;
    return quotations.filter((x) =>
      [x.quote_number, x.customer?.contact_person, x.customer?.company_name]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [quotations, search]);

  const stats = useMemo(() => ({
    total: quotations.length,
    draft: quotations.filter((q) => q.status === "draft").length,
    sent: quotations.filter((q) => q.status === "sent").length,
    accepted: quotations.filter((q) => q.status === "accepted").length,
    totalValue: quotations.reduce((s, q) => s + Number(q.total_amount || 0), 0),
  }), [quotations]);

  const handlePDF = async (q: Quotation) => {
    try {
      console.log("📄 Generating PDF for quotation:", q.quote_number);
      const { data: items, error } = await supabase.from("quotation_items").select("*").eq("quotation_id", q.id);
      if (error) throw error;
      await generateQuotationPDF({
        quoteNumber: q.quote_number,
        version: q.version,
        quoteDate: q.quote_date ? new Date(q.quote_date).toLocaleDateString() : "",
        validUntil: q.valid_until ? new Date(q.valid_until).toLocaleDateString() : undefined,
        customer: {
          name: q.customer?.contact_person || q.customer?.company_name || "—",
          company: q.customer?.company_name,
          address: q.customer?.address,
          phone: q.customer?.phone,
          email: q.customer?.email,
        },
        items: ((items as any[]) || []).map((i) => ({
          description: i.description || "Item",
          quantity: Number(i.quantity || 0),
          unitPrice: Number(i.unit_price || 0),
          discount: Number(i.discount || 0),
          total: Number(i.total || 0),
        })),
        subtotal: Number(q.subtotal || 0),
        discountAmount: Number(q.discount_amount || 0),
        taxAmount: Number(q.tax_amount || 0),
        totalAmount: Number(q.total_amount || 0),
        currency: q.currency || "NIS",
        terms: q.terms,
        notes: q.notes,
      });
      toast({ title: "PDF downloaded", description: q.quote_number });
    } catch (err: any) {
      console.error("❌ Quotation PDF error:", err);
      toast({ variant: "destructive", title: "PDF generation failed", description: err?.message || "Unknown error" });
    }
  };

  const handleConvert = async (q: Quotation) => {
    if (q.converted_to_sale_id) {
      toast({ title: "Already converted" });
      return;
    }
    if (!confirm(`Convert ${q.quote_number} to an invoice/sale?`)) return;
    const saleId = await convertToInvoice(q.id);
    if (saleId) navigate("/admin/invoices");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Price offers and proposals</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Quotation
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card><CardContent className="p-3 md:p-4"><p className="text-[10px] md:text-xs text-muted-foreground uppercase">Total</p><p className="text-xl md:text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3 md:p-4"><p className="text-[10px] md:text-xs text-muted-foreground uppercase">Sent</p><p className="text-xl md:text-2xl font-bold">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="p-3 md:p-4"><p className="text-[10px] md:text-xs text-muted-foreground uppercase">Accepted</p><p className="text-xl md:text-2xl font-bold text-green-600">{stats.accepted}</p></CardContent></Card>
        <Card><CardContent className="p-3 md:p-4"><p className="text-[10px] md:text-xs text-muted-foreground uppercase">Total Value</p><p className="text-base md:text-2xl font-bold break-words">{formatNIS(stats.totalValue)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle>All Quotations</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Could not load quotations</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm break-all">{error}</p>
                <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading quotations…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileTextIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No quotations yet — create your first one</p>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />New Quotation
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filtered.map((q) => (
                  <div
                    key={q.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setEditing(q); setDialogOpen(true); }}
                    className="w-full text-left border rounded-lg p-3 bg-card hover:bg-muted/40 active:bg-muted transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="font-semibold text-sm">
                        {q.quote_number}
                        {q.version > 1 && <span className="ml-1 text-[10px] text-muted-foreground">v{q.version}</span>}
                      </div>
                      <Badge className={`capitalize text-[10px] ${statusBadge(q.status)}`}>{q.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground truncate mb-2">
                      {q.customer?.company_name || q.customer?.contact_person || "—"}
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <div className="text-[11px] text-muted-foreground">
                        Valid: {q.valid_until ? format(new Date(q.valid_until), "MMM dd, yyyy") : "—"}
                      </div>
                      <div className="text-sm font-bold">
                        {Number(q.total_amount || 0).toLocaleString()} {q.currency}
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 mt-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); handlePDF(q); }} title="PDF"><Download className="h-4 w-4" /></Button>
                      {q.status === "accepted" && !q.converted_to_sale_id && (
                        <Button size="sm" variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); handleConvert(q); }} title="Convert"><ArrowRightCircle className="h-4 w-4 text-green-600" /></Button>
                      )}
                      <Button size="sm" variant="ghost" type="button" onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteQuotation(q.id); }} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">
                          {q.quote_number}
                          {q.version > 1 && <span className="ml-2 text-xs text-muted-foreground">v{q.version}</span>}
                        </TableCell>
                        <TableCell>{q.customer?.company_name || q.customer?.contact_person || "—"}</TableCell>
                        <TableCell>{q.quote_date ? format(new Date(q.quote_date), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell>{q.valid_until ? format(new Date(q.valid_until), "MMM dd, yyyy") : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{Number(q.total_amount || 0).toLocaleString()} {q.currency}</TableCell>
                        <TableCell><Badge className={`capitalize ${statusBadge(q.status)}`}>{q.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(q); setDialogOpen(true); }} title="Edit"><Edit className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handlePDF(q)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                            {q.status === "accepted" && !q.converted_to_sale_id && (
                              <Button size="sm" variant="ghost" onClick={() => handleConvert(q)} title="Convert to Invoice"><ArrowRightCircle className="h-4 w-4 text-green-600" /></Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete?")) deleteQuotation(q.id); }} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <QuotationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quotation={editing}
        onSave={saveQuotation}
      />
    </div>
  );
}
