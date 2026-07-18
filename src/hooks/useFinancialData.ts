// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FinancialMetrics {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
  expensesCount: number;
  avgSaleValue: number;
  avgExpenseValue: number;
  profitMargin: number;
}

interface MonthlySummary {
  month: string;
  sales: number;
  expenses: number;
  profit: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export const useFinancialData = (dateRange?: { from: Date; to: Date }) => {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    salesCount: 0,
    expensesCount: 0,
    avgSaleValue: 0,
    avgExpenseValue: 0,
    profitMargin: 0,
  });
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryBreakdown[]>([]);
  const [salesByStatus, setSalesByStatus] = useState<CategoryBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);

      // Build date filter
      let salesQuery = supabase
        .from("sales")
        .select("total_amount, payment_status, sale_date, created_at");
      
      let expensesQuery = supabase
        .from("expenses")
        .select("amount, category, expense_date, created_at");

      if (dateRange) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];
        
        salesQuery = salesQuery
          .gte("sale_date", fromDate)
          .lte("sale_date", toDate);
        
        expensesQuery = expensesQuery
          .gte("expense_date", fromDate)
          .lte("expense_date", toDate);
      }

      const [salesResult, expensesResult] = await Promise.all([
        salesQuery,
        expensesQuery
      ]);

      if (salesResult.error) throw salesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const sales = salesResult.data || [];
      const expenses = expensesResult.data || [];

      // Calculate basic metrics
      const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const netProfit = totalSales - totalExpenses;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      setMetrics({
        totalSales,
        totalExpenses,
        netProfit,
        salesCount: sales.length,
        expensesCount: expenses.length,
        avgSaleValue: sales.length > 0 ? totalSales / sales.length : 0,
        avgExpenseValue: expenses.length > 0 ? totalExpenses / expenses.length : 0,
        profitMargin,
      });

      // Calculate monthly summary
      const monthlyData = new Map<string, { sales: number; expenses: number }>();
      
      sales.forEach(sale => {
        const month = new Date(sale.sale_date || sale.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        const current = monthlyData.get(month) || { sales: 0, expenses: 0 };
        monthlyData.set(month, { ...current, sales: current.sales + sale.total_amount });
      });

      expenses.forEach(expense => {
        const month = new Date(expense.expense_date || expense.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        const current = monthlyData.get(month) || { sales: 0, expenses: 0 };
        monthlyData.set(month, { ...current, expenses: current.expenses + expense.amount });
      });

      const monthlyArray = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        sales: data.sales,
        expenses: data.expenses,
        profit: data.sales - data.expenses,
      }));

      setMonthlySummary(monthlyArray);

      // Calculate expense categories breakdown
      const categoryTotals = new Map<string, { amount: number; count: number }>();
      expenses.forEach(expense => {
        const current = categoryTotals.get(expense.category) || { amount: 0, count: 0 };
        categoryTotals.set(expense.category, {
          amount: current.amount + expense.amount,
          count: current.count + 1,
        });
      });

      const expenseCategoriesArray = Array.from(categoryTotals.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }));

      setExpenseCategories(expenseCategoriesArray);

      // Calculate sales by status
      const statusTotals = new Map<string, { amount: number; count: number }>();
      sales.forEach(sale => {
        const status = sale.payment_status || 'pending';
        const current = statusTotals.get(status) || { amount: 0, count: 0 };
        statusTotals.set(status, {
          amount: current.amount + sale.total_amount,
          count: current.count + 1,
        });
      });

      const salesByStatusArray = Array.from(statusTotals.entries()).map(([status, data]) => ({
        category: status,
        amount: data.amount,
        count: data.count,
        percentage: totalSales > 0 ? (data.amount / totalSales) * 100 : 0,
      }));

      setSalesByStatus(salesByStatusArray);

    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({
        variant: "destructive",
        title: "Error loading financial data",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  return {
    metrics,
    monthlySummary,
    expenseCategories,
    salesByStatus,
    isLoading,
    refetch: fetchFinancialData,
  };
};
