// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFulfillmentOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Delivery Operations
  const scheduleDelivery = async (deliveryData: {
    sale_id: string;
    customer_id: string;
    scheduled_date: string;
    time_slot: string;
    delivery_type: string;
    special_instructions?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .insert([deliveryData])
        .select();

      if (error) throw error;

      toast({
        title: "Delivery Scheduled",
        description: "Delivery has been successfully scheduled.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to schedule delivery",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelivery = async (deliveryId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select();

      if (error) throw error;

      toast({
        title: "Delivery Confirmed",
        description: "Delivery has been confirmed and is ready to proceed.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to confirm delivery",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const completeDelivery = async (deliveryId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select();

      if (error) throw error;

      // Update related sale status
      if (data?.[0]?.sale_id) {
        await supabase
          .from('sales')
          .update({
            fulfillment_status: 'delivered',
            actual_delivery_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', data[0].sale_id);
      }

      toast({
        title: "Delivery Completed",
        description: "Delivery has been marked as completed.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete delivery",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const assignDriver = async (deliveryId: string, driverId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .update({ driver_id: driverId })
        .eq('id', deliveryId)
        .select();

      if (error) throw error;

      toast({
        title: "Driver Assigned",
        description: "Driver has been successfully assigned to delivery.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign driver",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Picking Operations
  const startPicking = async (listId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .update({
          status: 'in_progress',
          picking_started_at: new Date().toISOString(),
          assigned_to: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', listId)
        .select();

      if (error) throw error;

      toast({
        title: "Picking Started",
        description: "Picking process has been initiated.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to start picking",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const completePicking = async (listId: string, notes?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('picking_lists')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', listId)
        .select();

      if (error) throw error;

      // Update order fulfillment status to packed
      if (data?.[0]?.sale_id) {
        await supabase
          .from('order_fulfillment')
          .update({
            fulfillment_status: 'packed',
            packed_at: new Date().toISOString()
          })
          .eq('sale_id', data[0].sale_id);
      }

      toast({
        title: "Picking Completed",
        description: "Items have been picked and are ready for packing.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to complete picking",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const generatePickingList = async (saleId: string) => {
    setIsLoading(true);
    try {
      // Get sale items with product details
      const { data: saleItems, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          id,
          product_id,
          quantity,
          products!inner (
            id,
            name,
            sku,
            current_stock
          )
        `)
        .eq('sale_id', saleId);

      if (saleItemsError) throw saleItemsError;

      // Create picking list items format
      const pickingItems = saleItems?.map(item => ({
        product_id: item.product_id,
        name: (item.products as any)?.name || 'Unknown Product',
        sku: (item.products as any)?.sku || 'N/A',
        quantity: item.quantity,
        location: 'A1-01', // Default location - could be enhanced with actual warehouse locations
        bin_location: 'A1-01'
      })) || [];

      const { data, error } = await supabase
        .from('picking_lists')
        .insert([{
          sale_id: saleId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          items_json: pickingItems,
          status: 'pending',
          priority: 3
        }])
        .select();

      if (error) throw error;

      // Update order fulfillment status
      await supabase
        .from('order_fulfillment')
        .update({ fulfillment_status: 'picking' })
        .eq('sale_id', saleId);

      toast({
        title: "Picking List Generated",
        description: "Picking list has been created and is ready for processing.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate picking list",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Shipping Operations
  const generateShippingLabel = async (orderId: string) => {
    setIsLoading(true);
    try {
      // Simulate shipping label generation
      const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const { data, error } = await supabase
        .from('order_fulfillment')
        .update({
          tracking_number: trackingNumber,
          carrier: 'fedex' // Default carrier
        })
        .eq('sale_id', orderId)
        .select();

      if (error) throw error;

      toast({
        title: "Shipping Label Generated",
        description: `Tracking number: ${trackingNumber}`,
      });

      return { data, error: null, trackingNumber };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to generate shipping label",
      });
      return { data: null, error, trackingNumber: null };
    } finally {
      setIsLoading(false);
    }
  };

  const markAsShipped = async (orderId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_fulfillment')
        .update({
          fulfillment_status: 'shipped',
          shipped_at: new Date().toISOString(),
          estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        })
        .eq('sale_id', orderId)
        .select();

      if (error) throw error;

      // Update sale status
      await supabase
        .from('sales')
        .update({ fulfillment_status: 'shipped' })
        .eq('id', orderId);

      toast({
        title: "Order Shipped",
        description: "Order has been marked as shipped and is on its way.",
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to mark order as shipped",
      });
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const trackPackage = async (trackingNumber: string) => {
    // Simulate package tracking - in real implementation, this would call carrier APIs
    toast({
      title: "Package Tracking",
      description: `Tracking ${trackingNumber} - Package is in transit`,
    });
    
    // Open tracking URL (simulate)
    window.open(`https://www.fedex.com/track?tracknumber=${trackingNumber}`, '_blank');
  };

  return {
    isLoading,
    scheduleDelivery,
    confirmDelivery,
    completeDelivery,
    assignDriver,
    startPicking,
    completePicking,
    generatePickingList,
    generateShippingLabel,
    markAsShipped,
    trackPackage
  };
};