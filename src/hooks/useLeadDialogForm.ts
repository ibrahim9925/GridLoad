// @ts-nocheck

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useLeadDialogForm = (open: boolean, lead?: any) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    assigned_to: "",
    status: "new",
    value: "",
    next_follow_up: "",
    source: "",
    notes: "",
  });
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    fetchStaff();
    if (lead) {
      setFormData({
        name: lead.name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        company: lead.company || "",
        assigned_to: lead.assigned_to || "",
        status: lead.status || "new",
        value: lead.value != null ? String(lead.value) : "",
        next_follow_up: lead.next_follow_up ? lead.next_follow_up.split("T")[0] : "",
        source: lead.source || "",
        notes: lead.notes || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        assigned_to: "",
        status: "new",
        value: "",
        next_follow_up: "",
        source: "",
        notes: "",
      });
    }
  }, [open, lead]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading staff",
        description: error?.message || "Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Lead name is required.",
      });
      return false;
    }
    return true;
  };

  const prepareSubmitData = () => ({
    name: formData.name.trim(),
    email: formData.email.trim() || null,
    phone: formData.phone.trim() || null,
    company: formData.company.trim() || null,
    assigned_to: formData.assigned_to || null,
    status: formData.status,
    value: formData.value ? parseFloat(formData.value) : null,
    next_follow_up: formData.next_follow_up
      ? new Date(formData.next_follow_up).toISOString()
      : null,
    source: formData.source || null,
    notes: formData.notes.trim() || null,
  });

  return {
    formData,
    staff,
    isLoading,
    handleInputChange,
    validateForm,
    prepareSubmitData,
  };
};
