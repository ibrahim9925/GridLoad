// @ts-nocheck
// Pure utility functions for product deletion without React hooks
import { supabase } from "@/integrations/supabase/client";

export interface DeleteResult {
  deleted: boolean;
  archived: boolean;
  referenceTables?: string[];
}

export const checkProductReferences = async (productId: string) => {
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
};

export const safeDeleteProduct = async (productId: string): Promise<DeleteResult> => {
  const { hasReferences, referenceTables } = await checkProductReferences(productId);

  if (hasReferences) {
    // Soft delete - mark as inactive
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", productId);

    if (error) throw error;

    return { deleted: false, archived: true, referenceTables };
  } else {
    // Hard delete - safe to remove completely
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) throw error;

    return { deleted: true, archived: false };
  }
};