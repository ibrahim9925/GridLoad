// @ts-nocheck
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface SalesDialogError {
  field?: string;
  message: string;
  type: 'validation' | 'network' | 'constraint' | 'business';
}

export const useSalesDialogError = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`❌ SalesDialog Error${context ? ` (${context})` : ''}:`, error);

    let userMessage = "An unexpected error occurred. Please try again.";
    let errorType: SalesDialogError['type'] = 'network';

    // Parse different types of errors
    if (error.message?.includes("violates foreign key constraint")) {
      userMessage = "Invalid customer or product reference. Please refresh and try again.";
      errorType = 'constraint';
    } else if (error.message?.includes("duplicate key value")) {
      userMessage = "This record already exists. Please check your data.";
      errorType = 'constraint';
    } else if (error.message?.includes("insufficient stock")) {
      userMessage = "Insufficient stock available for one or more products.";
      errorType = 'business';
    } else if (error.message?.includes("violates check constraint")) {
      userMessage = "Invalid data values. Please check your inputs.";
      errorType = 'validation';
    } else if (error.message?.includes("check_positive_stock") || error.message?.includes("positive_stock")) {
      userMessage = "Insufficient stock to save this sale. Adjust quantities or restore inventory.";
      errorType = 'business';
    } else if (error.message?.includes("has_missing_serials")) {
      userMessage = "Database migration required: run npm run db:push to add the has_missing_serials column.";
      errorType = 'constraint';
    } else if (error.message?.includes("timeout") || error.message?.includes("network")) {
      userMessage = "Network timeout. Please check your connection and try again.";
      errorType = 'network';
    } else if (error.message?.includes("not authenticated") || error.message?.includes("permission")) {
      userMessage = "Authentication required. Please log in and try again.";
      errorType = 'network';
    } else if (error.message) {
      userMessage = error.message;
    }

    // Show user-friendly error message
    toast({
      variant: "destructive",
      title: "Operation Failed",
      description: userMessage,
    });

    return { message: userMessage, type: errorType };
  }, [toast]);

  const validateSaleForm = useCallback((formData: any, saleItems: any[]) => {
    const newErrors: Record<string, string> = {};

    // Customer validation
    if (!formData.customer_id) {
      newErrors.customer_id = "Please select a customer";
    }

    // Sale items validation
    if (!saleItems || saleItems.length === 0) {
      newErrors.saleItems = "Please add at least one product";
    }

    // Individual item validation
    saleItems.forEach((item, index) => {
      if (!item.product_id) {
        newErrors[`item_${index}_product`] = "Product is required";
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }
      if (!item.unit_price || item.unit_price <= 0) {
        newErrors[`item_${index}_price`] = "Price must be greater than 0";
      }
    });

    // Discount validation
    const subtotal = saleItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const discountAmount = formData.discount_type === 'percentage' 
      ? (subtotal * (formData.discount_percentage || 0)) / 100
      : (formData.discount_amount || 0);

    if (discountAmount > subtotal) {
      newErrors.discount = "Discount cannot exceed subtotal";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      console.warn("validateSaleForm failed:", newErrors);
    }
    return { isValid, firstError: Object.values(newErrors)[0] as string | undefined };
  }, []);

  return {
    errors,
    clearErrors,
    setFieldError,
    clearFieldError,
    handleError,
    validateSaleForm,
    hasErrors: Object.keys(errors).length > 0,
  };
};