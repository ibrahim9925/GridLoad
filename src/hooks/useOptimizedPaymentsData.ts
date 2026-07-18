// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  sales: {
    customer_id: string;
    customers: {
      contact_person: string;
      company_name: string;
    };
  };
}

export const useOptimizedPaymentsData = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      console.log("💰 Optimized Payments: Fetching payments data...");
      
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          sale_id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes,
          sales!payments_sale_id_fkey (
            customer_id,
            customers!sales_customer_id_fkey (
              contact_person,
              company_name
            )
          )
        `)
        .order("payment_date", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("✅ Optimized Payments: Successfully fetched payments");
      
      // Transform data to handle potential null relationships
      const transformedPayments = (data || []).map(payment => ({
        ...payment,
        sales: {
          customer_id: (payment.sales as any)?.customer_id || "",
          customers: (payment.sales as any)?.customers ? {
            contact_person: (payment.sales as any).customers.contact_person || "",
            company_name: (payment.sales as any).customers.company_name || ""
          } : {
            contact_person: "",
            company_name: ""
          }
        }
      })) as Payment[];
      
      setPayments(transformedPayments);
    } catch (error) {
      console.error("❌ Optimized Payments: Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Error fetching payments",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return {
    payments,
    setPayments,
    isLoading,
    refetch: fetchPayments,
  };
};
