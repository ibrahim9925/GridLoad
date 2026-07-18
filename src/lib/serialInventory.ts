import { supabase } from "@/integrations/supabase/client";
import { SERIAL_STATUS_INVENTORY, SERIAL_STATUS_SOLD } from "@/lib/serialStatus";

export interface InventorySerial {
  id: string;
  serial_number: string;
  status: string | null;
  sale_id: string | null;
}

export type SerialEntry =
  | { mode: "pick"; serial_id: string; serial_number: string }
  | { mode: "text"; serial_number: string };

export function buildDefaultSerialEntries(quantity: number, availableCount: number): SerialEntry[] {
  const pickerSlots = Math.min(Math.max(availableCount, 0), quantity);
  const entries: SerialEntry[] = [];
  for (let i = 0; i < pickerSlots; i++) {
    entries.push({ mode: "pick", serial_id: "", serial_number: "" });
  }
  for (let i = pickerSlots; i < quantity; i++) {
    entries.push({ mode: "text", serial_number: "" });
  }
  return entries;
}

export function resizeSerialEntries(
  entries: SerialEntry[],
  quantity: number,
  availableCount: number
): SerialEntry[] {
  const next = buildDefaultSerialEntries(quantity, availableCount);
  for (let i = 0; i < Math.min(entries.length, next.length); i++) {
    const prev = entries[i];
    const slot = next[i];
    if (prev.mode === slot.mode) {
      if (prev.mode === "pick" && slot.mode === "pick") {
        next[i] = { mode: "pick", serial_id: prev.serial_id || "", serial_number: prev.serial_number || "" };
      } else if (prev.mode === "text" && slot.mode === "text") {
        next[i] = { mode: "text", serial_number: prev.serial_number || "" };
      }
    }
  }
  return next;
}

export function countFilledSerialEntries(entries: SerialEntry[]): number {
  return entries.filter((e) =>
    e.mode === "pick" ? Boolean(e.serial_id) : Boolean(String(e.serial_number || "").trim())
  ).length;
}

export function computeHasMissingSerials(entries: SerialEntry[], quantity: number): boolean {
  return countFilledSerialEntries(entries) < quantity;
}

export function serialEntriesToNumbers(entries: SerialEntry[]): string[] {
  return entries
    .map((e) => (e.mode === "pick" ? e.serial_number : e.serial_number))
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

export async function fetchAvailableSerials(
  productId: string,
  editingSaleId?: string
): Promise<InventorySerial[]> {
  let query = supabase
    .from("product_serial_numbers")
    .select("id, serial_number, status, sale_id")
    .eq("product_id", productId)
    .order("serial_number");

  if (editingSaleId) {
    query = query.or(
      `and(status.eq.${SERIAL_STATUS_INVENTORY},sale_id.is.null),sale_id.eq.${editingSaleId}`
    );
  } else {
    query = query.eq("status", SERIAL_STATUS_INVENTORY).is("sale_id", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function linkSerialEntriesForLine(params: {
  saleId: string;
  productId: string;
  entries: SerialEntry[];
  soldDate?: string;
}): Promise<{ linked: number; errors: string[] }> {
  const { saleId, productId, entries } = params;
  const soldDate = params.soldDate || new Date().toISOString().split("T")[0];
  let linked = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    if (entry.mode === "pick") {
      if (!entry.serial_id) continue;
      const { error } = await supabase
        .from("product_serial_numbers")
        .update({
          sale_id: saleId,
          status: SERIAL_STATUS_SOLD,
          sold_date: soldDate,
        })
        .eq("id", entry.serial_id)
        .eq("product_id", productId);
      if (error) errors.push(error.message);
      else linked += 1;
      continue;
    }

    const sn = String(entry.serial_number || "").trim();
    if (!sn) continue;

    const { data: existing, error: lookupErr } = await supabase
      .from("product_serial_numbers")
      .select("id, status, sale_id")
      .eq("product_id", productId)
      .eq("serial_number", sn)
      .maybeSingle();

    if (lookupErr) {
      errors.push(lookupErr.message);
      continue;
    }

    if (existing?.id && existing.status === SERIAL_STATUS_INVENTORY) {
      const { error } = await supabase
        .from("product_serial_numbers")
        .update({
          sale_id: saleId,
          status: SERIAL_STATUS_SOLD,
          sold_date: soldDate,
        })
        .eq("id", existing.id)
        .eq("product_id", productId);
      if (error) errors.push(error.message);
      else linked += 1;
    } else if (!existing) {
      const { error } = await supabase.from("product_serial_numbers").insert({
        product_id: productId,
        serial_number: sn,
        status: SERIAL_STATUS_SOLD,
        sale_id: saleId,
        sold_date: soldDate,
        received_date: soldDate,
      });
      if (error) errors.push(error.message);
      else linked += 1;
    } else if (existing.sale_id === saleId && existing.status === SERIAL_STATUS_SOLD) {
      linked += 1;
    } else {
      errors.push(`Serial ${sn} is already assigned elsewhere`);
    }
  }

  return { linked, errors };
}
