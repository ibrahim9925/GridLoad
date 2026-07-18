// @ts-nocheck

import { useState, useEffect } from "react";
import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<'customers'>;

const defaultForm = (): Partial<Customer> => ({
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  notes: "",
  default_discount_percentage: 0,
  payment_terms_days: 7,
});

export const useCustomerDialogForm = (open: boolean, customer?: Customer | null) => {
  const [formData, setFormData] = useState<Partial<Customer>>(defaultForm());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        id: customer.id,
        company_name: customer.company_name || "",
        contact_person: customer.contact_person || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        postal_code: customer.postal_code || "",
        notes: customer.notes || "",
        default_discount_percentage: customer.default_discount_percentage || 0,
        payment_terms_days:
          (customer as any).payment_terms_days === undefined
            ? 7
            : (customer as any).payment_terms_days,
      });
    } else {
      setFormData(defaultForm());
    }
  }, [customer, open]);

  const handleInputChange = (field: keyof Customer, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.contact_person?.trim()) return false;
    return true;
  };

  return {
    formData,
    isLoading,
    setIsLoading,
    handleInputChange,
    validateForm,
  };
};
