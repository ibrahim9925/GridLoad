// @ts-nocheck

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../useOptimizedLeadsData";

export const useLeadUpdate = (leads: Lead[], setLeads: (leads: Lead[]) => void) => {
  const { toast } = useToast();

  const handleUpdateLead = async (leadData: any, editingLead: Lead | null) => {
    if (!editingLead?.id) return;
    try {
      const { data, error } = await supabase
        .from("leads")
        .update({ ...leadData, updated_at: new Date().toISOString() })
        .eq("id", editingLead.id)
        .select(`*, staff!leads_assigned_to_fkey ( full_name )`)
        .single();

      if (error) throw error;

      setLeads(leads.map((l) => (l.id === data.id ? (data as Lead) : l)));
      toast({ title: "Lead updated", description: "Lead saved successfully." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating lead",
        description: error?.message || "Please try again.",
      });
      throw error;
    }
  };

  return { handleUpdateLead };
};
