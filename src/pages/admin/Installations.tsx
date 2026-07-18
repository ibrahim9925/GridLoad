// @ts-nocheck

import React, { useState } from "react";
import InstallationsHeader from "@/components/admin/installations/InstallationsHeader";
import InstallationsTable from "@/components/admin/installations/InstallationsTable";
import InstallationDialog from "@/components/admin/InstallationDialog";
import { useInstallationsData } from "@/hooks/useInstallationsData";
import { BulkInstallationOperations } from "@/components/admin/installations/BulkInstallationOperations";

const Installations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const {
    filteredInstallations,
    engineers,
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
    isLoading,
    handleInstallationSaved,
    deleteInstallation,
    clearFilters,
    hasActiveFilters,
  } = useInstallationsData();

  const handleAddInstallation = () => {
    setDialogOpen(true);
  };

  const onInstallationSaved = () => {
    handleInstallationSaved();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <InstallationsHeader onAddInstallation={handleAddInstallation} />

      {/* Bulk Operations */}
      <BulkInstallationOperations 
        installations={filteredInstallations} 
        onInstallationsUpdated={handleInstallationSaved} 
      />

      <InstallationsTable
        filteredInstallations={filteredInstallations}
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
        isLoading={isLoading}
        onInstallationSaved={handleInstallationSaved}
        onDeleteInstallation={deleteInstallation}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <InstallationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={onInstallationSaved}
      />
    </div>
  );
};

export default Installations;
