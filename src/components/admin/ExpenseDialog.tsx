// @ts-nocheck

import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useExpenseForm } from "@/hooks/useExpenseForm";
import ExpenseFormFields from "./ExpenseFormFields";
import ReceiptUpload from "./ReceiptUpload";

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ExpenseDialog = ({ open, onClose, onSave }: ExpenseDialogProps) => {
  const {
    staff,
    suppliers,
    shipments,
    category,
    setCategory,
    amount,
    setAmount,
    expenseDate,
    setExpenseDate,
    description,
    setDescription,
    notes,
    setNotes,
    assignedTo,
    setAssignedTo,
    supplierId,
    setSupplierId,
    shipmentId,
    setShipmentId,
    receiptFile,
    setReceiptFile,
    isLoading,
    isUploading,
    fetchStaff,
    resetForm,
    handleSubmit,
  } = useExpenseForm(onSave, onClose);

  useEffect(() => {
    if (open) {
      fetchStaff();
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ExpenseFormFields
            category={category}
            setCategory={setCategory}
            amount={amount}
            setAmount={setAmount}
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            description={description}
            setDescription={setDescription}
            notes={notes}
            setNotes={setNotes}
            assignedTo={assignedTo}
            setAssignedTo={setAssignedTo}
            staff={staff}
            supplierId={supplierId}
            setSupplierId={setSupplierId}
            suppliers={suppliers}
            shipmentId={shipmentId}
            setShipmentId={setShipmentId}
            shipments={shipments}
          />

          <ReceiptUpload
            receiptFile={receiptFile}
            setReceiptFile={setReceiptFile}
            isUploading={isUploading}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? "Adding..." : isUploading ? "Uploading..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDialog;
