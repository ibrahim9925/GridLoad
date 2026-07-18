// @ts-nocheck

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../useOptimizedLeadsData";

export const useLeadDelete = (leads: Lead[], setLeads: (leads: Lead[]) => void) => {
  const { toast } = useToast();

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
      setLeads(leads.filter((l) => l.id !== leadId));
      toast({ title: "Lead deleted" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting lead",
        description: error?.message || "Please try again.",
      });
    }
  };

  return { handleDeleteLead };
};
