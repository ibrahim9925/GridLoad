// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Database, Loader2 } from "lucide-react";
import { DeletionImpact } from "@/hooks/useDeletionImpactAnalysis";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  isLoading?: boolean;
  impactAnalysis?: DeletionImpact | null;
  isAnalyzing?: boolean;
}

export const DeleteConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Delete Item",
  itemName,
  isLoading = false,
  impactAnalysis,
  isAnalyzing = false,
}: DeleteConfirmationDialogProps) => {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmed(false);
    }
  }, [open]);

  const getConfirmationText = () => {
    if (!itemName) return 'Are you sure you want to delete this item?';
    return `Are you sure you want to delete "${itemName}"?`;
  };

  const getConfirmButtonText = () => {
    if (isLoading) return "Deleting...";
    if (impactAnalysis && !impactAnalysis.canDelete) return "Force Delete";
    return "Delete";
  };

  const getConfirmButtonVariant = () => {
    if (impactAnalysis && !impactAnalysis.canDelete) return "destructive";
    return "destructive";
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="text-base">{getConfirmationText()}</p>
            
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing dependencies...
              </div>
            )}

            {impactAnalysis && (
              <div className="space-y-4">
                {/* Dependencies Section */}
                {impactAnalysis.dependencies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Dependencies Found
                    </h4>
                    <div className="space-y-2">
                      {impactAnalysis.dependencies.map((dep, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span className="text-sm">{dep.description}</span>
                          <Badge variant="secondary">{dep.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings Section */}
                {impactAnalysis.warnings.length > 0 && (
                  <Alert variant={impactAnalysis.canDelete ? "default" : "destructive"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {impactAnalysis.warnings.map((warning, index) => (
                          <div key={index} className="text-sm">• {warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Deletion Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={impactAnalysis.canDelete ? "default" : "destructive"}>
                    {impactAnalysis.canDelete ? "Safe to Delete" : "Deletion Restricted"}
                  </Badge>
                </div>

                {/* Force Delete Confirmation */}
                {!impactAnalysis.canDelete && (
                  <div className="p-3 border border-destructive/20 rounded-md bg-destructive/5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="rounded border-destructive text-destructive focus:ring-destructive"
                      />
                      <span>I understand the risks and want to force delete anyway</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading || isAnalyzing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={
              isLoading || 
              isAnalyzing || 
              (impactAnalysis && !impactAnalysis.canDelete && !confirmed)
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getConfirmButtonText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};