
import React, { useState } from "react";
import { Tables } from "@/integrations/supabase/types";
import CustomerDialog from "@/components/admin/CustomerDialog";
import { useOptimizedCustomersData } from "@/hooks/useOptimizedCustomersData";
import CustomersHeader from "@/components/admin/customers/CustomersHeader";
import CustomersTable from "@/components/admin/customers/CustomersTable";
import { DeleteConfirmationDialog } from "@/components/admin/DeleteConfirmationDialog";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { toast } from "sonner";

type Customer = Tables<'customers'>;

const Customers = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { 
    customers, 
    isLoading, 
    searchTerm, 
    setSearchTerm, 
    handleDeleteCustomer, 
    handleSaveCustomer 
  } = useOptimizedCustomersData();

  const {
    selectedIds,
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount,
  } = useBulkSelection(customers, (customer) => customer.id);

  const handleAddCustomer = () => {
    console.log("➕ Customers: Opening dialog for new customer");
    setCurrentCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    console.log("✏️ Customers: Opening edit dialog for customer:", customer.id);
    setCurrentCustomer(customer);
    setDialogOpen(true);
  };

  const handleSaveCustomerWrapper = async (customerData: Partial<Customer>) => {
    try {
      await handleSaveCustomer(customerData, currentCustomer);
      setDialogOpen(false);
    } catch {
      // keep dialog open on failure so the user can correct and retry
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    
    setIsDeleting(true);
    try {
      await handleDeleteCustomer(customerToDelete.id);
      toast.success("Customer deleted successfully");
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      toast.error("Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    const confirmed = window.confirm(`Delete ${selectedItems.length} selected customers?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedItems.map(customer => handleDeleteCustomer(customer.id)));
      toast.success(`${selectedItems.length} customers deleted successfully`);
      deselectAll();
    } catch (error) {
      toast.error("Failed to delete some customers");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <CustomersHeader 
        customersCount={customers.length}
        onAddCustomer={handleAddCustomer}
      />

      <BulkActionBar
        selectedCount={selectedCount}
        onDeleteSelected={handleBulkDelete}
        onDeselectAll={deselectAll}
        isLoading={isDeleting}
      />

      <CustomersTable
        customers={customers}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteClick}
        selectItem={selectItem}
        selectedIds={selectedIds}
        isSelected={isSelected}
        selectAll={selectAll}
        deselectAll={deselectAll}
      />

      <CustomerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customer={currentCustomer}
        onSave={handleSaveCustomerWrapper}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        itemName={customerToDelete?.contact_person}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Customers;
