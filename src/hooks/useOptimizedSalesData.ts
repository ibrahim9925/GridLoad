// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Sale {
  id: string;
  customer_id: string;
  sales_rep_id: string;
  sale_date: string;
  total_amount: number;
  payment_status: string;
  is_installment: boolean;
  balance_due: number;
  has_missing_serials?: boolean;
  customers: {
    contact_person: string;
    company_name: string;
  };
  staff?: {
    full_name: string;
  };
}

export interface SalesStats {
  total: number;
  revenue: number;
  totalRevenue: number;
  salesCount: number;
  totalOutstanding: number;
  paidSales: number;
  averageSale: number;
}

export const useOptimizedSalesData = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salesStats, setSalesStats] = useState<SalesStats>({ 
    total: 0, 
    revenue: 0,
    totalRevenue: 0,
    salesCount: 0,
    totalOutstanding: 0,
    paidSales: 0,
    averageSale: 0
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<any>(null);
  const { toast } = useToast();

  const fetchSales = async () => {
    try {
      console.log("💰 Optimized Sales: Fetching sales data...");
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          sale_number,
          invoice_number,
          customer_id,
          sales_rep_id,
          sale_date,
          total_amount,
          subtotal_before_discount,
          tax_rate,
          tax_amount,
          discount_amount,
          currency,
          payment_status,
          is_installment,
          balance_due,
          notes,
          customers!sales_customer_id_fkey (
            contact_person,
            company_name,
            email,
            phone,
            address
          ),
          staff!sales_sales_rep_id_fkey (
            full_name
          ),
          sale_items (
            has_missing_serials
          )
        `)
        .order("sale_date", { ascending: false });

      if (error?.message?.includes("has_missing_serials")) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("sales")
          .select(`
            id,
            sale_number,
            invoice_number,
            customer_id,
            sales_rep_id,
            sale_date,
            total_amount,
            subtotal_before_discount,
            tax_rate,
            tax_amount,
            discount_amount,
            currency,
            payment_status,
            is_installment,
            balance_due,
            notes,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name,
              email,
              phone,
              address
            ),
            staff!sales_sales_rep_id_fkey (
              full_name
            )
          `)
          .order("sale_date", { ascending: false });
        if (fallbackError) throw fallbackError;
        const transformedFallback = (fallbackData || []).map((sale) => ({
          ...sale,
          has_missing_serials: false,
          customers: sale.customers ? {
            contact_person: (sale.customers as any).contact_person || "",
            company_name: (sale.customers as any).company_name || "",
            email: (sale.customers as any).email || "",
            phone: (sale.customers as any).phone || "",
            address: (sale.customers as any).address || "",
          } : {
            contact_person: "",
            company_name: "",
            email: "",
            phone: "",
            address: "",
          },
          staff: sale.staff ? {
            full_name: (sale.staff as any).full_name || ""
          } : undefined
        })) as Sale[];
        setSales(transformedFallback);
        setIsLoading(false);
        return;
      }

      if (error) {
        throw error;
      }

      console.log("✅ Optimized Sales: Successfully fetched sales");
      
      // Transform data to handle potential null relationships
      const transformedSales = (data || []).map(sale => ({
        ...sale,
        has_missing_serials: (sale.sale_items || []).some(
          (item: any) => item.has_missing_serials === true
        ),
        customers: sale.customers ? {
          contact_person: (sale.customers as any).contact_person || "",
          company_name: (sale.customers as any).company_name || "",
          email: (sale.customers as any).email || "",
          phone: (sale.customers as any).phone || "",
          address: (sale.customers as any).address || "",
        } : {
          contact_person: "",
          company_name: "",
          email: "",
          phone: "",
          address: "",
        },
        staff: sale.staff ? {
          full_name: (sale.staff as any).full_name || ""
        } : undefined
      })) as Sale[];
      
      // Calculate comprehensive stats
      const totalRevenue = transformedSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalOutstanding = transformedSales.reduce((sum, sale) => sum + (sale.balance_due || 0), 0);
      const paidSales = transformedSales.filter(sale => sale.payment_status === 'paid').length;
      const averageSale = transformedSales.length > 0 ? totalRevenue / transformedSales.length : 0;
      
      setSalesStats({ 
        total: transformedSales.length, 
        revenue: totalRevenue,
        totalRevenue,
        salesCount: transformedSales.length,
        totalOutstanding,
        paidSales,
        averageSale
      });
      
      setSales(transformedSales);
    } catch (error) {
      console.error("❌ Optimized Sales: Error fetching sales:", error);
      toast({
        variant: "destructive",
        title: "Error fetching sales",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSales = fetchSales;

  useEffect(() => {
    fetchSales();
  }, []);

  return {
    sales,
    setSales,
    isLoading,
    salesStats,
    paymentStatusFilter,
    setPaymentStatusFilter,
    salesRepFilter,
    setSalesRepFilter,
    dateRange,
    setDateRange,
    refetch: fetchSales,
    refreshSales,
  };
};
