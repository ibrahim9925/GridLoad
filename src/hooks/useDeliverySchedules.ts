// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliverySchedule {
  id: string;
  sale_id: string;
  customer_id: string;
  scheduled_date: string;
  time_slot: string;
  delivery_type: string;
  special_instructions?: string;
  status: string;
  driver_id?: string;
  confirmed_at?: string;
  completed_at?: string;
  created_at: string;
  // Joined data from related tables
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  order_value?: number;
}

export interface CreateDeliverySchedule {
  sale_id: string;
  customer_id: string;
  scheduled_date: string;
  time_slot: string;
  delivery_type: string;
  special_instructions?: string;
}

export const useDeliverySchedules = () => {
  const [deliveries, setDeliveries] = useState<DeliverySchedule[]>([]);
  const [customers, setCustomers] = useState<Array<{id: string; contact_person: string; phone?: string; address?: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('delivery_schedules')
        .select(`
          *,
          customers!inner(
            id,
            contact_person,
            phone,
            address
          ),
          sales!inner(
            id,
            total_amount
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const formattedDeliveries = data?.map(delivery => ({
        ...delivery,
        customer_name: delivery.customers?.contact_person,
        customer_phone: delivery.customers?.phone,
        customer_address: delivery.customers?.address,
        order_value: delivery.sales?.total_amount
      })) || [];

      setDeliveries(formattedDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch delivery schedules"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, contact_person, phone, address')
        .order('contact_person');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const createDeliverySchedule = async (scheduleData: CreateDeliverySchedule) => {
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .insert([{
          ...scheduleData,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Delivery scheduled successfully"
      });

      await fetchDeliveries();
      return data;
    } catch (error) {
      console.error('Error creating delivery schedule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to schedule delivery"
      });
      throw error;
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('delivery_schedules')
        .update(updateData)
        .eq('id', deliveryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Delivery ${status} successfully`
      });

      await fetchDeliveries();
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update delivery status"
      });
    }
  };

  const assignDriver = async (deliveryId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('delivery_schedules')
        .update({ driver_id: driverId })
        .eq('id', deliveryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Driver assigned successfully"
      });

      await fetchDeliveries();
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign driver"
      });
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchCustomers();
  }, []);

  return {
    deliveries,
    customers,
    isLoading,
    createDeliverySchedule,
    updateDeliveryStatus,
    assignDriver,
    refetch: fetchDeliveries
  };
};