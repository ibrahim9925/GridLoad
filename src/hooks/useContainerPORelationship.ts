// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContainerPOStats {
  totalValue: number;
  assignedPOs: number;
  utilizationPercentage: number;
  remainingCapacity: number;
}

export interface SmartSuggestion {
  type: 'create_container' | 'assign_to_existing' | 'split_across_containers';
  title: string;
  description: string;
  containerId?: string;
  containerNumber?: string;
  estimatedCapacity?: number;
}

export const useContainerPORelationship = () => {
  const [unassignedPOs, setUnassignedPOs] = useState<any[]>([]);
  const [containerStats, setContainerStats] = useState<Map<string, ContainerPOStats>>(new Map());
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch unassigned purchase orders
  const fetchUnassignedPOs = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(name, contact_person)
        `)
        .is('container_id', null)
        .in('status', ['draft', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnassignedPOs(data || []);
      return data || [];
    } catch (error: any) {
      console.error('Error fetching unassigned POs:', error);
      return [];
    }
  };

  // Calculate container statistics
  const calculateContainerStats = async (containerId: string): Promise<ContainerPOStats> => {
    try {
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select('total_amount')
        .eq('container_id', containerId);

      if (error) throw error;

      const totalValue = pos?.reduce((sum, po) => sum + Number(po.total_amount || 0), 0) || 0;
      const assignedPOs = pos?.length || 0;
      
      // Assume container capacity based on type (this could be enhanced with actual CBM data)
      const assumedCapacity = 100000; // $100k default capacity
      const utilizationPercentage = Math.min((totalValue / assumedCapacity) * 100, 100);
      const remainingCapacity = Math.max(assumedCapacity - totalValue, 0);

      const stats: ContainerPOStats = {
        totalValue,
        assignedPOs,
        utilizationPercentage,
        remainingCapacity
      };

      return stats;
    } catch (error: any) {
      console.error('Error calculating container stats:', error);
      return {
        totalValue: 0,
        assignedPOs: 0,
        utilizationPercentage: 0,
        remainingCapacity: 0
      };
    }
  };

  // Assign purchase order to container
  const assignPOToContainer = async (poId: string, containerId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('purchase_orders')
        .update({ container_id: containerId })
        .eq('id', poId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order assigned to container successfully.",
      });

      // Refresh data
      await fetchUnassignedPOs();
      return true;
    } catch (error: any) {
      console.error('Error assigning PO to container:', error);
      toast({
        title: "Error",
        description: "Failed to assign purchase order to container.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign purchase order from container
  const unassignPOFromContainer = async (poId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('purchase_orders')
        .update({ container_id: null })
        .eq('id', poId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order unassigned from container.",
      });

      await fetchUnassignedPOs();
      return true;
    } catch (error: any) {
      console.error('Error unassigning PO:', error);
      toast({
        title: "Error",
        description: "Failed to unassign purchase order.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Generate smart suggestions based on PO data
  const generateSmartSuggestions = async (pos: any[]) => {
    const suggestions: SmartSuggestion[] = [];

    // Check for large single orders that should have dedicated containers
    pos.forEach(po => {
      if (Number(po.total_amount) > 50000 || (po.cbm_volume && po.cbm_volume > 30)) { // $50k or 30+ CBM threshold
        suggestions.push({
          type: 'create_container',
          title: 'Create Dedicated Container',
          description: `PO ${po.order_number} (${po.cbm_volume ? po.cbm_volume + ' CBM, ' : ''}$${Number(po.total_amount).toLocaleString()}) warrants a dedicated container`,
        });
      }
    });

    // Check for multiple orders from same supplier
    const supplierGroups = pos.reduce((groups: any, po) => {
      const supplierId = po.supplier_id;
      if (!groups[supplierId]) {
        groups[supplierId] = [];
      }
      groups[supplierId].push(po);
      return groups;
    }, {});

    Object.entries(supplierGroups).forEach(([supplierId, supplierPOs]: [string, any]) => {
      if (supplierPOs.length > 1) {
        const totalValue = supplierPOs.reduce((sum: number, po: any) => sum + Number(po.total_amount), 0);
        const supplierName = supplierPOs[0].supplier?.name || 'Unknown Supplier';
        
        suggestions.push({
          type: 'assign_to_existing',
          title: 'Consolidate Supplier Orders',
          description: `${supplierPOs.length} orders from ${supplierName} (total: $${totalValue.toLocaleString()}) could share a container`,
        });
      }
    });

    setSmartSuggestions(suggestions);
    return suggestions;
  };

  // Refresh all data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const pos = await fetchUnassignedPOs();
      await generateSmartSuggestions(pos);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    unassignedPOs,
    containerStats,
    smartSuggestions,
    isLoading,
    assignPOToContainer,
    unassignPOFromContainer,
    calculateContainerStats,
    generateSmartSuggestions,
    refreshData,
    fetchUnassignedPOs
  };
};