// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { Quotation, QuotationItem } from "@/hooks/useQuotationsData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResponsiveFormShell } from "@/components/admin/mobile/ResponsiveFormShell";
import { getCache, setCache } from "@/lib/sessionCache";

const QD_CUSTOMERS_KEY = "quotationDialog:customers";
const QD_PRODUCTS_KEY = "quotationDialog:products";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation?: Quotation | null;
  onSave: (q: Partial<Quotation>, items: QuotationItem[], existingId?: string) => Promise<string | null>;
}

const empty: QuotationItem = { product_id: null, description: "", quantity: 1, unit_price: 0, discount: 0, total: 0 };

export const QuotationDialog: React.FC<Props> = ({ open, onOpenChange, quotation, onSave }) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<Partial<Quotation>>({});
  const [items, setItems] = useState<QuotationItem[]>([{ ...empty }]);
  const [saving, setSaving] = useState(false);

  // Cache-first dropdown loading — serves instantly from sessionCache on
  // subsequent opens; only hits Supabase if cache is empty/expired.
  useEffect(() => {
    if (!open) return;
    const cachedCust = getCache<any[]>(QD_CUSTOMERS_KEY);
    const cachedProd = getCache<any[]>(QD_PRODUCTS_KEY);
    if (cachedCust && cachedCust.length) setCustomers(cachedCust);
    if (cachedProd && cachedProd.length) setProducts(cachedProd);
    if (cachedCust && cachedProd) return;
    (async () => {
      const promises: Promise<any>[] = [];
      if (!cachedCust)
        promises.push(supabase.from("customers").select("id, company_name, contact_person").order("contact_person"));
      if (!cachedProd)
        promises.push(supabase.from("products").select("*").eq("is_active", true).order("name"));
      const results = await Promise.all(promises);
      let idx = 0;
      if (!cachedCust) {
        const r = results[idx++];
        if (r.error) console.error("QuotationDialog customers fetch", r.error);
        const list = r.data || [];
        setCustomers(list);
        setCache(QD_CUSTOMERS_KEY, list);
      }
      if (!cachedProd) {
        const r = results[idx++];
        if (r.error) console.error("QuotationDialog products fetch", r.error);
        const list = r.data || [];
        setProducts(list);
        setCache(QD_PRODUCTS_KEY, list);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (quotation) {
      setForm(quotation);
      (async () => {
        const { data } = await supabase.from("quotation_items").select("*").eq("quotation_id", quotation.id);
        setItems(((data as any) || []).map((d: any) => ({
          product_id: d.product_id, description: d.description || "", quantity: Number(d.quantity || 1),
          unit_price: Number(d.unit_price || 0), discount: Number(d.discount || 0), total: Number(d.total || 0),
        })));
      })();
    } else {
      const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setForm({
        customer_id: null,
        quote_date: new Date().toISOString().slice(0, 10),
        valid_until: validUntil,
        currency: "NIS",
        exchange_rate: 1,
        discount_amount: 0,
        tax_amount: 0,
        status: "draft",
        terms: "1. Prices valid for 30 days.\n2. Payment terms: 50% advance, 50% on delivery.\n3. Warranty per manufacturer specifications.",
        notes: "",
      });
      setItems([{ ...empty }]);
    }
  }, [open, quotation]);

  const recalc = (i: number, patch: Partial<QuotationItem>) => {
    const next = [...items];
    const merged = { ...next[i], ...patch };
    const lineGross = Number(merged.quantity || 0) * Number(merged.unit_price || 0);
    merged.total = lineGross * (1 - Number(merged.discount || 0) / 100);
    next[i] = merged;
    setItems(next);
  };

  const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
  const total = subtotal - Number(form.discount_amount || 0) + Number(form.tax_amount || 0);

  const pickProduct = (i: number, productId: string) => {
    const p = products.find((x: any) => x.id === productId);
    if (!p) return;
    recalc(i, {
      product_id: p.id,
      description: p.name,
      unit_price: Number((p as any).unit_price ?? (p as any).price ?? 0),
    });
  };

  const submit = async () => {
    // ---- Validation with explicit field-level toasts ----
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    console.log("[QuotationDialog] submit values:", {
      customer_id: form.customer_id,
      line_items: items,
      total_amount: total,
    });

    if (!form.customer_id || !uuidRe.test(String(form.customer_id))) {
      toast({ variant: "destructive", title: "Customer required", description: "Select a valid customer before saving." });
      return;
    }
    const validItems = items.filter((it) => Number(it.quantity) > 0 && Number(it.unit_price) > 0);
    if (validItems.length === 0) {
      toast({ variant: "destructive", title: "Line items required", description: "Add at least one line item with quantity and unit price greater than 0." });
      return;
    }
    if (!(total > 0)) {
      toast({ variant: "destructive", title: "Total must be > 0", description: `Calculated total is ${total.toFixed(2)}. Check line items, discount and tax.` });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    console.log("[QuotationDialog] session user:", session?.user?.id);
    if (!session?.user) {
      toast({ variant: "destructive", title: "Not signed in", description: "Your session expired. Please sign in again." });
      return;
    }

    setSaving(true);
    try {
      const id = await onSave(form, validItems, quotation?.id);
      console.log("[QuotationDialog] onSave returned id=", id);
      if (id) {
        onOpenChange(false);
      }
      // If id is null, saveQuotation already surfaced the raw error toast — keep dialog open.
    } catch (e: any) {
      console.error("[QuotationDialog] submit error:", e);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: e?.message || e?.details || e?.hint || JSON.stringify(e) || "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const itemRows = items.map((it, i) => (
    <TableRow key={i}>
      <TableCell>
        <Select value={it.product_id || ""} onValueChange={(v) => pickProduct(i, v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><Input value={it.description} onChange={(e) => recalc(i, { description: e.target.value })} /></TableCell>
      <TableCell><Input type="number" value={it.quantity} onChange={(e) => recalc(i, { quantity: Number(e.target.value) })} /></TableCell>
      <TableCell><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => recalc(i, { unit_price: Number(e.target.value) })} /></TableCell>
      <TableCell><Input type="number" value={it.discount} onChange={(e) => recalc(i, { discount: Number(e.target.value) })} /></TableCell>
      <TableCell className="text-right font-medium">{it.total.toFixed(2)}</TableCell>
      <TableCell>
        <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  ));

  const mobileItemCards = items.map((it, i) => (
    <div key={i} className="border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item #{i + 1}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Product</Label>
        <Select value={it.product_id || ""} onValueChange={(v) => pickProduct(i, v)}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Input value={it.description} onChange={(e) => recalc(i, { description: e.target.value })} style={{ fontSize: 16 }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Qty</Label>
          <Input type="number" inputMode="decimal" value={it.quantity} onChange={(e) => recalc(i, { quantity: Number(e.target.value) })} style={{ fontSize: 16 }} />
        </div>
        <div>
          <Label className="text-xs">Unit Price</Label>
          <Input type="number" step="0.01" inputMode="decimal" value={it.unit_price} onChange={(e) => recalc(i, { unit_price: Number(e.target.value) })} style={{ fontSize: 16 }} />
        </div>
        <div>
          <Label className="text-xs">Discount %</Label>
          <Input type="number" inputMode="decimal" value={it.discount} onChange={(e) => recalc(i, { discount: Number(e.target.value) })} style={{ fontSize: 16 }} />
        </div>
        <div className="flex flex-col justify-end">
          <Label className="text-xs">Total</Label>
          <div className="h-11 flex items-center px-3 rounded-md bg-muted font-semibold">{it.total.toFixed(2)}</div>
        </div>
      </div>
    </div>
  ));

  const title = quotation
    ? `Edit Quotation ${quotation.quote_number} v${quotation.version}`
    : "New Quotation";

  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : quotation ? "Update" : "Create"}</Button>
    </>
  );

  return (
    <ResponsiveFormShell open={open} onOpenChange={onOpenChange} title={title} footer={footer}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label>Customer *</Label>
            <Select value={form.customer_id || ""} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger className="h-11"><SelectValue placeholder={customers.length ? "Select customer" : "Loading customers…"} /></SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name || c.contact_person}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valid Until</Label>
            <Input type="date" value={form.valid_until?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} style={{ fontSize: 16 }} className="h-11" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Currency</Label>
            <Select value={form.currency || "NIS"} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NIS">NIS ₪</SelectItem>
                <SelectItem value="USD">USD $</SelectItem>
                <SelectItem value="EUR">EUR €</SelectItem>
                <SelectItem value="JOD">JOD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status || "draft"} onValueChange={(v) => setForm({ ...form, status: v as any })}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quote Date</Label>
            <Input type="date" value={form.quote_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, quote_date: e.target.value })} style={{ fontSize: 16 }} className="h-11" />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Line Items</Label>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, { ...empty }])}>
              <Plus className="h-3 w-3 mr-1" />Add Item
            </Button>
          </div>

          {isMobile ? (
            <div className="space-y-3">{mobileItemCards}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-20">Disc %</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{itemRows}</TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Discount Amount</Label>
            <Input type="number" inputMode="decimal" value={form.discount_amount || 0} onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })} style={{ fontSize: 16 }} className="h-11" />
          </div>
          <div>
            <Label>Tax Amount</Label>
            <Input type="number" inputMode="decimal" value={form.tax_amount || 0} onChange={(e) => setForm({ ...form, tax_amount: Number(e.target.value) })} style={{ fontSize: 16 }} className="h-11" />
          </div>
          <div className="bg-muted rounded p-3 text-right">
            <div className="text-xs text-muted-foreground">Subtotal {subtotal.toFixed(2)}</div>
            <div className="text-lg font-bold">Total: {total.toFixed(2)} {form.currency}</div>
          </div>
        </div>

        <div>
          <Label>Terms & Conditions</Label>
          <Textarea rows={3} value={form.terms || ""} onChange={(e) => setForm({ ...form, terms: e.target.value })} style={{ fontSize: 16 }} />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ fontSize: 16 }} />
        </div>
      </div>
    </ResponsiveFormShell>
  );
};

export default QuotationDialog;
