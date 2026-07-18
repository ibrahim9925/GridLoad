// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCache, setCache, invalidateCache } from '@/lib/sessionCache';

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  quality_rating: number;
  delivery_rating: number;
  min_order_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SUPPLIERS_CACHE_KEY = "suppliers:list";

export const useSuppliers = () => {
  const cached = getCache<Supplier[]>(SUPPLIERS_CACHE_KEY);
  const [suppliers, setSuppliers] = useState<Supplier[]>(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setSuppliers(list);
      setCache(SUPPLIERS_CACHE_KEY, list);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch suppliers.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      invalidateCache(SUPPLIERS_CACHE_KEY); setSuppliers(prev => [data, ...prev]);
      toast({ title: "Success", description: "Supplier created successfully." });
      await fetchSuppliers(); // guarantee fresh state
      return data;
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create supplier.",
        variant: "destructive",
      });
      throw error;
    }
  };


  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      invalidateCache(SUPPLIERS_CACHE_KEY); setSuppliers(prev => prev.map(supplier => 
        supplier.id === id ? { ...supplier, ...data } : supplier
      ));

      toast({
        title: "Success",
        description: "Supplier updated successfully.",
      });
      return data;
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      invalidateCache(SUPPLIERS_CACHE_KEY); setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      toast({
        title: "Success",
        description: "Supplier deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Error",
        description: "Failed to delete supplier.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (cached) return;
    fetchSuppliers();
  }, []);

  return {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refetch: fetchSuppliers,
  };
};