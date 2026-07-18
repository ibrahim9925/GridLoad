// @ts-nocheck

import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

// Use the full Installation type from InstallationTableRow,
// or optionally import it from a shared types location
type Installation = {
  id: string;
  scheduled_date: string | null;
  status: string | null;
  site_address: string | null;
  completion_date: string | null;
  customer: {
    contact_person: string;
    company_name: string | null;
  } | null;
  engineer: {
    full_name: string;
  } | null;
  customer_id: string;
  assigned_engineer: string | null;
  installation_notes: string | null;
};

interface Props {
  installation: Installation;
  onEdit: (installation: Installation) => void;
  onDelete: (installation: Installation) => void;
}

const InstallationActions: React.FC<Props> = ({ installation, onEdit, onDelete }) => (
  <div className="text-right space-x-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => onEdit(installation)}
    >
      <Edit className="h-4 w-4" />
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={() => onDelete(installation)}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
);

export default InstallationActions;
