// @ts-nocheck
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Archive, CheckCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onArchiveSelected?: () => void;
  onApproveSelected?: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
  customActions?: React.ReactNode;
}

export const BulkActionBar = ({
  selectedCount,
  onDeleteSelected,
  onArchiveSelected,
  onApproveSelected,
  onDeselectAll,
  isLoading = false,
  customActions,
}: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {customActions}
          
          {onApproveSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onApproveSelected}
              disabled={isLoading}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          
          {onArchiveSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onArchiveSelected}
              disabled={isLoading}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteSelected}
            disabled={isLoading}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};