// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Container {
  id: string;
  container_number: string;
  container_type: '20ft' | '40ft';
  supplier_id: string;
  order_date: string;
  expected_arrival_date?: string | null;
  actual_arrival_date?: string | null;
  status: 'ordered' | 'confirmed' | 'shipped' | 'in_transit' | 'port_arrival' | 'customs_processing' | 'customs_cleared' | 'local_transit' | 'out_for_delivery' | 'delivered' | 'completed';
  total_cost: number;
  clearance_cost?: number;
  transportation_cost?: number;
  customs_fees?: number;
  customs_cleared: boolean;
  notes?: string | null;
  
  // Enhanced tracking dates
  confirmed_date?: string | null;
  shipped_date?: string | null;
  in_transit_date?: string | null;
  port_arrival_date?: string | null;
  customs_start_date?: string | null;
  customs_completion_date?: string | null;
  local_transit_start_date?: string | null;
  out_for_delivery_date?: string | null;
  delivered_date?: string | null;
  completed_date?: string | null;
  estimated_delivery_date?: string | null;
  
  // Logistics tracking
  tracking_number?: string | null;
  carrier?: string | null;
  port_of_departure?: string | null;
  port_of_arrival?: string | null;
  
  created_at: string;
  updated_at: string;
  supplier?: {
    name: string;
    contact_person: string;
  };
}

interface ContainerProduct {
  id: string;
  container_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  warranty_start_serial?: string;
  warranty_end_serial?: string;
  received_quantity: number;
  created_at: string;
  updated_at: string;
}

export const useContainers = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchContainers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('containers')
        .select(`
          *,
          supplier:suppliers(name, contact_person)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContainers((data || []) as Container[]);
    } catch (error: any) {
      console.error('Error fetching containers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch containers.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createContainer = async (containerData: Omit<Container, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .insert([containerData])
        .select(`
          *,
          supplier:suppliers(name, contact_person)
        `)
        .single();

      if (error) throw error;

      setContainers(prev => [data as Container, ...prev]);
      toast({
        title: "Success",
        description: "Container created successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error creating container:', error);
      toast({
        title: "Error",
        description: "Failed to create container.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateContainer = async (id: string, updates: Partial<Container>) => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          supplier:suppliers(name, contact_person)
        `)
        .single();

      if (error) throw error;

      setContainers(prev => prev.map(container => 
        container.id === id ? { ...container, ...(data as Container) } : container
      ));

      toast({
        title: "Success",
        description: "Container updated successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error updating container:', error);
      toast({
        title: "Error",
        description: "Failed to update container.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteContainer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('containers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContainers(prev => prev.filter(container => container.id !== id));
      toast({
        title: "Success",
        description: "Container deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting container:', error);
      toast({
        title: "Error",
        description: "Failed to delete container.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  return {
    containers,
    isLoading,
    createContainer,
    updateContainer,
    deleteContainer,
    refetch: fetchContainers,
  };
};

export type { Container, ContainerProduct };