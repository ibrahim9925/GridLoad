// @ts-nocheck

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Installation = {
  id: string;
  scheduled_date: string | null;
  status: string | null;
  site_address: string | null;
  completion_date: string | null;
  customer: {
    contact_person: string;
    company_name: string | null;
  } | null;
  engineer: {
    full_name: string;
  } | null;
  customer_id: string;
  assigned_engineer: string | null;
  installation_notes: string | null;
};

type Engineer = {
  id: string;
  full_name: string;
};

export const useInstallationsData = () => {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [engineerFilter, setEngineerFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>();
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchInstallations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("installations")
        .select(`
          *,
          customer:customers!installations_customer_id_fkey (contact_person, company_name),
          engineer:staff!installations_assigned_engineer_fkey (full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Transform the data to match expected types
        const transformedData = data.map(installation => ({
          ...installation,
          customer: installation.customer ? {
            contact_person: (installation.customer as any).contact_person || "",
            company_name: (installation.customer as any).company_name || null
          } : null,
          engineer: installation.engineer ? {
            full_name: (installation.engineer as any).full_name || ""
          } : null
        }));
        setInstallations(transformedData);
      }
    } catch (error) {
      console.error("Error fetching installations:", error);
      toast({
        variant: "destructive",
        title: "Error fetching installations",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      setEngineers(data || []);
    } catch (error) {
      console.error("Error fetching engineers:", error);
    }
  };

  useEffect(() => {
    fetchInstallations();
    fetchEngineers();
  }, []);

  const deleteInstallation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("installations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Installation deleted",
        description: "Installation has been deleted successfully.",
      });

      fetchInstallations();
    } catch (error) {
      console.error("Error deleting installation:", error);
      toast({
        variant: "destructive",
        title: "Error deleting installation",
        description: "Please try again later.",
      });
    }
  };

  const filteredInstallations = useMemo(() => {
    return installations.filter((installation) => {
      // Search filter
      const searchMatch = 
        installation.customer?.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        installation.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        installation.site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        installation.engineer?.full_name.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === "all" || installation.status === statusFilter;

      // Engineer filter
      const engineerMatch = 
        engineerFilter === "all" || 
        (engineerFilter === "unassigned" && !installation.assigned_engineer) ||
        installation.assigned_engineer === engineerFilter;

      // Date filter
      let dateMatch = true;
      if (dateFromFilter || dateToFilter) {
        const installationDate = installation.scheduled_date ? new Date(installation.scheduled_date) : null;
        if (installationDate) {
          if (dateFromFilter && installationDate < dateFromFilter) {
            dateMatch = false;
          }
          if (dateToFilter && installationDate > dateToFilter) {
            dateMatch = false;
          }
        } else if (dateFromFilter || dateToFilter) {
          dateMatch = false;
        }
      }

      return searchMatch && statusMatch && engineerMatch && dateMatch;
    });
  }, [installations, searchTerm, statusFilter, engineerFilter, dateFromFilter, dateToFilter]);

  const handleInstallationSaved = () => {
    fetchInstallations();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setEngineerFilter("all");
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm !== "" || 
           statusFilter !== "all" || 
           engineerFilter !== "all" || 
           dateFromFilter !== undefined || 
           dateToFilter !== undefined;
  }, [searchTerm, statusFilter, engineerFilter, dateFromFilter, dateToFilter]);

  return {
    installations,
    engineers,
    filteredInstallations,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    engineerFilter,
    setEngineerFilter,
    dateFromFilter,
    setDateFromFilter,
    dateToFilter,
    setDateToFilter,
    isLoading,
    handleInstallationSaved,
    deleteInstallation,
    clearFilters,
    hasActiveFilters,
  };
};
