// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items_count?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers!supplier_id(name),
          purchase_order_items(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include supplier name and items count
      const transformedData = data?.map(order => ({
        ...order,
        supplier_name: order.suppliers?.name || 'Unknown Supplier',
        items_count: order.purchase_order_items?.length || 0
      })) || [];

      setPurchaseOrders(transformedData);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createPurchaseOrder = async (orderData: any) => {
    try {
      // Get current user ID from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Authentication required to create purchase orders');
      }
      
      const orderToInsert = {
        ...orderData,
        created_by: user.id
      };
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert([orderToInsert])
        .select(`
          *,
          suppliers!supplier_id(name),
          purchase_order_items(id)
        `)
        .single();

      if (error) throw error;

      const transformedOrder = {
        ...data,
        supplier_name: data.suppliers?.name || 'Unknown Supplier',
        items_count: data.purchase_order_items?.length || 0
      };

      setPurchaseOrders(prev => [transformedOrder, ...prev]);
      toast({
        title: "Success",
        description: "Purchase order created successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchPurchaseOrders(); // Refresh to get updated data
      toast({
        title: "Success",
        description: "Purchase order updated successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPurchaseOrders(prev => prev.filter(order => order.id !== id));
      toast({
        title: "Success",
        description: "Purchase order deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return {
    purchaseOrders,
    isLoading,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    refetch: fetchPurchaseOrders,
  };
};