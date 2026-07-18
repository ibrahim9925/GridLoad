// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SaleLineSerialSelector from "./SaleLineSerialSelector";
import {
  type SerialEntry,
  buildDefaultSerialEntries,
  computeHasMissingSerials,
  linkSerialEntriesForLine,
  serialEntriesToNumbers,
} from "@/lib/serialInventory";

interface LineState {
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  warrantyMonths: number | null;
  serialEntries: SerialEntry[];
  hasMissing: boolean;
}

interface AssignSerialsDialogProps {
  saleId: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const AssignSerialsDialog = ({ saleId, open, onClose, onSaved }: AssignSerialsDialogProps) => {
  const [lines, setLines] = useState<LineState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !saleId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [{ data: items, error }, { data: linked, error: serialErr }] = await Promise.all([
          supabase
            .from("sale_items")
            .select("id, product_id, quantity, has_missing_serials, products(name, warranty_months)")
            .eq("sale_id", saleId),
          supabase
            .from("product_serial_numbers")
            .select("id, product_id, serial_number")
            .eq("sale_id", saleId)
            .order("serial_number"),
        ]);
        if (error) throw error;
        if (serialErr) throw serialErr;
        if (cancelled) return;

        const byProduct: Record<string, { id: string; serial_number: string }[]> = {};
        (linked || []).forEach((s) => {
          if (!byProduct[s.product_id]) byProduct[s.product_id] = [];
          byProduct[s.product_id].push(s);
        });
        const cursor: Record<string, number> = {};

        const next: LineState[] = (items || []).map((item: any) => {
          const qty = Number(item.quantity) || 0;
          const pool = byProduct[item.product_id] || [];
          const start = cursor[item.product_id] || 0;
          const slice = pool.slice(start, start + qty);
          cursor[item.product_id] = start + slice.length;

          const serialEntries: SerialEntry[] = slice.map((s) => ({
            mode: "pick" as const,
            serial_id: s.id,
            serial_number: s.serial_number,
          }));
          for (let i = slice.length; i < qty; i++) {
            serialEntries.push({ mode: "text", serial_number: "" });
          }

          const entries = serialEntries.length ? serialEntries : buildDefaultSerialEntries(qty, 0);
          return {
            saleItemId: item.id,
            productId: item.product_id,
            productName: item.products?.name || "Product",
            quantity: qty,
            warrantyMonths: item.products?.warranty_months ?? null,
            serialEntries: entries,
            hasMissing: item.has_missing_serials ?? computeHasMissingSerials(entries, qty),
          };
        });

        setLines(next);
      } catch (e: any) {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, saleId, toast]);

  const getExcludedSerialIds = (lineIndex: number) =>
    lines.flatMap((line, i) =>
      i !== lineIndex
        ? line.serialEntries
            .filter((e) => e.mode === "pick" && e.serial_id)
            .map((e) => e.serial_id!)
        : []
    );

  const handleLineChange = (lineIndex: number, entries: SerialEntry[], hasMissing: boolean) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === lineIndex ? { ...line, serialEntries: entries, hasMissing } : line
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .select("customer_id, sale_date")
        .eq("id", saleId)
        .single();
      if (saleErr) throw saleErr;

      const soldDate = sale.sale_date || new Date().toISOString().split("T")[0];
      const warrantyRows: any[] = [];

      for (const line of lines) {
        const { error: flagErr } = await supabase
          .from("sale_items")
          .update({ has_missing_serials: line.hasMissing })
          .eq("id", line.saleItemId);
        if (flagErr) throw flagErr;

        const { errors } = await linkSerialEntriesForLine({
          saleId,
          productId: line.productId,
          entries: line.serialEntries,
          soldDate,
        });
        if (errors.length) {
          toast({
            title: "Some serials could not be linked",
            description: errors.slice(0, 3).join("; "),
            variant: "destructive",
          });
        }

        if (line.warrantyMonths && Number(line.warrantyMonths) > 0) {
          for (const sn of serialEntriesToNumbers(line.serialEntries)) {
            const start = new Date(soldDate);
            const end = new Date(start);
            end.setMonth(end.getMonth() + Number(line.warrantyMonths));
            warrantyRows.push({
              sale_id: saleId,
              product_id: line.productId,
              customer_id: sale.customer_id,
              serial_number: sn,
              warranty_type: "manufacturer",
              warranty_period_months: Number(line.warrantyMonths),
              warranty_start_date: soldDate,
              warranty_end_date: end.toISOString().split("T")[0],
              start_date: soldDate,
              end_date: end.toISOString().split("T")[0],
              expiry_date: end.toISOString().split("T")[0],
              status: "active",
              notes: `Assigned from sale ${saleId}`,
            });
          }
        }
      }

      if (warrantyRows.length > 0) {
        await supabase.from("warranties").insert(warrantyRows);
      }

      toast({ title: "Serials updated" });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign serial numbers</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items on this sale.</p>
        ) : (
          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div key={line.saleItemId} className="border rounded-lg p-3">
                <div className="font-medium text-sm mb-2">{line.productName}</div>
                <SaleLineSerialSelector
                  productId={line.productId}
                  productName={line.productName}
                  quantity={line.quantity}
                  serialEntries={line.serialEntries}
                  editingSaleId={saleId}
                  excludeSerialIds={getExcludedSerialIds(idx)}
                  onChange={(entries, hasMissing) => handleLineChange(idx, entries, hasMissing)}
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save serials
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignSerialsDialog;
