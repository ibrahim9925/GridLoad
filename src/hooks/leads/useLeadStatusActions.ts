// @ts-nocheck

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Lead } from "../useOptimizedLeadsData";

export const useLeadStatusActions = (leads: Lead[], setLeads: (leads: Lead[]) => void) => {
  const { toast } = useToast();

  const handleContactLead = async (leadId: string) => {
    try {
      console.log("📊 Leads: Contacting lead...", leadId);
      const { error } = await supabase
        .from("leads")
        .update({ 
          status: "contacted",
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);
      
      if (error) {
        throw error;
      }
      
      setLeads(leads.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: "contacted" }
          : lead
      ));
      
      console.log("✅ Leads: Successfully contacted lead");
      toast({
        title: "Lead contacted",
        description: "Lead status updated to contacted.",
      });
    } catch (error) {
      console.error("❌ Leads: Error updating lead:", error);
      toast({
        variant: "destructive",
        title: "Error updating lead",
        description: "Please try again later.",
      });
    }
  };

  const handleConvertLead = async (leadId: string) => {
    try {
      console.log("📊 Leads: Converting lead...", leadId);
      const { error } = await supabase
        .from("leads")
        .update({ 
          status: "closed_won",
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);
      
      if (error) {
        throw error;
      }
      
      setLeads(leads.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: "closed_won" }
          : lead
      ));
      
      console.log("✅ Leads: Successfully converted lead");
      toast({
        title: "Lead converted",
        description: "Lead has been marked as converted.",
      });
    } catch (error) {
      console.error("❌ Leads: Error converting lead:", error);
      toast({
        variant: "destructive",
        title: "Error converting lead",
        description: "Please try again later.",
      });
    }
  };

  return {
    handleContactLead,
    handleConvertLead,
  };
};
