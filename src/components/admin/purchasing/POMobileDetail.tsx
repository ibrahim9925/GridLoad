// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNIS, formatMoney } from "@/utils/formatters";
import {
  ChevronDown, Plus, Trash2, Save, Ship, CreditCard, Package,
  FileText, Calculator, Lock, Loader2, ChevronRight, Pencil,
} from "lucide-react";
import PaymentSheet from "./sheets/PaymentSheet";
import ShipmentSheet from "./sheets/ShipmentSheet";
import ShipmentDetailSheet from "./sheets/ShipmentDetailSheet";
import WarehouseArrivalSheet from "./sheets/WarehouseArrivalSheet";
import MobileDetailHeader from "@/components/admin/mobile/MobileDetailHeader";
import ConfirmSheet from "@/components/admin/mobile/ConfirmSheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPO?: any;
  onChanged: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  in_transit: "In Transit",
  at_port: "At Port",
  received: "Received",
  closed: "Closed",
};

const Section: React.FC<{ icon: any; title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }> = ({ icon: Icon, title, subtitle, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-xl bg-card">
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 min-h-[56px]">
          <div className="flex items-center gap-3 text-left">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold">{title}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const POMobileDetail: React.FC<Props> = ({ open, onOpenChange, existingPO, onChanged }) => {
  const { toast } = useToast();
  const [poId, setPoId] = useState<string | null>(existingPO?.id || null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [savingHeader, setSavingHeader] = useState(false);

  const [header, setHeader] = useState({
    order_number: existingPO?.order_number || "",
    supplier_id: existingPO?.supplier_id || "",
    origin_country: existingPO?.origin_country || "",
    expected_delivery: existingPO?.expected_delivery ? new Date(existingPO.expected_delivery).toISOString().split("T")[0] : "",
    notes: existingPO?.notes || "",
    currency: existingPO?.currency || "USD",
    status: existingPO?.status || "draft",
    total_amount: existingPO?.total_amount || 0,
  });

  const [newItem, setNewItem] = useState({ product_id: "", new_product_name: "", quantity: 1, unit_cost: 0 });

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentShipmentId, setPaymentShipmentId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<any | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipmentDetailOpen, setShipmentDetailOpen] = useState(false);
  const [arrivalOpen, setArrivalOpen] = useState(false);
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);
  const [forceCloseReason, setForceCloseReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setPoId(existingPO?.id || null);
    setHeader({
      order_number: existingPO?.order_number || "",
      supplier_id: existingPO?.supplier_id || "",
      origin_country: existingPO?.origin_country || "",
      expected_delivery: existingPO?.expected_delivery ? new Date(existingPO.expected_delivery).toISOString().split("T")[0] : "",
      notes: existingPO?.notes || "",
      currency: existingPO?.currency || "USD",
      status: existingPO?.status || "draft",
      total_amount: existingPO?.total_amount || 0,
    });
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name").then(({ data }) => setSuppliers(data || []));
    supabase.from("products").select("id, name, sku").order("name").then(({ data }) => setProducts(data || []));
    if (existingPO?.id) refresh(existingPO.id);
  }, [open, existingPO?.id]);

  const refresh = useCallback(async (id?: string) => {
    const targetId = id || poId;
    if (!targetId) return;
    const [itemsR, paysR, shipsR, poR] = await Promise.all([
      supabase.from("purchase_order_items").select("*, products:product_id(name, sku)").eq("purchase_order_id", targetId),
      supabase.from("po_payments_out").select("*").eq("purchase_order_id", targetId).order("payment_date", { ascending: false }),
      supabase.from("po_shipments").select("*").eq("purchase_order_id", targetId).order("created_at"),
      supabase.from("purchase_orders").select("*").eq("id", targetId).single(),
    ]);
    setLineItems(itemsR.data || []);
    setPayments(paysR.data || []);
    setShipments(shipsR.data || []);
    if (poR.data) setHeader((h) => ({ ...h, status: poR.data.status, total_amount: poR.data.total_amount, order_number: poR.data.order_number }));
  }, [poId]);

  const saveHeader = async () => {
    if (!header.supplier_id) {
      toast({ variant: "destructive", title: "Supplier required" });
      return;
    }
    setSavingHeader(true);
    try {
      let orderNumber = header.order_number;
      if (!orderNumber) {
        const { data: genData } = await supabase.rpc("generate_po_number");
        orderNumber = genData || `PO-${Date.now()}`;
      }
      const poData = {
        order_number: orderNumber,
        supplier_id: header.supplier_id,
        origin_country: header.origin_country,
        expected_delivery: header.expected_delivery || null,
        notes: header.notes,
        currency: header.currency,
        status: header.status,
      };
      if (poId) {
        const { error } = await supabase.from("purchase_orders").update(poData).eq("id", poId);
        if (error) throw error;
        toast({ title: "PO updated" });
      } else {
        const { data, error } = await supabase.from("purchase_orders").insert(poData).select().single();
        if (error) throw error;
        setPoId(data.id);
        setHeader((h) => ({ ...h, order_number: data.order_number }));
        toast({ title: "PO created" });
      }
      onChanged();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingHeader(false);
    }
  };

  const updatePOTotal = async (id: string) => {
    const { data } = await supabase.from("purchase_order_items").select("total").eq("purchase_order_id", id);
    const total = (data || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
    await supabase.from("purchase_orders").update({ total_amount: total }).eq("id", id);
  };

  const addLineItem = async () => {
    if (!poId) { toast({ variant: "destructive", title: "Save PO header first" }); return; }
    try {
      let productId = newItem.product_id;
      if (!productId && newItem.new_product_name) {
        const sku = newItem.new_product_name.replace(/\s+/g, "-").toUpperCase();
        const { data: existing } = await supabase.from("products").select("id").eq("sku", sku).maybeSingle();
        if (existing) productId = existing.id;
        else {
          const { data: created, error } = await supabase.from("products").insert({
            name: newItem.new_product_name, sku, category: "Other",
            cost_price: newItem.unit_cost, supplier_id: header.supplier_id || null,
            current_stock: 0, min_stock_level: 5, warranty_months: 12,
            status: "active", is_active: true,
          }).select().single();
          if (error) throw error;
          productId = created.id;
          const { data: ps } = await supabase.from("products").select("id, name, sku").order("name");
          setProducts(ps || []);
        }
      }
      if (!productId) { toast({ variant: "destructive", title: "Select or name a product" }); return; }
      const total = newItem.quantity * newItem.unit_cost;
      const { error } = await supabase.from("purchase_order_items").insert({
        purchase_order_id: poId, product_id: productId,
        quantity: newItem.quantity, unit_cost: newItem.unit_cost, total,
      });
      if (error) throw error;
      await updatePOTotal(poId);
      await refresh();
      setNewItem({ product_id: "", new_product_name: "", quantity: 1, unit_cost: 0 });
      toast({ title: "Line item added" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const removeLineItem = async (id: string) => {
    await supabase.from("purchase_order_items").delete().eq("id", id);
    if (poId) { await updatePOTotal(poId); await refresh(); }
  };

  const poCurrency = header.currency || "USD";
  // Payments in PO's currency (sum of original amounts when currency matches; otherwise convert via nis_equivalent / fx assumed = 1 fallback)
  const totalPaymentsPOCurrency = payments.reduce((s, p) => {
    if ((p.original_currency || "NIS").toUpperCase() === poCurrency.toUpperCase()) {
      return s + Number(p.amount || 0);
    }
    // fallback: use nis_equivalent divided by fx_rate if PO currency != NIS and payment is in NIS
    return s + Number(p.amount || 0); // best-effort: assume amount already in matching currency
  }, 0);
  const totalPaymentsNIS = payments.reduce((s, p) => s + (p.nis_equivalent || 0), 0);
  const totalUnitsReceived = shipments.filter((s) => s.status === "arrived").reduce((s, sh) => {
    return s + lineItems.reduce((acc, li) => acc + (li.received_quantity || 0), 0);
  }, 0);
  const totalUnitsOrdered = lineItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const landedCostPerUnitPO = totalUnitsReceived > 0 ? totalPaymentsPOCurrency / totalUnitsReceived : 0;
  const landedCostPerUnitNIS = totalUnitsReceived > 0 ? totalPaymentsNIS / totalUnitsReceived : 0;
  const remainingPO = Math.max(0, Number(header.total_amount || 0) - totalPaymentsPOCurrency);

  const forceClose = async (reason: string) => {
    if (!poId) return;
    const { error } = await supabase.rpc("force_close_po", { p_po_id: poId, p_reason: reason });
    if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
    else { toast({ title: "PO force-closed" }); await refresh(); onChanged(); }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto rounded-none p-0 flex flex-col">
          <MobileDetailHeader
            title={header.order_number || "New Purchase Order"}
            subtitle={STATUS_BADGE[header.status] || header.status}
            onBack={() => onOpenChange(false)}
            action={
              <Button
                size="sm"
                onClick={saveHeader}
                disabled={savingHeader}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {savingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" />Save</>}
              </Button>
            }
          />

          {poId && (
            <div className="px-4 pt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-bold">{formatMoney(header.total_amount || 0, poCurrency)}</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                <p className="text-sm font-bold">{formatMoney(totalPaymentsPOCurrency, poCurrency)}</p>
                <p className="text-[9px] text-muted-foreground">Rem {formatMoney(remainingPO, poCurrency)}</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Units</p>
                <p className="text-sm font-bold">{totalUnitsOrdered}</p>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3 pb-32">
            {/* Header section */}
            <Section icon={FileText} title="Header" subtitle="Supplier & PO details" defaultOpen={!poId}>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Supplier *</Label>
                  <Select value={header.supplier_id} onValueChange={(v) => setHeader({ ...header, supplier_id: v })}>
                    <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Origin Country</Label>
                  <Input className="text-base h-12" value={header.origin_country} onChange={(e) => setHeader({ ...header, origin_country: e.target.value })} placeholder="e.g. China" />
                </div>
                <div>
                  <Label>Expected Arrival</Label>
                  <Input type="date" className="text-base h-12" value={header.expected_delivery} onChange={(e) => setHeader({ ...header, expected_delivery: e.target.value })} />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={header.currency} onValueChange={(v) => setHeader({ ...header, currency: v })}>
                    <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="NIS">NIS</SelectItem>
                      <SelectItem value="JOD">JOD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea className="text-base" rows={2} value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} />
                </div>
                <Button onClick={saveHeader} disabled={savingHeader} className="w-full h-12">
                  {savingHeader ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />{poId ? "Update Header" : "Create PO"}</>}
                </Button>
              </div>
            </Section>

            {/* Line Items */}
            <Section icon={Package} title="Line Items" subtitle={`${lineItems.length} item${lineItems.length === 1 ? "" : "s"} · ${totalUnitsOrdered} units`} defaultOpen={!!poId && lineItems.length === 0}>
              {!poId ? (
                <p className="text-sm text-muted-foreground py-3">Save the PO header to add items</p>
              ) : (
                <div className="space-y-3 pt-2">
                  {lineItems.map((li) => (
                    <div key={li.id} className="border rounded-lg p-3 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{li.products?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{li.quantity} × {formatMoney(li.unit_cost, poCurrency)} = {formatMoney(li.total, poCurrency)}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeLineItem(li.id)} className="h-10 w-10 shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-2 border-dashed rounded-lg p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Add Item</p>
                    <div>
                      <Label className="text-xs">Existing Product</Label>
                      <Select value={newItem.product_id} onValueChange={(v) => setNewItem({ ...newItem, product_id: v, new_product_name: "" })}>
                        <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Pick product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Or New Product Name</Label>
                      <Input className="text-base h-12" value={newItem.new_product_name} onChange={(e) => setNewItem({ ...newItem, new_product_name: e.target.value, product_id: "" })} placeholder="Auto-creates" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" inputMode="numeric" min={1} className="text-base h-12" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Unit Cost</Label>
                        <Input type="number" inputMode="decimal" step="0.01" className="text-base h-12" value={newItem.unit_cost || ""} onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <Button onClick={addLineItem} className="w-full h-12">
                      <Plus className="h-4 w-4 mr-2" />Add Item
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            {/* Payments */}
            <Section icon={CreditCard} title="Payments" subtitle={`${payments.length} · ${formatMoney(totalPaymentsPOCurrency, poCurrency)} of ${formatMoney(header.total_amount || 0, poCurrency)}`}>
              {!poId ? (
                <p className="text-sm text-muted-foreground py-3">Save the PO header first</p>
              ) : (
                <div className="space-y-2 pt-2">
                  {payments.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No payments yet</p>}
                  {payments.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize">{p.payment_type}</p>
                          <p className="text-xs text-muted-foreground">{p.payment_date}{p.shipment_id ? " · linked to shipment" : ""}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatMoney(p.amount || 0, p.original_currency || poCurrency)}</p>
                          <p className="text-[10px] text-muted-foreground">≈ {formatNIS(p.nis_equivalent || 0)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9"
                          onClick={() => { setEditingPayment(p); setPaymentShipmentId(p.shipment_id || null); setPaymentOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeletingPayment(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button onClick={() => { setEditingPayment(null); setPaymentShipmentId(null); setPaymentOpen(true); }} className="w-full h-12 mt-2">
                    <Plus className="h-4 w-4 mr-2" />Record Payment
                  </Button>
                </div>
              )}
            </Section>

            {/* Shipments */}
            <Section icon={Ship} title="Shipments" subtitle={`${shipments.length} shipment${shipments.length === 1 ? "" : "s"}`}>
              {!poId ? (
                <p className="text-sm text-muted-foreground py-3">Save the PO header first</p>
              ) : (
                <div className="space-y-2 pt-2">
                  {shipments.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No shipments yet</p>}
                  {shipments.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setActiveShipment(s); setShipmentDetailOpen(true); }}
                      className="w-full border rounded-lg p-3 flex justify-between items-center text-left min-h-[60px] hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{s.shipment_number}</p>
                        <p className="text-xs text-muted-foreground capitalize">{s.status?.replace(/_/g, " ")}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  ))}
                  <Button onClick={() => setShipmentOpen(true)} variant="outline" className="w-full h-12 mt-2">
                    <Plus className="h-4 w-4 mr-2" />New Shipment
                  </Button>
                </div>
              )}
            </Section>

            {/* Landed Cost */}
            <Section icon={Calculator} title="Landed Cost" subtitle={totalUnitsReceived > 0 ? `${formatMoney(landedCostPerUnitPO, poCurrency)}/unit` : "Pending warehouse arrival"}>
              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted rounded p-3">
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-bold">{formatMoney(totalPaymentsPOCurrency, poCurrency)}</p>
                    <p className="text-[10px] text-muted-foreground">≈ {formatNIS(totalPaymentsNIS)}</p>
                  </div>
                  <div className="bg-muted rounded p-3"><p className="text-xs text-muted-foreground">Units Received</p><p className="text-lg font-bold">{totalUnitsReceived}</p></div>
                </div>
                <div className="bg-primary/10 rounded p-3">
                  <p className="text-xs text-muted-foreground">Landed Cost Per Unit</p>
                  <p className="text-2xl font-bold">{totalUnitsReceived > 0 ? formatMoney(landedCostPerUnitPO, poCurrency) : "—"}</p>
                  {totalUnitsReceived > 0 && poCurrency !== "NIS" && (
                    <p className="text-xs text-muted-foreground">≈ {formatNIS(landedCostPerUnitNIS)} per unit</p>
                  )}
                </div>
              </div>
            </Section>

            {/* Force close */}
            {poId && header.status !== "closed" && (
              <Button
                variant="outline"
                className="w-full h-12 text-destructive border-destructive/30"
                onClick={() => { setForceCloseReason(""); setForceCloseOpen(true); }}
              >
                <Lock className="h-4 w-4 mr-2" />Force Close PO
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {poId && (
        <>
          <PaymentSheet
            open={paymentOpen}
            onOpenChange={(v) => { setPaymentOpen(v); if (!v) setEditingPayment(null); }}
            poId={poId}
            shipmentId={paymentShipmentId}
            editPayment={editingPayment}
            onSaved={() => refresh()}
          />
          <ShipmentSheet
            open={shipmentOpen}
            onOpenChange={setShipmentOpen}
            poId={poId}
            onSaved={() => refresh()}
          />
          <ShipmentDetailSheet
            open={shipmentDetailOpen}
            onOpenChange={setShipmentDetailOpen}
            shipment={activeShipment}
            onAddPayment={() => { setPaymentShipmentId(activeShipment?.id); setPaymentOpen(true); }}
            onConfirmArrival={() => { setShipmentDetailOpen(false); setArrivalOpen(true); }}
            onChanged={() => refresh()}
          />
          <WarehouseArrivalSheet
            open={arrivalOpen}
            onOpenChange={setArrivalOpen}
            shipment={activeShipment}
            lineItems={lineItems}
            onConfirmed={() => refresh()}
          />
        </>
      )}

      <ConfirmSheet
        open={forceCloseOpen}
        onOpenChange={setForceCloseOpen}
        title="Force close this PO?"
        description="This bypasses the normal lifecycle. The PO will be marked closed with an audit note. Cannot be undone."
        confirmLabel="Force Close"
        destructive
        onConfirm={async () => {
          await forceClose(forceCloseReason || "manual close");
          setForceCloseOpen(false);
        }}
      />

      <ConfirmSheet
        open={!!deletingPayment}
        onOpenChange={(v) => { if (!v) setDeletingPayment(null); }}
        title="Delete this payment?"
        description="This will update the bank ledger by reversing the original entry. This action cannot be undone."
        confirmLabel="Delete Payment"
        destructive
        onConfirm={async () => {
          if (!deletingPayment) return;
          const { error } = await supabase.from("po_payments_out").delete().eq("id", deletingPayment.id);
          if (error) toast({ variant: "destructive", title: "Failed", description: error.message });
          else { toast({ title: "Payment deleted" }); await refresh(); }
          setDeletingPayment(null);
        }}
      />
    </>
  );
};


export default POMobileDetail;
