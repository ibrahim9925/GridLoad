// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Ship, MapPin, Warehouse, CheckCircle2, Circle, Loader2, Plus } from "lucide-react";
import { formatNIS, formatMoney } from "@/utils/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
  onAddPayment: () => void;
  onConfirmArrival: () => void;
  onChanged: () => void;
}

const STAGES = [
  { key: "ordered", label: "Ordered", icon: Circle },
  { key: "in_transit", label: "In Transit", icon: Ship },
  { key: "at_port", label: "At Port", icon: MapPin },
  { key: "arrived", label: "Warehouse Arrival", icon: Warehouse },
];

const ShipmentDetailSheet: React.FC<Props> = ({ open, onOpenChange, shipment, onAddPayment, onConfirmArrival, onChanged }) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!open || !shipment?.id) return;
    supabase
      .from("po_payments_out")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("payment_date", { ascending: false })
      .then(({ data }) => setPayments(data || []));
  }, [open, shipment?.id]);

  if (!shipment) return null;

  const currentStageIdx = STAGES.findIndex((s) => s.key === shipment.status);

  const markAtPort = async () => {
    setActing(true);
    try {
      const { error } = await supabase
        .from("po_shipments")
        .update({ status: "at_port", actual_arrival_date: new Date().toISOString().split("T")[0] })
        .eq("id", shipment.id);
      if (error) throw error;
      await supabase.from("purchase_orders").update({ status: "at_port" }).eq("id", shipment.purchase_order_id);
      toast({ title: "Marked at port" });
      onChanged();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setActing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] overflow-y-auto rounded-t-2xl p-0">
        <div className="sticky top-0 bg-background z-10 px-5 pt-5 pb-3 border-b">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              {shipment.shipment_number}
            </SheetTitle>
          </SheetHeader>
          {shipment.tracking_number && (
            <p className="text-xs text-muted-foreground mt-1">Tracking: {shipment.tracking_number}</p>
          )}
        </div>

        <div className="px-5 py-4 space-y-6 pb-32">
          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Status Timeline</h3>
            <div className="space-y-2">
              {STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const done = idx <= currentStageIdx;
                const active = idx === currentStageIdx;
                return (
                  <div key={stage.key} className={`flex items-center gap-3 p-3 rounded-lg border ${active ? "bg-primary/5 border-primary" : done ? "bg-muted" : ""}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stage.label}</p>
                      {stage.key === "in_transit" && shipment.shipment_date && (
                        <p className="text-xs text-muted-foreground">{shipment.shipment_date}</p>
                      )}
                      {stage.key === "at_port" && shipment.actual_arrival_date && (
                        <p className="text-xs text-muted-foreground">{shipment.actual_arrival_date}</p>
                      )}
                      {stage.key === "arrived" && shipment.warehouse_arrival_date && (
                        <p className="text-xs text-muted-foreground">{shipment.warehouse_arrival_date}</p>
                      )}
                    </div>
                    {active && <Badge>Current</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked payments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Linked Payments</h3>
              <Button size="sm" variant="outline" onClick={onAddPayment} className="h-10">
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No payments linked to this shipment</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="border rounded-lg p-3 flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm capitalize">{p.payment_type}</p>
                      <p className="text-xs text-muted-foreground">{p.payment_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(p.amount || 0, p.original_currency || "NIS")}</p>
                      <p className="text-[10px] text-muted-foreground">≈ {formatNIS(p.nis_equivalent || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          {shipment.status === "in_transit" && (
            <Button onClick={markAtPort} disabled={acting} className="w-full h-14 text-base font-semibold">
              {acting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MapPin className="h-5 w-5 mr-2" />Mark Arrived at Port</>}
            </Button>
          )}
          {(shipment.status === "at_port" || shipment.status === "in_transit") && (
            <Button onClick={onConfirmArrival} variant={shipment.status === "at_port" ? "default" : "outline"} className="w-full h-14 text-base font-semibold">
              <Warehouse className="h-5 w-5 mr-2" />Confirm Warehouse Arrival
            </Button>
          )}
          {shipment.status === "arrived" && (
            <p className="text-sm text-center text-muted-foreground py-3">
              ✓ Stock updated on {shipment.warehouse_arrival_date}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShipmentDetailSheet;
