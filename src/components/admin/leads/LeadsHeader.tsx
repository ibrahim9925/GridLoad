// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface LeadsHeaderProps {
  onAddLead: () => void;
}

const LeadsHeader = ({ onAddLead }: LeadsHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Leads Management</h1>
      <Button 
        onClick={onAddLead}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Lead
      </Button>
    </div>
  );
};

export default LeadsHeader;
