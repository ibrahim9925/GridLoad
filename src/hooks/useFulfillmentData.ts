// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FulfillmentStats {
  pending: number;
  picking: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  scheduled: number;
}

export interface OrderFulfillment {
  id: string;
  sale_id: string;
  fulfillment_status: string;
  warehouse_location_id?: string;
  assigned_to?: string;
  picking_started_at?: string;
  packed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  shipping_cost?: number;
  package_weight?: number;
  package_dimensions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Related data
  sale?: {
    id: string;
    invoice_number: string;
    customer_id: string;
    total_amount: number;
    sale_date: string;
  };
  customer?: {
    id: string;
    contact_person: string;
    company_name?: string;
    email?: string;
    phone?: string;
  };
  assigned_staff?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface PickingList {
  id: string;
  sale_id: string;
  created_by: string;
  assigned_to?: string;
  status: string;
  priority: number;
  picking_started_at?: string;
  completed_at?: string;
  items_json: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PackingSlip {
  id: string;
  sale_id: string;
  packed_by: string;
  package_weight?: number;
  package_dimensions?: string;
  shipping_cost?: number;
  carrier_service?: string;
  tracking_number?: string;
  shipping_label_url?: string;
  created_at: string;
}

export const useFulfillmentData = () => {
  const [fulfillmentStats, setFulfillmentStats] = useState<FulfillmentStats>({
    pending: 0,
    picking: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    scheduled: 0
  });
  const [orderFulfillments, setOrderFulfillments] = useState<OrderFulfillment[]>([]);
  const [pickingLists, setPickingLists] = useState<PickingList[]>([]);
  const [packingSlips, setPackingSlips] = useState<PackingSlip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchFulfillmentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('fulfillment_status');

      if (error) throw error;

      const stats = {
        pending: 0,
        picking: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        scheduled: 0
      };

      data?.forEach((sale) => {
        if (sale.fulfillment_status && stats.hasOwnProperty(sale.fulfillment_status)) {
          stats[sale.fulfillment_status as keyof FulfillmentStats]++;
        }
      });

      // Get scheduled deliveries count
      const { data: deliveries } = await supabase
        .from('delivery_schedules')
        .select('id')
        .eq('scheduled_date', new Date().toISOString().split('T')[0])
        .eq('status', 'scheduled');

      stats.scheduled = deliveries?.length || 0;

      setFulfillmentStats(stats);
    } catch (error: any) {
      console.error('Error fetching fulfillment stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch fulfillment statistics",
        variant: "destructive"
      });
    }
  };

  const fetchOrderFulfillments = async () => {
    try {
      const { data, error } = await supabase
        .from('order_fulfillment')
        .select(`
          *,
          sale:sales(
            id,
            invoice_number,
            customer_id,
            total_amount,
            sale_date,
            customers(
              id,
              contact_person,
              company_name,
              email,
              phone
            )
          ),
          assigned_staff:staff(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrderFulfillments(data || []);
    } catch (error: any) {
      console.error('Error fetching order fulfillments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order fulfillments",
        variant: "destructive"
      });
    }
  };

  const fetchPickingLists = async () => {
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPickingLists(data || []);
    } catch (error: any) {
      console.error('Error fetching picking lists:', error);
    }
  };

  const fetchPackingSlips = async () => {
    try {
      const { data, error } = await supabase
        .from('packing_slips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPackingSlips(data || []);
    } catch (error: any) {
      console.error('Error fetching packing slips:', error);
    }
  };

  const updateFulfillmentStatus = async (saleId: string, status: 'pending' | 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ fulfillment_status: status })
        .eq('id', saleId);

      if (error) throw error;

      await fetchFulfillmentStats();
      await fetchOrderFulfillments();

      toast({
        title: "Success",
        description: "Order status updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating fulfillment status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const createPickingList = async (saleId: string, items: any[]) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('picking_lists')
        .insert({
          sale_id: saleId,
          created_by: authData.user.id,
          items_json: items,
          status: 'pending',
          priority: 3
        });

      if (error) throw error;

      await fetchPickingLists();

      toast({
        title: "Success",
        description: "Picking list created successfully"
      });
    } catch (error: any) {
      console.error('Error creating picking list:', error);
      toast({
        title: "Error",
        description: "Failed to create picking list",
        variant: "destructive"
      });
    }
  };

  const createPackingSlip = async (saleId: string, packageData: any) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('packing_slips')
        .insert({
          sale_id: saleId,
          packed_by: authData.user.id,
          ...packageData
        });

      if (error) throw error;

      await fetchPackingSlips();

      toast({
        title: "Success",
        description: "Packing slip created successfully"
      });
    } catch (error: any) {
      console.error('Error creating packing slip:', error);
      toast({
        title: "Error",
        description: "Failed to create packing slip",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchFulfillmentStats(),
        fetchOrderFulfillments(),
        fetchPickingLists(),
        fetchPackingSlips()
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return {
    fulfillmentStats,
    orderFulfillments,
    pickingLists,
    packingSlips,
    isLoading,
    updateFulfillmentStatus,
    createPickingList,
    createPackingSlip,
    refetch: () => {
      fetchFulfillmentStats();
      fetchOrderFulfillments();
      fetchPickingLists();
      fetchPackingSlips();
    }
  };
};