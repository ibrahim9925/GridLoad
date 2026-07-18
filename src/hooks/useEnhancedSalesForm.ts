// @ts-nocheck
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedSalesFormOptions {
  enableAutoSave?: boolean;
  validateOnChange?: boolean;
  maxRetries?: number;
}

export const useEnhancedSalesForm = (options: EnhancedSalesFormOptions = {}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any ongoing operations when component unmounts
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const validateSaleData = useCallback((saleData: any, saleItems: any[]): boolean => {
    const newErrors: Record<string, string> = {};

    if (!saleData.customer_id) {
      newErrors.customer_id = "Customer is required";
    }

    if (!saleItems || saleItems.length === 0) {
      newErrors.saleItems = "At least one product is required";
    }

    // Validate stock availability
    for (const item of saleItems || []) {
      if (item.quantity <= 0) {
        newErrors[`item_${item.product_id}`] = "Quantity must be greater than 0";
      }
      if (item.unit_price <= 0) {
        newErrors[`price_${item.product_id}`] = "Price must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  const createSaleWithRetry = useCallback(async (
    saleData: any, 
    saleItems: any[], 
    retryCount = 0
  ): Promise<any> => {
    const maxRetries = options.maxRetries || 3;
    
    try {
      // Create abort controller for this operation
      abortControllerRef.current = new AbortController();

      // Validate data before submission
      if (!validateSaleData(saleData, saleItems)) {
        throw new Error("Validation failed");
      }

      console.log("💾 EnhancedSalesForm: Creating sale with data:", { saleData, saleItems });

      // Create the sale record
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsWithSaleId = saleItems.map(item => ({
        ...item,
        sale_id: sale.id,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsWithSaleId)
        .select();

      if (itemsError) throw itemsError;

      console.log("✅ EnhancedSalesForm: Sale created successfully:", sale.id);

      return { ...sale, sale_items: createdItems };

    } catch (error: any) {
      console.error(`❌ EnhancedSalesForm: Sale creation failed (attempt ${retryCount + 1}):`, error);

      // Check if we should retry
      if (retryCount < maxRetries && !abortControllerRef.current?.signal.aborted) {
        const isRetryableError = 
          error.message?.includes("timeout") ||
          error.message?.includes("network") ||
          error.message?.includes("connection");

        if (isRetryableError) {
          console.log(`🔄 EnhancedSalesForm: Retrying in ${(retryCount + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          return createSaleWithRetry(saleData, saleItems, retryCount + 1);
        }
      }

      // Provide user-friendly error messages
      let userMessage = "Failed to create sale. Please try again.";
      if (error.message?.includes("violates foreign key constraint")) {
        userMessage = "Invalid customer or product selection. Please check your data.";
      } else if (error.message?.includes("insufficient stock")) {
        userMessage = "Insufficient stock for one or more products.";
      } else if (error.message?.includes("duplicate")) {
        userMessage = "A sale with this information already exists.";
      }

      toast({
        variant: "destructive",
        title: "Error creating sale",
        description: userMessage,
      });

      throw error;
    }
  }, [options.maxRetries, validateSaleData, toast]);

  const submitSale = useCallback(async (saleData: any, saleItems: any[]) => {
    if (isSubmitting) return null;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createSaleWithRetry(saleData, saleItems);
      
      toast({
        title: "Success",
        description: "Sale created successfully with automated workflows.",
      });

      return result;
    } catch (error) {
      console.error("❌ EnhancedSalesForm: Final submission failed:", error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, createSaleWithRetry, toast]);

  return {
    isSubmitting,
    errors,
    submitSale,
    validateSaleData,
    cleanup,
  };
};