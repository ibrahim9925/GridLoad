// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Supplier {
  id: string;
  name: string;
  is_active: boolean;
}

interface BulkSupplierOperationsProps {
  suppliers: Supplier[];
  onSuppliersUpdated: () => void;
}

export const BulkSupplierOperations = ({ suppliers, onSuppliersUpdated }: BulkSupplierOperationsProps) => {
  const { updateSupplier, deleteSupplier } = useSuppliers();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  
  const {
    selectedIds,
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount,
  } = useBulkSelection(suppliers, (supplier) => supplier.id);

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      await Promise.all(selectedIds.map(id => deleteSupplier(id)));
      toast({
        title: "Success",
        description: `${selectedCount} suppliers deleted successfully.`,
      });
      deselectAll();
      onSuppliersUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete some suppliers.",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkActivate = async () => {
    setIsLoading(true);
    try {
      await Promise.all(selectedIds.map(id => updateSupplier(id, { is_active: true })));
      toast({
        title: "Success",
        description: `${selectedCount} suppliers activated successfully.`,
      });
      deselectAll();
      onSuppliersUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to activate some suppliers.",
      });
    } finally {
      setIsLoading(false);
      setShowActivateDialog(false);
    }
  };

  const handleBulkDeactivate = async () => {
    setIsLoading(true);
    try {
      await Promise.all(selectedIds.map(id => updateSupplier(id, { is_active: false })));
      toast({
        title: "Success",
        description: `${selectedCount} suppliers deactivated successfully.`,
      });
      deselectAll();
      onSuppliersUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to deactivate some suppliers.",
      });
    } finally {
      setIsLoading(false);
      setShowDeactivateDialog(false);
    }
  };

  return (
    <>
      {/* Selection Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedCount === suppliers.length && suppliers.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            Select all suppliers
          </span>
        </div>
        
        {selectedCount > 0 && (
          <Badge variant="secondary">
            {selectedCount} selected
          </Badge>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        onDeleteSelected={() => setShowDeleteDialog(true)}
        onDeselectAll={deselectAll}
        isLoading={isLoading}
        customActions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActivateDialog(true)}
              disabled={isLoading}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeactivateDialog(true)}
              disabled={isLoading}
            >
              Deactivate
            </Button>
          </div>
        }
      />

      {/* Individual Row Selection */}
      <div className="space-y-2">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="flex items-center gap-2 p-2 rounded border">
            <Checkbox
              checked={isSelected(supplier.id)}
              onCheckedChange={() => selectItem(supplier.id)}
            />
            <span className="flex-1">{supplier.name}</span>
            <Badge variant={supplier.is_active ? "default" : "secondary"}>
              {supplier.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suppliers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} supplier{selectedCount > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Suppliers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate {selectedCount} supplier{selectedCount > 1 ? 's' : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkActivate}>
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Suppliers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedCount} supplier{selectedCount > 1 ? 's' : ''}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};