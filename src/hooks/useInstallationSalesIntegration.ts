// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InstallationSaleItem {
  id: string;
  installation_id: string;
  sale_item_id: string;
  quantity_to_install: number;
  quantity_installed: number;
  status: string;
  notes?: string;
  sale_items?: {
    product_id: string;
    quantity: number;
    unit_price: number;
    products?: {
      name: string;
      sku?: string;
    };
  };
}

export const useInstallationSalesIntegration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getInstallationItems = useCallback(async (installationId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('installation_sale_items')
        .select(`
          *,
          sale_items (
            product_id,
            quantity,
            unit_price,
            products (
              name,
              sku
            )
          )
        `)
        .eq('installation_id', installationId);

      if (error) throw error;
      return (data || []) as unknown as InstallationSaleItem[];
    } catch (error) {
      console.error('Error loading installation items:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load installation items",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateInstallationProgress = useCallback(async (
    itemId: string,
    quantityInstalled: number,
    notes?: string
  ) => {
    try {
      setIsLoading(true);
      
      // Get current item to determine new status
      const { data: currentItem } = await supabase
        .from('installation_sale_items')
        .select('quantity_to_install')
        .eq('id', itemId)
        .single();

      const newStatus = quantityInstalled >= (currentItem?.quantity_to_install || 0) 
        ? 'completed' 
        : quantityInstalled > 0 
        ? 'in_progress' 
        : 'pending';

      const { error } = await supabase
        .from('installation_sale_items')
        .update({
          quantity_installed: quantityInstalled,
          status: newStatus,
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Progress Updated",
        description: `Installation progress updated to ${quantityInstalled} items`,
      });

    } catch (error) {
      console.error('Error updating installation progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update installation progress",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const completeInstallation = useCallback(async (installationId: string) => {
    try {
      setIsLoading(true);

      // Update installation status
      const { error: installationError } = await supabase
        .from('installations')
        .update({
          status: 'completed',
          completion_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', installationId);

      if (installationError) throw installationError;

      // Mark all items as completed
      const { error: itemsError } = await supabase
        .from('installation_sale_items')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('installation_id', installationId);

      if (itemsError) throw itemsError;

      // Get the related sale to update fulfillment status
      const { data: installation } = await supabase
        .from('installations')
        .select('sale_id')
        .eq('id', installationId)
        .single();

      if (installation?.sale_id) {
        await supabase
          .from('sales')
          .update({
            fulfillment_status: 'delivered',
            actual_delivery_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', installation.sale_id);
      }

      toast({
        title: "Installation Completed",
        description: "Installation has been marked as completed",
      });

    } catch (error) {
      console.error('Error completing installation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete installation",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createInstallationFromSale = useCallback(async (
    saleId: string,
    customerId: string,
    siteAddress?: string,
    notes?: string
  ) => {
    try {
      setIsLoading(true);

      // Create installation record
      const { data: installation, error: installationError } = await supabase
        .from('installations')
        .insert({
          sale_id: saleId,
          customer_id: customerId,
          status: 'scheduled',
          site_address: siteAddress,
          installation_notes: notes,
          scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
        })
        .select()
        .single();

      if (installationError) throw installationError;

      // Get sale items and create installation items
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (saleItemsError) throw saleItemsError;

      if (saleItems && saleItems.length > 0) {
        const installationItems = saleItems.map(item => ({
          installation_id: installation.id,
          sale_item_id: item.id,
          quantity_to_install: item.quantity,
          quantity_installed: 0,
          status: 'pending'
        }));

        const { error: itemsError } = await supabase
          .from('installation_sale_items')
          .insert(installationItems);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Installation Created",
        description: "Installation record has been created from the sale",
      });

      return installation;
    } catch (error) {
      console.error('Error creating installation from sale:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create installation from sale",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    getInstallationItems,
    updateInstallationProgress,
    completeInstallation,
    createInstallationFromSale
  };
};