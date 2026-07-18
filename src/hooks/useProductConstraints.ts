// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useProductConstraints = () => {
  const { toast } = useToast();

  const checkProductReferences = useCallback(async (productId: string) => {
    try {
      // Check all tables that reference products
      const [
        saleItemsResult, 
        stockMovementsResult, 
        warrantyResult,
        containerProductsResult,
        inventoryValuationsResult,
        productSuppliersResult,
        purchaseOrderItemsResult,
        quotationItemsResult,
        stockAlertsResult,
        serialNumbersResult
      ] = await Promise.all([
        supabase.from("sale_items").select("id").eq("product_id", productId).limit(1),
        supabase.from("stock_movements").select("id").eq("product_id", productId).limit(1),
        supabase.from("warranties").select("id").eq("product_id", productId).limit(1),
        supabase.from("container_products").select("id").eq("product_id", productId).limit(1),
        supabase.from("inventory_valuations").select("id").eq("product_id", productId).limit(1),
        supabase.from("product_suppliers").select("id").eq("product_id", productId).limit(1),
        supabase.from("purchase_order_items").select("id").eq("product_id", productId).limit(1),
        supabase.from("quotation_items").select("id").eq("product_id", productId).limit(1),
        supabase.from("stock_alerts").select("id").eq("product_id", productId).limit(1),
        supabase.from("product_serial_numbers").select("id").eq("product_id", productId).limit(1)
      ]);

      const referenceTables = [];
      let hasReferences = false;

      if (saleItemsResult.data?.length) {
        referenceTables.push('Sales');
        hasReferences = true;
      }
      if (stockMovementsResult.data?.length) {
        referenceTables.push('Stock Movements');
        hasReferences = true;
      }
      if (warrantyResult.data?.length) {
        referenceTables.push('Warranties');
        hasReferences = true;
      }
      if (containerProductsResult.data?.length) {
        referenceTables.push('Container Products');
        hasReferences = true;
      }
      if (inventoryValuationsResult.data?.length) {
        referenceTables.push('Inventory Valuations');
        hasReferences = true;
      }
      if (productSuppliersResult.data?.length) {
        referenceTables.push('Product Suppliers');
        hasReferences = true;
      }
      if (purchaseOrderItemsResult.data?.length) {
        referenceTables.push('Purchase Orders');
        hasReferences = true;
      }
      if (quotationItemsResult.data?.length) {
        referenceTables.push('Quotations');
        hasReferences = true;
      }
      if (stockAlertsResult.data?.length) {
        referenceTables.push('Stock Alerts');
        hasReferences = true;
      }
      if (serialNumbersResult.data?.length) {
        referenceTables.push('Serial Numbers');
        hasReferences = true;
      }

      return { hasReferences, referenceTables };
    } catch (error) {
      console.error("Error checking product references:", error);
      return { hasReferences: true, referenceTables: ['Unknown'] };
    }
  }, []);

  const safeDeleteProduct = useCallback(async (productId: string) => {
    const { hasReferences, referenceTables } = await checkProductReferences(productId);

    if (hasReferences) {
      // Soft delete - mark as inactive
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Product archived",
        description: `Product archived instead of deleted due to existing references in: ${referenceTables.join(', ')}`,
      });

      return { deleted: false, archived: true };
    } else {
      // Hard delete - safe to remove completely
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "Product removed successfully",
      });

      return { deleted: true, archived: false };
    }
  }, [checkProductReferences, toast]);

  const validateSkuUniqueness = useCallback(async (sku: string, productId?: string) => {
    if (!sku) return true; // SKU is optional

    const query = supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .eq("is_active", true);

    if (productId) {
      query.neq("id", productId);
    }

    const { data, error } = await query.limit(1);

    if (error) throw error;

    return !data || data.length === 0;
  }, []);

  const generateUniqueSku = useCallback(async (productName: string) => {
    const basePrefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    let attempt = 0;
    let sku: string;

    do {
      const suffix = attempt === 0 
        ? Date.now().toString().slice(-6)
        : `${Date.now().toString().slice(-6)}-${attempt}`;
      sku = `${basePrefix}-${suffix}`;
      
      const isUnique = await validateSkuUniqueness(sku);
      if (isUnique) break;
      
      attempt++;
    } while (attempt < 10);

    if (attempt >= 10) {
      throw new Error("Could not generate unique SKU after 10 attempts");
    }

    return sku;
  }, [validateSkuUniqueness]);

  return {
    checkProductReferences,
    safeDeleteProduct,
    validateSkuUniqueness,
    generateUniqueSku,
  };
};