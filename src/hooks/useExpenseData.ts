// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRealTimeData } from "@/hooks/useRealTimeData";

interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
  notes: string | null;
  receipt_url: string | null;
  staff_id: string | null;
  shipment_id: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
}

interface ExpenseStats {
  totalAmount: number;
  expenseCount: number;
  categoriesCount: number;
  avgExpense: number;
}

export const useExpenseData = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    totalAmount: 0,
    expenseCount: 0,
    categoriesCount: 0,
    avgExpense: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Array<{ id: string; full_name: string }>>([]);
  const { toast } = useToast();

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const staffIds = Array.from(new Set(rows.map((r: any) => r.staff_id).filter(Boolean)));
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffRows } = await supabase
          .from("staff")
          .select("id, full_name")
          .in("id", staffIds);
        (staffRows || []).forEach((s: any) => { staffMap[s.id] = s.full_name; });
      }

      const transformed = rows.map((e: any) => ({
        ...e,
        staff: e.staff_id && staffMap[e.staff_id] ? { full_name: staffMap[e.staff_id] } : null,
      }));

      setExpenses(transformed);
      calculateStats(transformed);
    } catch (err: any) {
      console.error("Error fetching expenses:", err);
      setExpenses([]);
      setError(err?.message || "Failed to load expenses");
      toast({
        variant: "destructive",
        title: "Error loading expenses",
        description: err?.message || "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setStaff([]);
    }
  };

  const calculateStats = (expenseData: Expense[]) => {
    const totalAmount = expenseData.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expenseCount = expenseData.length;
    const categoriesCount = new Set(expenseData.map(e => e.category)).size;
    const avgExpense = expenseCount > 0 ? totalAmount / expenseCount : 0;
    setStats({ totalAmount, expenseCount, categoriesCount, avgExpense });
  };

  const filterExpenses = () => {
    let filtered = expenses;
    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.staff?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter !== "all") filtered = filtered.filter(e => e.category === categoryFilter);
    if (assignedFilter !== "all") filtered = filtered.filter((e: any) => e.staff_id === assignedFilter);
    if (sourceFilter !== "all") filtered = filtered.filter((e: any) => e.source_type === sourceFilter);
    setFilteredExpenses(filtered);
  };

  useRealTimeData({
    table: 'expenses',
    onInsert: () => fetchExpenses(),
    onUpdate: () => fetchExpenses(),
    onDelete: () => fetchExpenses(),
  });

  useEffect(() => {
    fetchExpenses();
    fetchStaff();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [searchTerm, categoryFilter, assignedFilter, sourceFilter, expenses]);

  return {
    expenses,
    filteredExpenses,
    stats,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    assignedFilter,
    setAssignedFilter,
    sourceFilter,
    setSourceFilter,
    isLoading,
    error,
    staff,
    fetchExpenses,
  };
};
