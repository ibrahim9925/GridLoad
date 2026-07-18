// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, Save } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
  lineItems: any[];
  onConfirmed: () => void;
}

const parseSerials = (value: string) =>
  (value || "")
    .split(/[\n,]+/)
    .map((serial) => serial.trim())
    .filter(Boolean);

const buildDefaultItems = (lineItems: any[], draftItems: any[] = []) => {
  const draftMap = new Map(draftItems.map((item) => [item.po_item_id, item]));

  return lineItems.map((li) => {
    const draft = draftMap.get(li.id);
    return {
      po_item_id: li.id,
      product_id: li.product_id,
      product_name: li.products?.name || "—",
      quantity_ordered: li.quantity,
      quantity_received: draft?.quantity_received ?? li.quantity,
      condition: draft?.condition || "good",
      serials: draft?.serials || "",
    };
  });
};

const WarehouseArrivalSheet: React.FC<Props> = ({ open, onOpenChange, shipment, lineItems, onConfirmed }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const initializedShipmentRef = useRef<string | null>(null);
  const draftStateRef = useRef({ items: [] as any[], notes: "" });

  const draftKey = shipment?.id ? `warehouse-arrival-draft:${shipment.id}` : null;

  const persistDraft = useCallback((showToast = false) => {
    if (!draftKey || typeof window === "undefined") return false;

    const payload = {
      shipment_id: shipment?.id,
      shipment_number: shipment?.shipment_number,
      items: draftStateRef.current.items,
      notes: draftStateRef.current.notes,
      saved_at: new Date().toISOString(),
    };

    window.localStorage.setItem(draftKey, JSON.stringify(payload));
    setDraftSavedAt(payload.saved_at);
    setDraftLoaded(true);

    if (showToast) {
      toast({ title: "Draft saved", description: "Your serial number progress is محفوظ locally for this shipment." });
    }

    return true;
  }, [draftKey, shipment?.id, shipment?.shipment_number, toast]);

  const clearDraft = useCallback(() => {
    if (!draftKey || typeof window === "undefined") return;
    window.localStorage.removeItem(draftKey);
    setDraftSavedAt(null);
    setDraftLoaded(false);
  }, [draftKey]);

  useEffect(() => {
    draftStateRef.current = { items, notes };
  }, [items, notes]);

  useEffect(() => {
    if (!open || !shipment?.id || !lineItems?.length) return;
    if (initializedShipmentRef.current === shipment.id) return;

    let restoredItems: any[] = [];
    let restoredNotes = "";
    let restoredSavedAt: string | null = null;

    if (draftKey && typeof window !== "undefined") {
      const rawDraft = window.localStorage.getItem(draftKey);
      if (rawDraft) {
        try {
          const parsedDraft = JSON.parse(rawDraft);
          restoredItems = parsedDraft?.items || [];
          restoredNotes = parsedDraft?.notes || "";
          restoredSavedAt = parsedDraft?.saved_at || null;
        } catch (error) {
          console.error("Failed to parse warehouse arrival draft", error);
        }
      }
    }

    const nextItems = buildDefaultItems(lineItems, restoredItems);
    setItems(nextItems);
    setNotes(restoredNotes);
    setDraftSavedAt(restoredSavedAt);
    setDraftLoaded(Boolean(restoredSavedAt));
    initializedShipmentRef.current = shipment.id;
  }, [open, shipment?.id, draftKey, lineItems]);

  useEffect(() => {
    if (open) return;
    initializedShipmentRef.current = null;
  }, [open]);

  const updateItem = useCallback((idx: number, patch: Record<string, any>, persist = false) => {
    setItems((current) => {
      const next = current.map((item, itemIdx) => (itemIdx === idx ? { ...item, ...patch } : item));
      draftStateRef.current = { items: next, notes: draftStateRef.current.notes };
      if (persist) {
        requestAnimationFrame(() => persistDraft(false));
      }
      return next;
    });
  }, [persistDraft]);

  const updateNotes = useCallback((value: string, persist = false) => {
    setNotes(value);
    draftStateRef.current = { items: draftStateRef.current.items, notes: value };
    if (persist) {
      requestAnimationFrame(() => persistDraft(false));
    }
  }, [persistDraft]);

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity_received) || 0), 0),
    [items]
  );

  const enteredSerialCount = useMemo(
    () => items.reduce((sum, item) => sum + parseSerials(item.serials).length, 0),
    [items]
  );

  const missingSerialCount = Math.max(totalUnits - enteredSerialCount, 0);
  const progressValue = totalUnits > 0 ? Math.min((enteredSerialCount / totalUnits) * 100, 100) : 0;

  const confirm = async () => {
    if (totalUnits <= 0) {
      toast({ variant: "destructive", title: "Enter received quantities", description: "Set received quantity for at least one product before confirming." });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("confirm_warehouse_arrival", {
        p_shipment_id: shipment.id,
        p_items: items.map((item) => ({
          po_item_id: item.po_item_id,
          product_id: item.product_id,
          quantity_received: Number(item.quantity_received) || 0,
          condition: item.condition,
        })),
        p_notes: notes || null,
      });
      if (error) throw error;
      const hadVariance = (data as any)?.has_variance;

      const serialPayload = items
        .map((item) => ({
          product_id: item.product_id,
          serials: parseSerials(item.serials),
        }))
        .filter((item) => item.serials.length > 0);

      let snMsg = "";
      if (serialPayload.length > 0) {
        const { data: snRes, error: snErr } = await (supabase as any).rpc("register_shipment_serials", {
          p_shipment_id: shipment.id,
          p_items: serialPayload,
        });
        if (snErr) throw snErr;
        snMsg = ` · ${snRes?.inserted ?? 0} serials registered${snRes?.duplicates_skipped ? `, ${snRes.duplicates_skipped} dup skipped` : ""}`;
      }

      clearDraft();
      const missingNote = missingSerialCount > 0
        ? ` · ${missingSerialCount} unit${missingSerialCount === 1 ? "" : "s"} without serial numbers (add at sale)`
        : "";
      toast({
        title: "Arrival confirmed — stock updated",
        description: (hadVariance ? "⚠️ Variance flagged" : `${totalUnits} units added to inventory`) + snMsg + missingNote,
      });
      onOpenChange(false);
      onConfirmed();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!shipment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto rounded-t-2xl p-0">
        <div className="sticky top-0 bg-background z-10 px-5 pt-5 pb-3 border-b space-y-3">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <span>Warehouse Arrival — {shipment.shipment_number}</span>
              {draftLoaded && <Badge variant="secondary">Draft</Badge>}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{enteredSerialCount} of {totalUnits} serial numbers entered</span>
              {draftSavedAt && <span className="text-xs text-muted-foreground">Saved {new Date(draftSavedAt).toLocaleString()}</span>}
            </div>
            <Progress value={progressValue} max={100} className="h-2" />
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 pb-48">
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-900">Serial entry is now kept in stable draft state for this shipment and restored automatically after refresh.</p>
          </div>

          {items.map((it, idx) => {
            const itemSerialCount = parseSerials(it.serials).length;
            const serialsComplete = itemSerialCount === (Number(it.quantity_received) || 0);

            return (
              <div key={it.po_item_id} className="border rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{it.product_name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">Ordered: {it.quantity_ordered}</Badge>
                    <Badge variant={serialsComplete ? "default" : "secondary"}>
                      {itemSerialCount}/{Number(it.quantity_received) || 0} serials
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Received Quantity</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="text-base h-12 text-lg font-semibold"
                    value={it.quantity_received}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateItem(idx, { quantity_received: value });
                    }}
                    onBlur={() => persistDraft(false)}
                  />
                </div>

                {it.quantity_received !== it.quantity_ordered && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Variance: {it.quantity_received - it.quantity_ordered} units
                  </p>
                )}

                <div>
                  <Label className="text-xs">Serial Numbers (one per line or comma-separated)</Label>
                  <Textarea
                    rows={Math.max(3, Math.min((Number(it.quantity_received) || 0) + 1, 8))}
                    className="font-mono text-sm"
                    placeholder={`SN-001\nSN-002\nSN-003`}
                    value={it.serials}
                    onChange={(e) => updateItem(idx, { serials: e.target.value }, true)}
                    onBlur={() => persistDraft(false)}
                  />
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span>Registered as available inventory; linked to sale when sold.</span>
                    <span className={serialsComplete ? "text-primary" : "text-amber-700"}>
                      {serialsComplete ? "Ready" : `${Math.max((Number(it.quantity_received) || 0) - itemSerialCount, 0)} remaining`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div>
            <Label>Condition Notes</Label>
            <Textarea
              className="text-base"
              rows={3}
              value={notes}
              onChange={(e) => updateNotes(e.target.value, true)}
              onBlur={() => persistDraft(false)}
              placeholder="Damage, missing items, etc."
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Save draft with partial serials anytime. Confirm arrival once received quantities are correct — serial numbers are optional here and enforced at sale.
            </p>
          </div>

          {missingSerialCount > 0 && (
            <p className="text-xs text-center text-amber-700">
              {missingSerialCount} of {totalUnits} units missing serial numbers — these can be added later or at time of sale
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-14 text-base font-semibold"
              disabled={saving || totalUnits === 0}
              onClick={() => persistDraft(true)}
            >
              <Save className="h-5 w-5 mr-2" />
              Save Draft
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={saving || totalUnits === 0} className="h-14 text-base font-semibold">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><PackageCheck className="h-5 w-5 mr-2" />Confirm Arrival</>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm warehouse arrival?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will add <strong>{totalUnits} units</strong> across {items.length} product{items.length === 1 ? "" : "s"} to inventory
                    {enteredSerialCount > 0 ? ` and register ${enteredSerialCount} serial number${enteredSerialCount === 1 ? "" : "s"}` : ""}
                    {missingSerialCount > 0 ? ` (${missingSerialCount} without serials — can be added at sale)` : ""}
                    , and recalculate landed cost. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirm} className="h-12">Yes, confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WarehouseArrivalSheet;
