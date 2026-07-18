// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  fetchSelectableSerials,
  type InventorySerial,
} from "@/hooks/useInStockSerials";
import {
  type SerialEntry,
  buildDefaultSerialEntries,
  resizeSerialEntries,
  computeHasMissingSerials,
} from "@/lib/serialInventory";

interface SaleLineSerialSelectorProps {
  productId: string;
  productName: string;
  quantity: number;
  serialEntries: SerialEntry[];
  editingSaleId?: string;
  excludeSerialIds?: string[];
  onChange: (entries: SerialEntry[], hasMissing: boolean) => void;
}

const NONE = "__none__";

const SaleLineSerialSelector = ({
  productId,
  productName,
  quantity,
  serialEntries,
  editingSaleId,
  excludeSerialIds = [],
  onChange,
}: SaleLineSerialSelectorProps) => {
  const [options, setOptions] = useState<InventorySerial[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!productId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchSelectableSerials(productId, editingSaleId);
        if (!cancelled) setOptions(rows);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e.message || "Failed to load serial numbers");
          setOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, editingSaleId]);

  const availableCount = options.length;

  const entries = useMemo(() => {
    if (serialEntries.length === quantity) return serialEntries;
    if (serialEntries.length === 0) return buildDefaultSerialEntries(quantity, availableCount);
    return resizeSerialEntries(serialEntries, quantity, availableCount);
  }, [serialEntries, quantity, availableCount]);

  useEffect(() => {
    if (serialEntries.length !== entries.length) {
      onChange(entries, computeHasMissingSerials(entries, quantity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length, quantity]);

  const pickerSlotCount = Math.min(availableCount, quantity);
  const missingCount = quantity - entries.filter((e) =>
    e.mode === "pick" ? Boolean(e.serial_id) : Boolean(String(e.serial_number || "").trim())
  ).length;

  const pickedIdsElsewhere = (slotIndex: number) => {
    const ids = new Set<string>();
    entries.forEach((e, i) => {
      if (i !== slotIndex && e.mode === "pick" && e.serial_id) ids.add(e.serial_id);
    });
    return ids;
  };

  const optionsForPickSlot = (slotIndex: number) => {
    const currentId = entries[slotIndex]?.mode === "pick" ? entries[slotIndex].serial_id : "";
    const pickedElsewhere = pickedIdsElsewhere(slotIndex);
    return options.filter((opt) => {
      if (excludeSerialIds.includes(opt.id) && opt.id !== currentId) return false;
      if (pickedElsewhere.has(opt.id)) return false;
      return true;
    });
  };

  const emitChange = (next: SerialEntry[]) => {
    onChange(next, computeHasMissingSerials(next, quantity));
  };

  const handlePickChange = (slotIndex: number, value: string) => {
    const next = [...entries];
    const serialId = value === NONE ? "" : value;
    const serialNumber = serialId
      ? options.find((o) => o.id === serialId)?.serial_number || ""
      : "";
    next[slotIndex] = { mode: "pick", serial_id: serialId, serial_number: serialNumber };
    emitChange(next);
  };

  const handleTextChange = (slotIndex: number, value: string) => {
    const next = [...entries];
    next[slotIndex] = { mode: "text", serial_number: value };
    emitChange(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading serial numbers…
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <Label className="text-xs font-semibold">
        Serial numbers ({quantity} unit{quantity !== 1 ? "s" : ""})
      </Label>
      <p className="text-[11px] text-muted-foreground">
        Pick from warehouse stock when available, or enter serials manually at the counter.
      </p>

      {availableCount === 0 && quantity > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            No warehouse serials on file for {productName} — enter serial numbers manually or leave blank to save without them.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map((entry, idx) => {
          const isPicker = idx < pickerSlotCount && entry.mode === "pick";
          return (
            <div key={idx} className="flex items-center gap-2">
              <Label className="text-xs w-12 shrink-0 text-muted-foreground">
                SN-{idx + 1}
              </Label>
              {isPicker ? (
                <Select
                  value={(entry as { serial_id: string }).serial_id || NONE}
                  onValueChange={(v) => handlePickChange(idx, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select from stock…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground">— Not selected —</span>
                    </SelectItem>
                    {optionsForPickSlot(idx).map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        <span className="font-mono text-sm">{opt.serial_number}</span>
                        {opt.sale_id === editingSaleId && editingSaleId && (
                          <span className="text-xs text-muted-foreground ml-2">(on this sale)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-9 font-mono text-sm"
                  placeholder="Enter serial manually…"
                  value={entry.mode === "text" ? entry.serial_number : ""}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>

      {missingCount > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            {missingCount} serial{missingCount !== 1 ? "s" : ""} not assigned — sale can still be saved; assign later from sale details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SaleLineSerialSelector;
