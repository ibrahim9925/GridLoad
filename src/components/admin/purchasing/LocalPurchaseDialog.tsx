// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

interface LineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const LocalPurchaseDialog: React.FC<Props> = ({ open, onOpenChange, onSaved }) => {
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "bank_transfer">("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [saving, setSaving] = useState(false);

  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0),
    [items]
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSupplierId(""); setNewSupplierName(""); setItems([]);
    setPaymentMethod("cash"); setPaymentAmount(""); setBankAccountId("");
    (async () => {
      const [s, p, b] = await Promise.all([
        supabase.from("suppliers").select("id, name").order("name"),
        supabase.from("products").select("id, name, current_stock").order("name"),
        supabase.from("bank_accounts").select("id, name, currency").eq("is_active", true).order("name"),
      ]);
      setSuppliers(s.data || []);
      setProducts(p.data || []);
      setBankAccounts(b.data || []);
    })();
  }, [open]);

  useEffect(() => { setPaymentAmount(total ? total.toFixed(2) : ""); }, [total]);

  const addLine = () => setItems(prev => [
    ...prev,
    { id: crypto.randomUUID(), product_id: "", product_name: "", quantity: 1, unit_price: 0 },
  ]);

  const updateLine = (id: string, patch: Partial<LineItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeLine = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const canNext1 = (supplierId || newSupplierName.trim()) && items.length > 0
    && items.every(i => i.product_id && i.quantity > 0 && i.unit_price >= 0);
  const canNext2 = Number(paymentAmount) > 0 && (paymentMethod === "cash" || paymentMethod === "check" || bankAccountId);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // 1. Create supplier if needed
      let sid = supplierId;
      if (!sid && newSupplierName.trim()) {
        const { data, error } = await supabase
          .from("suppliers")
          .insert({ name: newSupplierName.trim(), is_active: true })
          .select("id").single();
        if (error) throw error;
        sid = data.id;
      }

      // 2. Create PO (local, received)
      const orderNumber = `LP-${Date.now().toString().slice(-8)}`;
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id: sid,
          order_number: orderNumber,
          status: "received",
          purchase_type: "local",
          total_amount: total,
          currency: "NIS",
          order_date: new Date().toISOString(),
          received_date: new Date().toISOString(),
          payment_status: "paid",
        })
        .select("id").single();
      if (poErr) throw poErr;

      // 3. Insert items
      const itemRows = items.map(i => ({
        purchase_order_id: po.id,
        product_id: i.product_id,
        quantity: i.quantity,
        received_quantity: i.quantity,
        unit_cost: i.unit_price,
        total: i.quantity * i.unit_price,
        status: "received",
      }));
      const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      // 4. Update stock immediately
      for (const i of items) {
        const prod = products.find(p => p.id === i.product_id);
        const newStock = (Number(prod?.current_stock) || 0) + Number(i.quantity);
        await supabase.from("products").update({ current_stock: newStock }).eq("id", i.product_id);
        await supabase.from("stock_movements").insert({
          product_id: i.product_id,
          movement_type: "in",
          quantity: i.quantity,
          reference_type: "local_purchase",
          reference_id: po.id,
          notes: `Local purchase ${orderNumber}`,
        }).then(() => {}).catch(() => {});
      }

      // 5. Post payment to bank ledger
      const amt = Number(paymentAmount);
      if (amt > 0) {
        if (paymentMethod === "bank_transfer" && bankAccountId) {
          await supabase.from("bank_ledger").insert({
            bank_account_id: bankAccountId,
            transaction_type: "outbound",
            amount: -Math.abs(amt),
            currency: "NIS",
            purpose: `Local purchase ${orderNumber}`,
            reference_number: orderNumber,
          });
        } else if (paymentMethod === "check") {
          await supabase.from("checks").insert({
            amount: amt,
            currency: "NIS",
            status: "pending",
            check_number: orderNumber,
            notes: `Local purchase ${orderNumber}`,
            direction: "outgoing",
          }).then(() => {}).catch(() => {});
        }
        // cash → recorded on PO payment status, no bank ledger row
      }

      toast.success("Local purchase recorded — stock updated");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error("Local purchase error", e);
      toast.error(e?.message || "Failed to save local purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Local Purchase — Step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setNewSupplierName(""); }}>
                <SelectTrigger><SelectValue placeholder="Select existing supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">or type a new supplier name</div>
              <Input
                placeholder="New supplier name"
                value={newSupplierName}
                onChange={(e) => { setNewSupplierName(e.target.value); if (e.target.value) setSupplierId(""); }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet</p>}
              {items.map(line => (
                <Card key={line.id}><CardContent className="p-3 space-y-2">
                  <Select value={line.product_id} onValueChange={(v) => {
                    const p = products.find(x => x.id === v);
                    updateLine(line.id, { product_id: v, product_name: p?.name || "" });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min="1" value={line.quantity}
                        onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit ₪</Label>
                      <Input type="number" min="0" step="0.01" value={line.unit_price}
                        onChange={(e) => updateLine(line.id, { unit_price: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-end justify-end">
                      <Button size="icon" variant="ghost" onClick={() => removeLine(line.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium">
                    ₪ {(line.quantity * line.unit_price).toFixed(2)}
                  </div>
                </CardContent></Card>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">₪ {total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₪)</Label>
              <Input type="number" min="0" step="0.01" value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            {paymentMethod === "bank_transfer" && (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Supplier:</span> {
                supplierId ? suppliers.find(s => s.id === supplierId)?.name : newSupplierName
              }</div>
              <div className="border-t pt-2 space-y-1">
                {items.map(i => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.product_name} × {i.quantity}</span>
                    <span>₪ {(i.quantity * i.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span><span>₪ {total.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <span className="text-muted-foreground">Payment:</span> {paymentMethod} — ₪ {Number(paymentAmount).toFixed(2)}
                {paymentMethod === "bank_transfer" && bankAccountId && (
                  <> from {bankAccounts.find(b => b.id === bankAccountId)?.name}</>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                On confirm: stock updates immediately, payment posts to the ledger, no shipment created.
              </p>
            </CardContent></Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canNext1 : !canNext2}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button type="button" onClick={handleConfirm} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Confirm Purchase
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocalPurchaseDialog;
