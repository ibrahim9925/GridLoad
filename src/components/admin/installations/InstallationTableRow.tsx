// @ts-nocheck

import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import InstallationActions from "./InstallationActions";
import type { BadgeVariant } from "@/hooks/useInstallationTableData";

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
  getStatusVariant: (status: string | null) => BadgeVariant;
}

const InstallationTableRow: React.FC<Props> = ({
  installation,
  onEdit,
  onDelete,
  getStatusVariant
}) => (
  <TableRow key={installation.id}>
    <TableCell>
      <div>
        <div className="font-medium">{installation.customer?.contact_person}</div>
        {installation.customer?.company_name && (
          <div className="text-sm text-muted-foreground">{installation.customer.company_name}</div>
        )}
        <div className="sm:hidden text-xs text-muted-foreground mt-1">
          {installation.scheduled_date && (
            <div>📅 {new Date(installation.scheduled_date).toLocaleDateString()}</div>
          )}
          {installation.engineer?.full_name && (
            <div>👤 {installation.engineer.full_name}</div>
          )}
        </div>
      </div>
    </TableCell>
    <TableCell className="hidden md:table-cell">
      {installation.site_address || "-"}
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        {installation.engineer?.full_name || "Unassigned"}
      </div>
    </TableCell>
    <TableCell className="hidden sm:table-cell">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {installation.scheduled_date ? new Date(installation.scheduled_date).toLocaleDateString() : "-"}
      </div>
    </TableCell>
    <TableCell>
      <Badge variant={getStatusVariant(installation.status)}>
        {installation.status || "scheduled"}
      </Badge>
    </TableCell>
    <TableCell>
      <InstallationActions
        installation={installation}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </TableCell>
  </TableRow>
);

export default InstallationTableRow;
