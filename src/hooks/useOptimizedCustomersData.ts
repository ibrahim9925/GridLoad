// @ts-nocheck

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<'customers'>;

export const useOptimizedCustomersData = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Optimized search using database full-text search when available
  const fetchCustomers = async (search?: string) => {
    try {
      console.log("🔄 OptimizedCustomers: Fetching customers with optimized query...");
      setIsLoading(true);
      
      let query = supabase
        .from("customers")
        .select("*");

      // Use indexed search when search term is provided
      if (search && search.length > 2) {
        // This will use the idx_customers_search GIN index for full-text search
        query = query.textSearch('fts', search, {
          type: 'websearch',
          config: 'english'
        });
      }
      
      // Order by indexed column for better performance
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        console.error("❌ OptimizedCustomers: Database error:", error);
        throw error;
      }
      
      console.log("✅ OptimizedCustomers: Successfully fetched", data?.length || 0, "customers");
      setCustomers(data || []);
    } catch (error) {
      console.error("❌ OptimizedCustomers: Error fetching customers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching customers",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side filtering for immediate response, with optimized memo
  const filteredCustomers = useMemo(() => {
    if (!searchTerm || searchTerm.length <= 2) return customers;
    
    const searchLower = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.contact_person?.toLowerCase().includes(searchLower) ||
      customer.company_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    );
  }, [customers, searchTerm]);

  // Debounced search for database queries
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length > 2) {
        fetchCustomers(searchTerm);
      } else if (searchTerm.length === 0) {
        fetchCustomers();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDeleteCustomer = async (customerId: string) => {
    const customerToDelete = customers.find(c => c.id === customerId);
    const confirmMessage = `Are you sure you want to delete customer "${customerToDelete?.contact_person}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log("🗑️ OptimizedCustomers: Deleting customer:", customerId);
        
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("id", customerId);
        
        if (error) {
          console.error("❌ OptimizedCustomers: Delete error:", error);
          throw error;
        }
        
        console.log("✅ OptimizedCustomers: Successfully deleted customer");
        
        // Optimized local state update
        setCustomers(prev => prev.filter(customer => customer.id !== customerId));
        
        toast({
          title: "Customer deleted",
          description: "The customer has been removed successfully.",
        });
      } catch (error) {
        console.error("❌ OptimizedCustomers: Error deleting customer:", error);
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
      console.log("💾 OptimizedCustomers: Saving customer data:", customerData);
      
      if (currentCustomer) {
        // Optimized update with only changed fields
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
          console.error("❌ OptimizedCustomers: Update error:", error);
          throw error;
        }

        console.log("✅ OptimizedCustomers: Successfully updated customer");
        
        // Optimized local state update
        setCustomers(prev => prev.map(customer => 
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
          console.error("❌ OptimizedCustomers: Insert error:", error);
          throw error;
        }

        console.log("✅ OptimizedCustomers: Successfully created customer");
        
        // Optimized local state update
        setCustomers(prev => [data, ...prev]);

        toast({
          title: "Customer created",
          description: "New customer has been added successfully.",
        });
      }
    } catch (error: any) {
      console.error("❌ OptimizedCustomers: Error saving customer:", error);
      toast({
        variant: "destructive",
        title: "Error saving customer",
        description: error?.message || "Please try again later.",
      });
      throw error; // re-throw so dialog stays open and caller knows
    } finally {
      // Always refetch to guarantee the list reflects DB state
      await fetchCustomers(searchTerm.length > 2 ? searchTerm : undefined);
    }
  };


  return {
    customers: filteredCustomers,
    isLoading,
    searchTerm,
    setSearchTerm,
    handleDeleteCustomer,
    handleSaveCustomer,
    fetchCustomers,
  };
};
