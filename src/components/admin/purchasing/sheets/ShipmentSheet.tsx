// @ts-nocheck
import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poId: string;
  onSaved: () => void;
}

const ShipmentSheet: React.FC<Props> = ({ open, onOpenChange, poId, onSaved }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipment_date: new Date().toISOString().split("T")[0],
    expected_arrival_date: "",
    shipping_method: "sea",
    tracking_number: "",
    freight_estimate: 0,
    clearance_estimate: 0,
  });

  const submit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("po_shipments").insert({
        purchase_order_id: poId,
        status: "in_transit",
        shipment_date: form.shipment_date || null,
        expected_arrival_date: form.expected_arrival_date || null,
        shipping_method: form.shipping_method,
        tracking_number: form.tracking_number || null,
        freight_estimate: form.freight_estimate || 0,
        clearance_estimate: form.clearance_estimate || 0,
      });
      if (error) throw error;
      await supabase
        .from("purchase_orders")
        .update({ status: "in_transit" })
        .eq("id", poId)
        .in("status", ["draft", "ordered", "confirmed"]);
      toast({ title: "Shipment created" });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88dvh] overflow-y-auto rounded-t-2xl p-0">
        <div className="sticky top-0 bg-background z-10 px-5 pt-5 pb-3 border-b">
          <SheetHeader><SheetTitle>Create Shipment</SheetTitle></SheetHeader>
        </div>
        <div className="px-5 py-4 space-y-4 pb-32">
          <div>
            <Label>Shipment Date</Label>
            <Input type="date" className="text-base h-12" value={form.shipment_date} onChange={(e) => setForm({ ...form, shipment_date: e.target.value })} />
          </div>
          <div>
            <Label>Expected Arrival</Label>
            <Input type="date" className="text-base h-12" value={form.expected_arrival_date} onChange={(e) => setForm({ ...form, expected_arrival_date: e.target.value })} />
          </div>
          <div>
            <Label>Shipping Method</Label>
            <Select value={form.shipping_method} onValueChange={(v) => setForm({ ...form, shipping_method: v })}>
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sea">Sea Freight</SelectItem>
                <SelectItem value="air">Air Freight</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="courier">Courier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tracking Number</Label>
            <Input className="text-base h-12" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
          </div>
          <div>
            <Label>Freight Estimate (NIS)</Label>
            <Input type="number" inputMode="decimal" className="text-base h-12" value={form.freight_estimate || ""} onChange={(e) => setForm({ ...form, freight_estimate: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Clearance Estimate (NIS)</Label>
            <Input type="number" inputMode="decimal" className="text-base h-12" value={form.clearance_estimate || ""} onChange={(e) => setForm({ ...form, clearance_estimate: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={submit} disabled={saving} className="w-full h-14 text-base font-semibold">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Shipment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShipmentSheet;
