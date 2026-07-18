// @ts-nocheck

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Trash2, Download, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/pagination-controls";
import { exportToCSV, ExportColumn, formatDate } from "@/utils/dataExport";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { useOverdueByCustomer } from "@/hooks/useOverdueData";
import { formatNIS } from "@/utils/formatters";

type Customer = Tables<'customers'>;

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  selectItem?: (id: string) => void;
  selectedIds?: string[];
  isSelected?: (id: string) => boolean;
  selectAll?: () => void;
  deselectAll?: () => void;
}

const CustomersTable = ({
  customers,
  isLoading,
  searchTerm,
  onSearchChange,
  onEditCustomer,
  onDeleteCustomer,
  selectItem,
  selectedIds,
  isSelected,
  selectAll,
  deselectAll,
}: CustomersTableProps) => {
  const navigate = useNavigate();
  const [localCustomers, setLocalCustomers] = useState(customers);
  const { byCustomer: overdueByCustomer } = useOverdueByCustomer();

  // Set up real-time updates
  useRealTimeData({
    table: 'customers',
    onInsert: (payload) => {
      setLocalCustomers(prev => [payload.new, ...prev]);
    },
    onUpdate: (payload) => {
      setLocalCustomers(prev => prev.map(customer => 
        customer.id === payload.new.id ? payload.new : customer
      ));
    },
    onDelete: (payload) => {
      setLocalCustomers(prev => prev.filter(customer => customer.id !== payload.old.id));
    }
  });

  // Use local customers if real-time is working, otherwise use props
  const displayCustomers = localCustomers.length > 0 ? localCustomers : customers;

  const filteredCustomers = displayCustomers.filter((customer) =>
    customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({ data: filteredCustomers, itemsPerPage: 20 });

  const exportColumns: ExportColumn[] = [
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'company_name', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'postal_code', label: 'Postal Code' },
    { key: 'created_at', label: 'Created Date', formatter: formatDate },
    { key: 'notes', label: 'Notes' }
  ];

  const handleExport = () => {
    exportToCSV(filteredCustomers, exportColumns, 'customers');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Customers ({totalItems})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full sm:w-[300px]"
              />
            </div>
            <Button variant="outline" onClick={handleExport} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectItem && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds?.length === customers.length && customers.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                selectAll?.();
                              } else {
                                deselectAll?.();
                              }
                            }}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )}
                      <TableHead>Contact Person</TableHead>
                      <TableHead className="hidden sm:table-cell">Company</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Phone</TableHead>
                      <TableHead className="hidden xl:table-cell">Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={selectItem ? 7 : 6} className="text-center py-8">
                          {searchTerm ? "No customers found matching your search." : "No customers found. Add your first customer to get started."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((customer) => (
                        <TableRow key={customer.id}>
                          {selectItem && (
                            <TableCell>
                              <Checkbox
                                checked={isSelected?.(customer.id) || false}
                                onCheckedChange={() => selectItem(customer.id)}
                                aria-label={`Select ${customer.contact_person}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2 flex-wrap">
                                {customer.contact_person}
                                {overdueByCustomer.get(customer.id) && (
                                  <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                                    OVERDUE {formatNIS(overdueByCustomer.get(customer.id)!.total)}
                                  </Badge>
                                )}
                              </div>
                              <div className="sm:hidden text-sm text-muted-foreground">
                                {customer.company_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {customer.company_name || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {customer.email || "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {customer.phone || "-"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/admin/customers/${customer.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Ledger</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEditCustomer(customer)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onDeleteCustomer(customer)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Delete</span>
                              </Button>
                            </div>
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
                totalItems={totalItems}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomersTable;
