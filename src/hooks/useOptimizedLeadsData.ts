// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  assigned_to: string | null;
  status: string | null;
  value: number | null;
  budget: number | null;
  next_follow_up: string | null;
  created_at: string | null;
  updated_at: string | null;
  source: string | null;
  notes: string | null;
  staff?: { full_name: string } | null;
}

export const useOptimizedLeadsData = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select(`
          id, name, email, phone, company, assigned_to, status, value, budget,
          next_follow_up, created_at, updated_at, source, notes,
          staff!leads_assigned_to_fkey ( full_name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch (error: any) {
      console.error("Leads fetch error:", error);
      toast({
        variant: "destructive",
        title: "Error fetching leads",
        description: error?.message || "Please try again.",
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
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    assignedFilter,
    setAssignedFilter,
    refetch: fetchLeads,
    fetchLeads,
  };
};
