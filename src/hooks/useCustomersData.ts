// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCache, setCache, invalidateCache } from "@/lib/sessionCache";

type Customer = Tables<'customers'>;
const CACHE_KEY = "customers:list";

export const useCustomersData = () => {
  const cached = getCache<Customer[]>(CACHE_KEY);
  const [customers, setCustomers] = useState<Customer[]>(cached || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const { toast } = useToast();

  useEffect(() => {
    if (cached) return; // skip refetch — cached data is fresh
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      setCustomers(list);
      setCache(CACHE_KEY, list);
    } catch (error) {
      console.error("❌ Customers: Error fetching customers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching customers",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customerToDelete = customers.find(c => c.id === customerId);
    const confirmMessage = `Are you sure you want to delete customer "${customerToDelete?.contact_person}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log("🗑️ Customers: Deleting customer:", customerId);
        
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("id", customerId);
        
        if (error) {
          console.error("❌ Customers: Delete error:", error);
          throw error;
        }
        
        console.log("✅ Customers: Successfully deleted customer");
        
        // Update local state
        setCustomers(customers.filter((customer) => customer.id !== customerId)); invalidateCache(CACHE_KEY);
        
        toast({
          title: "Customer deleted",
          description: "The customer has been removed successfully.",
        });
      } catch (error) {
        console.error("❌ Customers: Error deleting customer:", error);
        toast({
          variant: "destructive",
          title: "Error deleting customer",
          description: "Please try again later.",
        });
      }
    }
  };

  const handleSaveCustomer = async (customerData: Partial<Customer>, currentCustomer?: Customer | null) => {
    try {
      console.log("💾 Customers: Saving customer data:", customerData);
      
      if (currentCustomer) {
        // Update existing customer
        const { data, error } = await supabase
          .from("customers")
          .update({
            company_name: customerData.company_name || null,
            contact_person: customerData.contact_person!,
            email: customerData.email || null,
            phone: customerData.phone || null,
            address: customerData.address || null,
            city: customerData.city || null,
            state: customerData.state || null,
            postal_code: customerData.postal_code || null,
            notes: customerData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentCustomer.id)
          .select()
          .single();

        if (error) {
          console.error("❌ Customers: Update error:", error);
          throw error;
        }

        console.log("✅ Customers: Successfully updated customer");
        
        // Update local state
        invalidateCache(CACHE_KEY); setCustomers(customers.map(customer => 
          customer.id === currentCustomer.id ? data : customer
        ));

        toast({
          title: "Customer updated",
          description: "Customer information has been updated successfully.",
        });
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from("customers")
          .insert({
            company_name: customerData.company_name || null,
            contact_person: customerData.contact_person!,
            email: customerData.email || null,
            phone: customerData.phone || null,
            address: customerData.address || null,
            city: customerData.city || null,
            state: customerData.state || null,
            postal_code: customerData.postal_code || null,
            notes: customerData.notes || null,
          })
          .select()
          .single();

        if (error) {
          console.error("❌ Customers: Insert error:", error);
          throw error;
        }

        console.log("✅ Customers: Successfully created customer");
        
        // Add to local state
        setCustomers([data, ...customers]); invalidateCache(CACHE_KEY);

        toast({
          title: "Customer created",
          description: "New customer has been added successfully.",
        });
      }
    } catch (error) {
      console.error("❌ Customers: Error saving customer:", error);
      toast({
        variant: "destructive",
        title: "Error saving customer",
        description: "Please try again later.",
      });
    }
  };

  return {
    customers,
    isLoading,
    handleDeleteCustomer,
    handleSaveCustomer,
  };
};
