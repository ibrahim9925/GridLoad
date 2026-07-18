// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  customer_id: string;
  assigned_to: string;
  status: "new" | "contacted" | "quoted" | "closed_won" | "closed_lost";
  estimated_value: number;
  next_follow_up: string;
  created_at: string;
  updated_at: string;
  source: string;
  notes: string;
  customers: {
    contact_person: string;
    company_name: string;
    email: string;
    phone: string;
  } | null;
  staff: {
    full_name: string;
  } | null;
}

export const useLeadsData = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      console.log("📊 Leads: Fetching leads data...");
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          customers!leads_customer_id_fkey (
            contact_person,
            company_name,
            email,
            phone
          ),
          staff!leads_assigned_to_fkey (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("✅ Leads: Successfully fetched leads");
      
      // Transform data to handle potential null relationships
      const transformedLeads = (data || []).map(lead => ({
        ...lead,
        customers: lead.customers ? {
          contact_person: (lead.customers as any).contact_person || "",
          company_name: (lead.customers as any).company_name || "",
          email: (lead.customers as any).email || "",
          phone: (lead.customers as any).phone || ""
        } : null,
        staff: lead.staff ? {
          full_name: (lead.staff as any).full_name || ""
        } : null
      }));
      
      setLeads(transformedLeads);
    } catch (error) {
      console.error("❌ Leads: Error fetching leads:", error);
      toast({
        variant: "destructive",
        title: "Error fetching leads",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    setLeads,
    isLoading,
    refetch: fetchLeads,
  };
};
