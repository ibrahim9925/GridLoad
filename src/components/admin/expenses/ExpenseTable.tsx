// @ts-nocheck

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/pagination-controls";
import { exportToCSV, formatCurrency, formatDate, ExportColumn } from "@/utils/dataExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string;
  notes: string | null;
  receipt_url: string | null;
  staff_id?: string | null;
  shipment_id?: string | null;
  created_at: string;
  staff?: { full_name: string } | null;
}

interface ExpenseTableProps {
  expenses: Expense[];
  totalExpenses: number;
  onDataChange?: () => void;
}

const ExpenseTable = ({ expenses, totalExpenses, onDataChange }: ExpenseTableProps) => {
  const { toast } = useToast();
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = usePagination({ data: expenses, itemsPerPage: 20 });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      transport: "bg-blue-100 text-blue-800",
      parts: "bg-green-100 text-green-800",
      installation: "bg-purple-100 text-purple-800",
      marketing: "bg-orange-100 text-orange-800",
      office: "bg-gray-100 text-gray-800",
      other: "bg-yellow-100 text-yellow-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const formatCurrencyValue = (amount: number) => {
    return `₪${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
      return;
    }
    toast({ title: "Expense deleted" });
    onDataChange?.();
  };

  const handleExport = () => {
    const exportColumns: ExportColumn[] = [
      { key: 'expense_date', label: 'Date', formatter: formatDate },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', formatter: formatCurrency },
      { key: 'staff.full_name', label: 'Assigned To', formatter: (value) => value || 'Unassigned' },
      { key: 'notes', label: 'Notes' },
    ];

    exportToCSV(expenses, exportColumns, `expenses-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>
            A list of all expenses with details and receipts
          </CardDescription>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {totalExpenses === 0 ? "No expenses found. Add your first expense!" : "No expenses match your filters."}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        {expense.notes && (
                          <div className="text-sm text-muted-foreground">
                            {expense.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrencyValue(expense.amount)}
                    </TableCell>
                    <TableCell>
                      {expense.staff?.full_name || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {expense.receipt_url ? (
                        <a 
                          href={expense.receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Receipt className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No receipt</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(expense.id)}
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
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={expenses.length}
        />
      </CardContent>
    </Card>
  );
};

export default ExpenseTable;
