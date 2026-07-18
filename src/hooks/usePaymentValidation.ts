// @ts-nocheck
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface PaymentValidationError {
  field?: string;
  message: string;
  type: 'validation' | 'network' | 'permission' | 'business';
}

export const usePaymentValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const validatePaymentData = useCallback((paymentData: any) => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!paymentData.sale_id) {
      newErrors.sale_id = "Sale ID is required";
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      newErrors.amount = "Payment amount must be greater than zero";
    }

    if (!paymentData.payment_method) {
      newErrors.payment_method = "Payment method is required";
    }

    if (!paymentData.payment_date) {
      newErrors.payment_date = "Payment date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const handlePaymentError = useCallback((error: any, context?: string) => {
    console.error(`❌ Payment Error${context ? ` (${context})` : ''}:`, error);

    let userMessage = "An unexpected error occurred. Please try again.";
    let errorType: PaymentValidationError['type'] = 'network';

    // Parse different types of errors
    if (error.message?.includes("violates foreign key constraint")) {
      userMessage = "Invalid sale reference. Please refresh and try again.";
      errorType = 'validation';
    } else if (error.message?.includes("violates row-level security")) {
      userMessage = "You don't have permission to record payments for this sale.";
      errorType = 'permission';
    } else if (error.message?.includes("duplicate key")) {
      userMessage = "This payment may have already been recorded.";
      errorType = 'business';
    } else if (error.message?.includes("timeout") || error.message?.includes("network")) {
      userMessage = "Network timeout. Please check your connection and try again.";
      errorType = 'network';
    } else if (error.message?.includes("not authenticated")) {
      userMessage = "Authentication required. Please log in and try again.";
      errorType = 'permission';
    } else if (error.message) {
      userMessage = error.message;
    }

    // Show user-friendly error message
    toast({
      variant: "destructive",
      title: "Payment Error",
      description: userMessage,
    });

    return { message: userMessage, type: errorType };
  }, [toast]);

  return {
    errors,
    clearErrors,
    setFieldError,
    validatePaymentData,
    handlePaymentError,
    hasErrors: Object.keys(errors).length > 0,
  };
};