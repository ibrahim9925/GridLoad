// @ts-nocheck

import { useState } from "react";

// COPY the full Installation type used elsewhere for consistency
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

export const useInstallationActions = ({
  onInstallationSaved,
  onDeleteInstallation,
}: {
  onInstallationSaved: () => void;
  onDeleteInstallation: (id: string) => void;
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (installation: Installation) => {
    setSelectedInstallation(installation);
    setEditDialogOpen(true);
  };

  const handleDelete = (installation: Installation) => {
    setSelectedInstallation(installation);
    setDeleteDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedInstallation(null);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setSelectedInstallation(null);
  };

  const confirmDelete = async () => {
    if (!selectedInstallation) return;
    setIsDeleting(true);
    try {
      await onDeleteInstallation(selectedInstallation.id);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedInstallation(null);
    }
  };

  return {
    editDialogOpen,
    deleteDialogOpen,
    selectedInstallation,
    isDeleting,
    handleEdit,
    handleDelete,
    handleEditDialogClose,
    handleDeleteDialogClose,
    confirmDelete,
  };
};
