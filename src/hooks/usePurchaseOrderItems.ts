// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  received_quantity: number;
  product?: {
    name: string;
    sku: string;
    current_stock: number;
    category: string;
  };
}

export const usePurchaseOrderItems = (purchaseOrderId: string) => {
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    if (!purchaseOrderId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          products!product_id(name, sku, current_stock, category)
        `)
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedData = data?.map(item => ({
        ...item,
        product: item.products
      })) || [];

      setItems(transformedData);
    } catch (error: any) {
      console.error('Error fetching purchase order items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase order items.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [purchaseOrderId, toast]);

  const addItem = async (itemData: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'line_total'>) => {
    try {
      const line_total = itemData.quantity * itemData.unit_cost;
      
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert([{
          ...itemData,
          purchase_order_id: purchaseOrderId,
          line_total
        }])
        .select(`
          *,
          products!product_id(name, sku, current_stock, category)
        `)
        .single();

      if (error) throw error;

      const transformedItem = {
        ...data,
        product: data.products
      };

      setItems(prev => [...prev, transformedItem]);
      toast({
        title: "Success",
        description: "Item added successfully.",
      });
      
      return data;
    } catch (error: any) {
      console.error('Error adding purchase order item:', error);
      toast({
        title: "Error",
        description: "Failed to add item.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateItem = async (itemId: string, updates: Partial<PurchaseOrderItem>) => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .update(updates)
        .eq('id', itemId)
        .select(`
          *,
          products!product_id(name, sku, current_stock, category)
        `)
        .single();

      if (error) throw error;

      const transformedItem = {
        ...data,
        product: data.products
      };

      setItems(prev => prev.map(item => 
        item.id === itemId ? transformedItem : item
      ));

      return data;
    } catch (error: any) {
      console.error('Error updating purchase order item:', error);
      toast({
        title: "Error",
        description: "Failed to update item.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
      toast({
        title: "Success",
        description: "Item removed successfully.",
      });
    } catch (error: any) {
      console.error('Error removing purchase order item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const processReceiving = async () => {
    try {
      // Update purchase order status to received
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', purchaseOrderId);

      if (poError) throw poError;

      // The database trigger will handle inventory updates automatically
      
      toast({
        title: "Success",
        description: "Purchase order processed successfully. Inventory has been updated.",
      });
      
      await fetchItems(); // Refresh items
    } catch (error: any) {
      console.error('Error processing receiving:', error);
      toast({
        title: "Error",
        description: "Failed to process receiving.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    processReceiving,
    reloadItems: fetchItems,
  };
};