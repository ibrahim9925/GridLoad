// @ts-nocheck
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useSalesInventoryIntegration = () => {
  const { toast } = useToast();

  const createSaleWithIntegration = async (saleData: any, saleItems: any[]) => {
    try {
      // Create the sale first
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items (triggers will handle inventory reduction, installations, warranties)
      const saleItemsWithSaleId = saleItems.map(item => ({
        ...item,
        sale_id: sale.id
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsWithSaleId);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Sale created with automatic inventory and integration updates"
      });

      return { success: true, sale };
    } catch (error: any) {
      console.error('Error creating integrated sale:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create sale"
      });
      return { success: false, error };
    }
  };

  const getStockMovements = async (productId?: string) => {
    try {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products (name, sku)
        `)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching stock movements:', error);
      return { success: false, error };
    }
  };

  const getInstallationsByCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('installations')
        .select(`
          *,
          sales (invoice_number, total_amount),
          customers (contact_person, company_name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching installations:', error);
      return { success: false, error };
    }
  };

  const getWarrantiesByCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('warranties')
        .select(`
          *,
          products (name, sku),
          sales (invoice_number)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching warranties:', error);
      return { success: false, error };
    }
  };

  const updateInstallationStatus = async (installationId: string, status: string, completionDate?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed' && completionDate) {
        updateData.completion_date = completionDate;
      }

      const { error } = await supabase
        .from('installations')
        .update(updateData)
        .eq('id', installationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Installation status updated"
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating installation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update installation"
      });
      return { success: false, error };
    }
  };

  // Legacy function names for backward compatibility
  const updateInventoryOnSale = createSaleWithIntegration;
  const createInstallationFromSale = async (saleData: any) => {
    // This is now handled automatically by triggers
    return { success: true };
  };
  const createWarrantyFromSale = async (saleItems: any[], saleData: any) => {
    // This is now handled automatically by triggers  
    return { success: true };
  };

  return {
    createSaleWithIntegration,
    getStockMovements,
    getInstallationsByCustomer,
    getWarrantiesByCustomer,
    updateInstallationStatus,
    // Legacy compatibility
    updateInventoryOnSale,
    createInstallationFromSale,
    createWarrantyFromSale
  };
};