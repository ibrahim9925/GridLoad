// @ts-nocheck

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, FileText } from "lucide-react";
import { format } from "date-fns";
import InvoiceGenerator from "../invoices/InvoiceGenerator";

interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  payment_status: string;
  customers: {
    contact_person: string;
    company_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
  };
  sale_items: Array<{
    quantity: number;
    unit_price: number;
    line_total: number;
    products: {
      name: string;
      sku: string;
    };
  }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
}

interface SalesTableProps {
  sales: Sale[];
  onEdit: (sale: Sale) => void;
  onView: (sale: Sale) => void;
}

const SalesTable = ({ sales, onEdit, onView }: SalesTableProps) => {
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="font-medium">{sale.invoice_number}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{sale.customers.contact_person}</p>
                  <p className="text-sm text-muted-foreground">{sale.customers.company_name}</p>
                </div>
              </TableCell>
              <TableCell>{format(new Date(sale.sale_date), 'MMM dd, yyyy')}</TableCell>
              <TableCell>${sale.total_amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge className={getPaymentStatusColor(sale.payment_status)}>
                  {sale.payment_status.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      console.log("Viewing sale:", sale.id);
                      onView(sale);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      console.log("Editing sale:", sale.id);
                      onEdit(sale);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <InvoiceGenerator sale={sale} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SalesTable;
