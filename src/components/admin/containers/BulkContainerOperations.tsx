// @ts-nocheck
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { useContainers } from '@/hooks/useContainers';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Container {
  id: string;
  container_number: string;
  status: string;
}

interface BulkContainerOperationsProps {
  containers: Container[];
  onContainersUpdated: () => void;
}

export const BulkContainerOperations = ({ containers, onContainersUpdated }: BulkContainerOperationsProps) => {
  const { updateContainer, deleteContainer } = useContainers();
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
  } = useBulkSelection(containers, (container) => container.id);

  const statusOptions = [
    { value: 'ordered', label: 'Ordered' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
  ];

  const handleBulkDelete = async () => {
    setIsLoading(true);
    try {
      await Promise.all(selectedIds.map(id => deleteContainer(id)));
      toast({
        title: "Success",
        description: `${selectedCount} containers deleted successfully.`,
      });
      deselectAll();
      onContainersUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete some containers.",
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
      await Promise.all(selectedIds.map(id => updateContainer(id, { status: newStatus as any })));
      toast({
        title: "Success",
        description: `${selectedCount} containers updated successfully.`,
      });
      deselectAll();
      onContainersUpdated();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update some containers.",
      });
    } finally {
      setIsLoading(false);
      setShowStatusUpdateDialog(false);
      setNewStatus('');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ordered: "bg-blue-100 text-blue-800",
      shipped: "bg-yellow-100 text-yellow-800", 
      arrived: "bg-green-100 text-green-800",
      processing: "bg-purple-100 text-purple-800",
      completed: "bg-gray-100 text-gray-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {/* Selection Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedCount === containers.length && containers.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll();
              } else {
                deselectAll();
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            Select all containers
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
        {containers.map((container) => (
          <div key={container.id} className="flex items-center gap-2 p-2 rounded border">
            <Checkbox
              checked={isSelected(container.id)}
              onCheckedChange={() => selectItem(container.id)}
            />
            <span className="flex-1">{container.container_number}</span>
            <Badge className={getStatusColor(container.status)}>
              {container.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Containers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} container{selectedCount > 1 ? 's' : ''}? 
              This action cannot be undone and will also delete all associated products and data.
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
            <AlertDialogTitle>Update Container Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new status for {selectedCount} container{selectedCount > 1 ? 's' : ''}:
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