// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Staff {
  id: string;
  full_name: string;
}

export type ExpenseCategory = "transport" | "parts" | "installation" | "marketing" | "office" | "other";

export const useExpenseForm = (onSave: () => void, onClose: () => void) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [shipments, setShipments] = useState<{ id: string; shipment_number: string }[]>([]);
  const [category, setCategory] = useState<ExpenseCategory>("transport");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchStaff = async () => {
    try {
      const [staffRes, supplierRes, shipmentRes] = await Promise.all([
        supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
        supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
        supabase.from("po_shipments").select("id, shipment_number").order("shipment_number", { ascending: false }),
      ]);
      setStaff(staffRes.data || []);
      setSuppliers(supplierRes.data || []);
      setShipments(shipmentRes.data || []);
    } catch (error) {
      console.error("Error fetching staff/suppliers/shipments:", error);
    }
  };

  const resetForm = () => {
    setCategory("transport");
    setAmount("");
    setExpenseDate(new Date());
    setDescription("");
    setNotes("");
    setAssignedTo("");
    setSupplierId("");
    setShipmentId("");
    setReceiptFile(null);
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('crm-receipts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-receipts')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload receipt. Please try again.",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Invalid expense",
        description: "Please enter a description.",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid amount.",
      });
      return;
    }

    setIsLoading(true);

    try {
      let receiptUrl = null;
      
      if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile);
        if (!receiptUrl) {
          setIsLoading(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const createdBy = user?.id ?? null;

      const { error } = await supabase
        .from("expenses")
        .insert({
          category,
          amount: parseFloat(amount),
          expense_date: expenseDate.toISOString().split('T')[0],
          description: description.trim(),
          notes: notes.trim() || null,
          staff_id: (assignedTo && assignedTo !== "unassigned") ? assignedTo : null,
          supplier_id: (supplierId && supplierId !== "none") ? supplierId : null,
          shipment_id: (shipmentId && shipmentId !== "none") ? shipmentId : null,
          receipt_url: receiptUrl,
          ...(createdBy ? { created_by: createdBy } : {}),
        });

      if (error) throw error;

      toast({
        title: "Expense added",
        description: "Expense has been recorded successfully.",
      });

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error creating expense:", error);
      toast({
        variant: "destructive",
        title: "Error adding expense",
        description: error?.message || "Unknown error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
};
