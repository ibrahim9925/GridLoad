// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Quotation {
  id: string;
  quote_number: string;
  version: number;
  customer_id: string | null;
  quote_date: string;
  valid_until: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  net_amount: number;
  currency: string;
  exchange_rate: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  terms: string | null;
  notes: string | null;
  converted_to_sale_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  customer?: { id: string; contact_person: string | null; company_name: string | null; email: string | null; phone: string | null; address: string | null } | null;
}

export interface QuotationItem {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export const useQuotationsData = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Auto-expire stale quotations server-side (best-effort, do not block on failure)
      try { await (supabase as any).rpc("mark_expired_quotations"); } catch (e) { console.warn("mark_expired_quotations skipped:", e); }

      const { data, error: qErr } = await supabase
        .from("quotations")
        .select("*, customer:customers(id, contact_person, company_name, email, phone, address)")
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      setQuotations(Array.isArray(data) ? (data as any) : []);
    } catch (err: any) {
      const msg = err?.message || "Failed to load quotations";
      console.error("useQuotationsData fetch error:", err);
      setError(msg);
      setQuotations([]); // never undefined
      toast({ variant: "destructive", title: "Failed to load quotations", description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const saveQuotation = async (
    payload: Partial<Quotation>,
    items: QuotationItem[],
    existingId?: string
  ): Promise<string | null> => {
    try {
      const subtotal = items.reduce((s, i) => s + Number(i.total || 0), 0);
      const total = subtotal - Number(payload.discount_amount || 0) + Number(payload.tax_amount || 0);
      console.log("[saveQuotation] start", { existingId, payload, items, subtotal, total });

      // Strip joined/computed fields that aren't real columns to avoid PostgREST errors
      const { customer, id: _id, created_at, updated_at, quote_number: _qn, version: _ver, subtotal: _sub, total_amount: _ta, net_amount: _na, quote_date: _qd, converted_to_sale_id: _cv, ...safePayload } = payload as any;

      let id = existingId;
      if (existingId) {
        const { data: existing } = await supabase.from("quotations").select("status, version").eq("id", existingId).single();
        const bump = existing && ["sent", "accepted", "rejected"].includes((existing as any).status);
        const { error } = await supabase
          .from("quotations")
          .update({
            ...safePayload,
            subtotal,
            total_amount: total,
            net_amount: total,
            version: bump ? ((existing as any).version || 1) + 1 : (existing as any).version || 1,
            status: bump ? "draft" : (safePayload.status as any) || (existing as any).status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
        if (error) { console.error("[saveQuotation] update error", error); throw error; }
      } else {
        const { data: qnum, error: qErr } = await (supabase as any).rpc("generate_quote_number");
        if (qErr) { console.error("[saveQuotation] generate_quote_number error", qErr); throw qErr; }
        const { data: { user } } = await supabase.auth.getUser();
        const insertRow = {
          ...safePayload,
          quote_number: qnum,
          subtotal,
          total_amount: total,
          net_amount: total,
          version: 1,
          created_by: user?.id,
        };
        console.log("[saveQuotation] inserting header", insertRow);
        const { data, error } = await supabase
          .from("quotations")
          .insert(insertRow)
          .select("id")
          .single();
        if (error) { console.error("[saveQuotation] insert quotations error", error); throw error; }
        id = (data as any).id;
      }

      await supabase.from("quotation_items").delete().eq("quotation_id", id);
      if (items.length) {
        const toInsert = items.map((it) => ({
          quotation_id: id,
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount || 0,
          total: it.total,
        }));
        console.log("[saveQuotation] inserting items", toInsert);
        const { error: itErr } = await supabase.from("quotation_items").insert(toInsert);
        if (itErr) { console.error("[saveQuotation] insert items error", itErr); throw itErr; }
      }

      toast({ title: existingId ? "Quotation updated" : "Quotation created" });
      await fetchQuotations();
      return id || null;
    } catch (err: any) {
      console.error("[saveQuotation] FAILED", err);
      toast({ variant: "destructive", title: "Save failed", description: err?.message || err?.details || err?.hint || "Unknown error" });
      return null;
    }
  };

  const deleteQuotation = async (id: string) => {
    try {
      const { error } = await supabase.from("quotations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Deleted" });
      fetchQuotations();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err?.message || "Unknown error" });
    }
  };

  const convertToInvoice = async (id: string): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any).rpc("convert_quotation_to_invoice", { p_quotation_id: id });
      if (error) throw error;
      toast({ title: "Converted to invoice", description: "Sale created successfully" });
      await fetchQuotations();
      return data as string;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Convert failed", description: err?.message || "Unknown error" });
      return null;
    }
  };

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  return { quotations, isLoading, error, saveQuotation, deleteQuotation, convertToInvoice, refetch: fetchQuotations };
};
