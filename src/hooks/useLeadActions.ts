// @ts-nocheck

import { useLeadCreate } from "./leads/useLeadCreate";
import { useLeadUpdate } from "./leads/useLeadUpdate";
import { useLeadDelete } from "./leads/useLeadDelete";
import { useLeadStatusActions } from "./leads/useLeadStatusActions";
import type { Lead } from "./useOptimizedLeadsData";

export const useLeadActions = (leads: Lead[], setLeads: (leads: Lead[]) => void) => {
  const { handleCreateLead } = useLeadCreate(leads, setLeads);
  const { handleUpdateLead } = useLeadUpdate(leads, setLeads);
  const { handleDeleteLead } = useLeadDelete(leads, setLeads);
  const { handleContactLead, handleConvertLead } = useLeadStatusActions(leads, setLeads);

  return {
    handleCreateLead,
    handleUpdateLead,
    handleDeleteLead,
    handleContactLead,
    handleConvertLead,
  };
};
