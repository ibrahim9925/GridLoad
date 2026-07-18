// @ts-nocheck

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../useOptimizedLeadsData";

export const useLeadCreate = (leads: Lead[], setLeads: (leads: Lead[]) => void) => {
  const { toast } = useToast();

  const handleCreateLead = async (leadData: any) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert([leadData])
        .select(`*, staff!leads_assigned_to_fkey ( full_name )`)
        .single();

      if (error) throw error;

      setLeads([data as Lead, ...leads]);
      toast({ title: "Lead created", description: "New lead has been added." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating lead",
        description: error?.message || "Please try again.",
      });
      throw error;
    }
  };

  return { handleCreateLead };
};
