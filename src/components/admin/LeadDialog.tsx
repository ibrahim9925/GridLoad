// @ts-nocheck

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLeadDialogForm } from "@/hooks/useLeadDialogForm";
import StaffSelect from "./leads/StaffSelect";
import LeadFormFields from "./leads/LeadFormFields";

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  lead?: any;
}

const LeadDialog = ({ open, onOpenChange, onSubmit, lead }: LeadDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formData, staff, isLoading, handleInputChange, validateForm, prepareSubmitData } =
    useLeadDialogForm(open, lead);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(prepareSubmitData());
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <LeadFormFields formData={formData} onInputChange={handleInputChange} />
          <StaffSelect
            value={formData.assigned_to}
            staff={staff}
            onChange={(value) => handleInputChange("assigned_to", value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {lead ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDialog;
