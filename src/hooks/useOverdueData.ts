// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OverdueInvoice = {
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  sale_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount_nis: number;
  paid_amount_nis: number;
  outstanding_nis: number;
  days_overdue: number;
  payment_terms_days: number;
};

export const useOverdueInvoices = () =>
  useQuery({
    queryKey: ["overdue_invoices"],
    queryFn: async (): Promise<OverdueInvoice[]> => {
      const { data, error } = await (supabase as any).rpc("get_overdue_invoices");
      if (error) throw error;
      return (data || []) as OverdueInvoice[];
    },
    staleTime: 30_000,
  });

export const useOverdueByCustomer = () => {
  const q = useOverdueInvoices();
  const byCustomer = new Map<string, { total: number; oldestDays: number; count: number }>();
  (q.data || []).forEach((r) => {
    const cur = byCustomer.get(r.customer_id) || { total: 0, oldestDays: 0, count: 0 };
    cur.total += Number(r.outstanding_nis || 0);
    cur.oldestDays = Math.max(cur.oldestDays, r.days_overdue);
    cur.count += 1;
    byCustomer.set(r.customer_id, cur);
  });
  return { ...q, byCustomer };
};

export const useOverdueSummary = () =>
  useQuery({
    queryKey: ["overdue_summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_overdue_summary");
      if (error) throw error;
      return data as { total_overdue_count: number; total_overdue_amount_nis: number; oldest_overdue_days: number };
    },
    staleTime: 30_000,
  });
