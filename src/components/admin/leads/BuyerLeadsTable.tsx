// @ts-nocheck

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, Check, Loader2, Edit, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface BuyerLead {
  id: string;
  name: string;
  company: string;
  email: string;
  product: string;
  quantity: string;
  date: string;
  status: string;
}

interface BuyerLeadsTableProps {
  leads: BuyerLead[];
  isLoading?: boolean;
  onContactLead?: (id: string) => void;
  onConvertLead?: (id: string) => void;
  onEditLead?: (lead: BuyerLead) => void;
  onDeleteLead?: (id: string) => void;
}

const BuyerLeadsTable = ({ leads, isLoading = false, onContactLead, onConvertLead, onEditLead, onDeleteLead }: BuyerLeadsTableProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name & Company</TableHead>
          <TableHead>Product Interest</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              No buyer leads found.
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <div className="font-medium">{lead.name}</div>
                <div className="text-sm text-muted-foreground">{lead.company}</div>
              </TableCell>
              <TableCell>
                <div>{lead.product}</div>
                <div className="text-sm text-muted-foreground">{lead.quantity}</div>
              </TableCell>
              <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
              <TableCell><StatusBadge status={lead.status} /></TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onEditLead && onEditLead(lead)}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onContactLead && onContactLead(lead.id)}
                >
                  {lead.status === "new" ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  <span className="sr-only">Contact</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDeleteLead && onDeleteLead(lead.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default BuyerLeadsTable;
