// @ts-nocheck

import React, { useState } from "react";
import LeadsHeader from "@/components/admin/leads/LeadsHeader";
import LeadsTabs from "@/components/admin/leads/LeadsTabs";
import LeadDialog from "@/components/admin/LeadDialog";
import { useOptimizedLeadsData, Lead } from "@/hooks/useOptimizedLeadsData";
import { useLeadActions } from "@/hooks/useLeadActions";

const Leads = () => {
  const { 
    leads, 
    setLeads, 
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    assignedFilter,
    setAssignedFilter,
    fetchLeads
  } = useOptimizedLeadsData();
  
  const { handleCreateLead, handleUpdateLead, handleDeleteLead, handleContactLead, handleConvertLead } = useLeadActions(leads, setLeads);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const handleEditLead = (row: { id: string }) => {
    const full = leads.find((l) => l.id === row.id) ?? null;
    setEditingLead(full);
    setIsDialogOpen(true);
  };

  const handleDialogSubmit = async (leadData: any) => {
    if (editingLead) {
      await handleUpdateLead(leadData, editingLead);
    } else {
      await handleCreateLead(leadData);
    }
    setIsDialogOpen(false);
    setEditingLead(null);
    fetchLeads(); // Refresh leads after changes
  };

  const handleAddLead = () => {
    setEditingLead(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <LeadsHeader onAddLead={handleAddLead} />
      
      <LeadsTabs
        leads={leads}
        isLoading={isLoading}
        onContactLead={handleContactLead}
        onConvertLead={handleConvertLead}
        onEditLead={handleEditLead}
        onDeleteLead={handleDeleteLead}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        assignedFilter={assignedFilter}
        setAssignedFilter={setAssignedFilter}
      />

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleDialogSubmit}
        lead={editingLead}
      />
    </div>
  );
};

export default Leads;
