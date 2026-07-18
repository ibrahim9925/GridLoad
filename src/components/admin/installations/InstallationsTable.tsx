// @ts-nocheck
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Edit, Trash2, Loader2, Download } from "lucide-react";
import InstallationFilters from "./InstallationFilters";
import EditInstallationDialog from "./EditInstallationDialog";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";
import { usePagination } from "@/hooks/usePagination";
import PaginationControls from "@/components/ui/pagination-controls";
import { exportToCSV, ExportColumn, formatDate } from "@/utils/dataExport";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import InstallationTableHeader from "./InstallationTableHeader";
import InstallationTableRow from "./InstallationTableRow";
import { useInstallationTableData } from "@/hooks/useInstallationTableData";
import { useInstallationActions } from "@/hooks/useInstallationActions";

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

interface InstallationsTableProps {
  filteredInstallations: Installation[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  engineerFilter: string;
  setEngineerFilter: (engineer: string) => void;
  dateFromFilter: Date | undefined;
  setDateFromFilter: (date: Date | undefined) => void;
  dateToFilter: Date | undefined;
  setDateToFilter: (date: Date | undefined) => void;
  engineers: Array<{ id: string; full_name: string }>;
  isLoading: boolean;
  onInstallationSaved: () => void;
  onDeleteInstallation: (id: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const InstallationsTable = ({
  filteredInstallations,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  engineerFilter,
  setEngineerFilter,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  engineers,
  isLoading,
  onInstallationSaved,
  onDeleteInstallation,
  clearFilters,
  hasActiveFilters,
}: InstallationsTableProps) => {
  const [localInstallations, setLocalInstallations] = useState(filteredInstallations);

  // Set up real-time updates
  useRealTimeData({
    table: 'installations',
    onInsert: () => onInstallationSaved(),
    onUpdate: () => onInstallationSaved(),
    onDelete: () => onInstallationSaved()
  });

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems,
    handleExport,
    getStatusVariant,
  } = useInstallationTableData(filteredInstallations);

  const {
    editDialogOpen,
    deleteDialogOpen,
    selectedInstallation,
    isDeleting,
    handleEdit,
    handleDelete,
    handleEditDialogClose,
    handleDeleteDialogClose,
    confirmDelete,
  } = useInstallationActions({
    onInstallationSaved,
    onDeleteInstallation,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Installation Orders ({totalItems})</CardTitle>
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <InstallationFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          engineerFilter={engineerFilter}
          setEngineerFilter={setEngineerFilter}
          dateFromFilter={dateFromFilter}
          setDateFromFilter={setDateFromFilter}
          dateToFilter={dateToFilter}
          setDateToFilter={setDateToFilter}
          engineers={engineers}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <InstallationTableHeader />
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No installations found. {searchTerm || hasActiveFilters ? "Try adjusting your filters." : "Schedule an installation to get started."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((installation) => (
                        <InstallationTableRow
                          key={installation.id}
                          installation={installation}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          getStatusVariant={getStatusVariant}
                        />
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

        <EditInstallationDialog
          open={editDialogOpen}
          onClose={handleEditDialogClose}
          onSave={onInstallationSaved}
          installation={selectedInstallation}
        />

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={confirmDelete}
          isLoading={isDeleting}
        />
      </CardContent>
    </Card>
  );
};

export default InstallationsTable;
