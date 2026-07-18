// @ts-nocheck

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, Check, Loader2 } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface SupplierLead {
  id: string;
  company: string;
  location: string;
  contact: string;
  email: string;
  category: string;
  capacity: string;
  date: string;
  status: string;
}

interface SupplierLeadsTableProps {
  leads: SupplierLead[];
  isLoading?: boolean;
  onContactSupplier?: (id: string) => void;
  onVerifySupplier?: (id: string) => void;
}

const SupplierLeadsTable = ({ leads, isLoading = false, onContactSupplier, onVerifySupplier }: SupplierLeadsTableProps) => {
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
          <TableHead>Company & Location</TableHead>
          <TableHead>Product Category</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              No supplier leads found.
            </TableCell>
          </TableRow>
        ) : (
          leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>
                <div className="font-medium">{lead.company}</div>
                <div className="text-sm text-muted-foreground">{lead.location}</div>
              </TableCell>
              <TableCell>
                <div>{lead.category}</div>
                <div className="text-sm text-muted-foreground">{lead.capacity}</div>
              </TableCell>
              <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
              <TableCell><StatusBadge status={lead.status} /></TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onContactSupplier && onContactSupplier(lead.id)}
                >
                  {lead.status === "New" ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                  <span className="sr-only">Contact</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onVerifySupplier && onVerifySupplier(lead.id)}
                >
                  <Check className="h-4 w-4" />
                  <span className="sr-only">Verify</span>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default SupplierLeadsTable;
