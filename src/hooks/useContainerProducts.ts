// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContainerProduct } from './useContainers';

export const useContainerProducts = (containerId?: string) => {
  const [containerProducts, setContainerProducts] = useState<ContainerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchContainerProducts = async () => {
    if (!containerId) {
      setContainerProducts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('container_products')
        .select('*')
        .eq('container_id', containerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContainerProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching container products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch container products.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addContainerProduct = async (productData: Omit<ContainerProduct, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) => {
    try {
      const { data, error } = await supabase
        .from('container_products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      setContainerProducts(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Product added to container successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error adding container product:', error);
      toast({
        title: "Error",
        description: "Failed to add product to container.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateContainerProduct = async (id: string, updates: Partial<ContainerProduct>) => {
    try {
      const { data, error } = await supabase
        .from('container_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setContainerProducts(prev => prev.map(product => 
        product.id === id ? { ...product, ...data } : product
      ));

      toast({
        title: "Success",
        description: "Container product updated successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error updating container product:', error);
      toast({
        title: "Error",
        description: "Failed to update container product.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeContainerProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('container_products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContainerProducts(prev => prev.filter(product => product.id !== id));
      toast({
        title: "Success",
        description: "Product removed from container successfully.",
      });
    } catch (error: any) {
      console.error('Error removing container product:', error);
      toast({
        title: "Error",
        description: "Failed to remove product from container.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const processContainerArrival = async (containerId: string) => {
    try {
      // Update container status to delivered
      await supabase
        .from('containers')
        .update({ 
          status: 'delivered' as const,
          actual_arrival_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', containerId);

      // Create/update products in catalog and update inventory
      const { data: containerProducts } = await supabase
        .from('container_products')
        .select('*')
        .eq('container_id', containerId);

      if (containerProducts) {
        for (const cp of containerProducts) {
          let productIdForStockMovement = cp.product_id; // Keep track of which product_id to use
          
          if (cp.product_id) {
            // Update existing product stock by manually fetching current values and updating 
            const { data: currentProduct } = await supabase
              .from('products')
              .select('current_stock, on_hand_qty')
              .eq('id', cp.product_id)
              .single();

            if (currentProduct) {
              await supabase
                .from('products')
                .update({
                  current_stock: (currentProduct.current_stock || 0) + (cp.received_quantity || cp.quantity),
                  on_hand_qty: (currentProduct.on_hand_qty || 0) + (cp.received_quantity || cp.quantity),
                  last_restock_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', cp.product_id);
            }
          } else {
            // Create new product
            const { data: newProduct } = await supabase
              .from('products')
              .insert({
                name: cp.product_name,
                cost_price: cp.unit_cost,
                current_stock: cp.received_quantity || cp.quantity,
                on_hand_qty: cp.received_quantity || cp.quantity,
                status: 'Active',
                unit: 'pcs',
                last_restock_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            // Update container product with new product ID and use it for stock movement
            if (newProduct) {
              productIdForStockMovement = newProduct.id;
              await supabase
                .from('container_products')
                .update({ product_id: newProduct.id })
                .eq('id', cp.id);
            }
          }

          // Create stock movement with correct product_id
          if (productIdForStockMovement) {
            await supabase
              .from('stock_movements')
              .insert({
                product_id: productIdForStockMovement,
                movement_type: 'in',
                quantity: cp.received_quantity || cp.quantity,
                unit_cost: cp.unit_cost,
                total_cost: cp.total_cost,
                reference_type: 'container',
                reference_id: containerId,
                notes: `Container arrival: ${containerId}`
              });
          }
        }
      }

      toast({
        title: "Success",
        description: "Container arrival processed successfully.",
      });
    } catch (error: any) {
      console.error('Error processing container arrival:', error);
      toast({
        title: "Error",
        description: "Failed to process container arrival.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchContainerProducts();
  }, [containerId]);

  return {
    containerProducts,
    isLoading,
    addContainerProduct,
    updateContainerProduct,
    removeContainerProduct,
    processContainerArrival,
    refetch: fetchContainerProducts,
  };
};