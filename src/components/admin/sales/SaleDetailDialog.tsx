// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, DollarSign, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatNIS } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import AssignSerialsDialog from "./AssignSerialsDialog";

interface Props {
  sale: any | null;
  open: boolean;
  onClose: () => void;
  onRecordPayment: (sale: any) => void;
  onDownloadInvoice: (sale: any) => Promise<void> | void;
  onDownloadWarranties: (sale: any) => Promise<void> | void;
}

const SaleDetailDialog: React.FC<Props> = ({
  sale, open, onClose, onRecordPayment, onDownloadInvoice, onDownloadWarranties,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [warrantyCount, setWarrantyCount] = useState(0);
  const [busy, setBusy] = useState<null | "invoice" | "warranty">(null);
  const [assignSerialsOpen, setAssignSerialsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !sale?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [itemsRes, serialsRes, paymentsRes, warrantyRes] = await Promise.all([
          supabase.from("sale_items")
            .select("*, products(name, sku, brand, product_type, is_serialized, warranty_months)")
            .eq("sale_id", sale.id),
          supabase.from("product_serial_numbers")
            .select("product_id, serial_number")
            .eq("sale_id", sale.id),
          supabase.from("payments")
            .select("id, payment_date, amount, payment_method, status, notes")
            .eq("sale_id", sale.id)
            .order("payment_date", { ascending: false }),
          supabase.from("warranties")
            .select("id", { count: "exact", head: true })
            .eq("sale_id", sale.id),
        ]);
        if (cancelled) return;
        if (itemsRes.error) throw itemsRes.error;
        setItems(itemsRes.data || []);
        setSerials(serialsRes.data || []);
        setPayments(paymentsRes.data || []);
        setWarrantyCount(warrantyRes.count || 0);
      } catch (e: any) {
        toast({ title: "Failed to load sale", description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, sale?.id]);

  if (!sale) return null;

  const currency = sale.currency || "NIS";
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = sale.balance_due ?? Math.max(0, (sale.total_amount || 0) - totalPaid);
  const hasSerializedItem = items.some((i) => i.products?.is_serialized === true);
  const hasMissingSerials = items.some((i) => i.has_missing_serials === true);
  const reloadItems = async () => {
    if (!sale?.id) return;
    const [itemsRes, serialsRes] = await Promise.all([
      supabase.from("sale_items")
        .select("*, products(name, sku, brand, product_type, is_serialized, warranty_months)")
        .eq("sale_id", sale.id),
      supabase.from("product_serial_numbers")
        .select("product_id, serial_number")
        .eq("sale_id", sale.id),
    ]);
    if (!itemsRes.error) setItems(itemsRes.data || []);
    if (!serialsRes.error) setSerials(serialsRes.data || []);
  };

  const runAction = async (kind: "invoice" | "warranty") => {
    setBusy(kind);
    try {
      if (kind === "invoice") {
        if (items.length === 0) {
          toast({ title: "No line items", description: "This sale has no items to invoice.", variant: "destructive" });
          return;
        }
        await onDownloadInvoice(sale);
      } else {
        if (warrantyCount === 0) {
          toast({
            title: "No warranties yet",
            description: "No warranties registered for this sale yet — warranties are created automatically when serial numbers are assigned.",
          });
          return;
        }
        await onDownloadWarranties(sale);
      }
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };



  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            {sale.sale_number || sale.invoice_number || `Sale #${sale.id.slice(0, 8)}`}
            {hasMissingSerials && (
              <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50 text-[10px] font-normal">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing serials
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div className="font-medium">{sale.customers?.contact_person || "—"}</div>
              {sale.customers?.company_name && (
                <div className="text-xs text-muted-foreground">{sale.customers.company_name}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Date</div>
              <div className="font-medium">
                {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                Terms: {sale.is_installment ? "Installment" : "Net 30"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-bold">{formatNIS(sale.total_amount || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Outstanding</div>
              <div className={`font-bold ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatNIS(outstanding)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="font-semibold mb-2">Line Items</div>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : items.length === 0 ? (
              <div className="text-muted-foreground text-xs">No items.</div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => {
                  const sn = serials.filter((s) => s.product_id === it.product_id);
                  return (
                    <div key={it.id} className="border rounded p-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.products?.name || "Product"}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.products?.sku && <>SKU: {it.products.sku} · </>}
                            {it.products?.product_type && <>Type: {it.products.product_type}</>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs">{it.quantity} × {formatNIS(it.unit_price || 0)}</div>
                          <div className="font-semibold">{formatNIS(it.total || it.line_total || 0)}</div>
                        </div>
                      </div>
                      {it.has_missing_serials && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-amber-400 text-amber-800 bg-amber-50">
                          Missing serials
                        </Badge>
                      )}
                      {sn.length > 0 && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Serials: </span>
                          {sn.map((s) => (
                            <Badge key={s.serial_number} variant="outline" className="mr-1 mb-1 font-mono text-[10px]">
                              {s.serial_number}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Payments */}
          <div>
            <div className="font-semibold mb-2">Payment History</div>
            {payments.length === 0 ? (
              <div className="text-muted-foreground text-xs">No payments recorded.</div>
            ) : (
              <div className="space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs border-b py-1">
                    <div>
                      {new Date(p.payment_date).toLocaleDateString()} · {p.payment_method || "—"}
                      {p.status && <Badge variant="outline" className="ml-2 text-[10px]">{p.status}</Badge>}
                    </div>
                    <div className="font-medium">{formatNIS(p.amount)}</div>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 font-semibold">
                  <div>Total Paid</div>
                  <div>{formatNIS(totalPaid)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <Button variant="outline" disabled={busy !== null || loading || items.length === 0} onClick={() => runAction("invoice")}>
              {busy === "invoice" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Invoice PDF
            </Button>
            {hasSerializedItem && (
              <Button variant="outline" disabled={busy !== null || loading} onClick={() => runAction("warranty")}>
                {busy === "warranty" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Warranties{warrantyCount > 0 ? ` (${warrantyCount})` : ""}
              </Button>
            )}
            <Button variant="outline" onClick={() => setAssignSerialsOpen(true)} disabled={loading || items.length === 0}>
              Assign serials
            </Button>
            <Button onClick={() => onRecordPayment(sale)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>

          <AssignSerialsDialog
            saleId={sale.id}
            open={assignSerialsOpen}
            onClose={() => setAssignSerialsOpen(false)}
            onSaved={reloadItems}
          />

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailDialog;
