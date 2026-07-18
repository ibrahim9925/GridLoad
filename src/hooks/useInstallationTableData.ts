// @ts-nocheck
import { usePagination } from "@/hooks/usePagination";
import { exportToCSV, ExportColumn, formatDate } from "@/utils/dataExport";

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

// specify the allowed variants:
export type BadgeVariant = "default" | "destructive" | "outline" | "secondary";

export const useInstallationTableData = (filteredInstallations: Installation[]) => {
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
  } = usePagination({ data: filteredInstallations, itemsPerPage: 20 });

  const exportColumns: ExportColumn[] = [
    { key: 'customer.contact_person', label: 'Customer' },
    { key: 'customer.company_name', label: 'Company' },
    { key: 'site_address', label: 'Site Address' },
    { key: 'engineer.full_name', label: 'Engineer' },
    { key: 'scheduled_date', label: 'Scheduled Date', formatter: formatDate },
    { key: 'completion_date', label: 'Completion Date', formatter: formatDate },
    { key: 'status', label: 'Status' },
    { key: 'installation_notes', label: 'Notes' }
  ];

  const handleExport = () => {
    const flattenedData = filteredInstallations.map(installation => ({
      ...installation,
      'customer.contact_person': installation.customer?.contact_person || '',
      'customer.company_name': installation.customer?.company_name || '',
      'engineer.full_name': installation.engineer?.full_name || 'Unassigned'
    }));

    exportToCSV(flattenedData, exportColumns, 'installations');
  };

  // Make sure the returned value matches the available BadgeVariant types
  const getStatusVariant = (status: string | null): BadgeVariant => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "scheduled":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return {
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
  };
};
