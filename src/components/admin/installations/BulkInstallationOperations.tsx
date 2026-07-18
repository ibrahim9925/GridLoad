// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Installation {
  id: string;
  customer: {
    contact_person: string;
  };
  status: string;
}

interface BulkInstallationOperationsProps {
  installations: Installation[];
  onInstallationsUpdated: () => void;
}

export const BulkInstallationOperations = ({ installations, onInstallationsUpdated }: BulkInstallationOperationsProps) => {
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusUpdateDialog, setShowStatusUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const {
    selectedIds,
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    selectedCount,
  } = useBulkSelection(installations, (installation) => installation.id);

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('installations')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCount} installations deleted successfully.`,
      });
      deselectAll();
      onInstallationsUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete some installations.",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!newStatus) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('installations')
        .update({ status: newStatus as any })
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedCount} installations updated successfully.`,
      });
      deselectAll();
      onInstallationsUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update some installations.",
      });
    } finally {
      setIsLoading(false);
      setShowStatusUpdateDialog(false);
      setNewStatus('');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800", 
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {/* Selection Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedCount === installations.length && installations.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            Select all installations
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusUpdateDialog(true)}
            disabled={isLoading}
          >
            Update Status
          </Button>
        }
      />

      {/* Individual Row Selection */}
      <div className="space-y-2">
        {installations.map((installation) => (
          <div key={installation.id} className="flex items-center gap-2 p-2 rounded border">
            <Checkbox
              checked={isSelected(installation.id)}
              onCheckedChange={() => selectItem(installation.id)}
            />
            <span className="flex-1">{installation.customer?.contact_person || 'Unknown Customer'}</span>
            <Badge className={getStatusColor(installation.status)}>
              {installation.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Installations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} installation{selectedCount > 1 ? 's' : ''}? 
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

      {/* Status Update Dialog */}
      <AlertDialog open={showStatusUpdateDialog} onOpenChange={setShowStatusUpdateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Installation Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new status for {selectedCount} installation{selectedCount > 1 ? 's' : ''}:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNewStatus('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkStatusUpdate}
              disabled={!newStatus}
            >
              Update Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};