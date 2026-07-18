// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeletionImpact {
  canDelete: boolean;
  dependencies: {
    table: string;
    count: number;
    description: string;
  }[];
  warnings: string[];
}

export const useDeletionImpactAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeSupplierDeletion = async (supplierId: string): Promise<DeletionImpact> => {
    setIsAnalyzing(true);
    try {
      const dependencies = [];
      let canDelete = true;

      // Check purchase orders
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, status')
        .eq('supplier_id', supplierId);

      if (poError) throw poError;

      if (purchaseOrders?.length > 0) {
        dependencies.push({
          table: 'purchase_orders',
          count: purchaseOrders.length,
          description: `${purchaseOrders.length} purchase orders linked to this supplier`
        });

        const activePOs = purchaseOrders.filter(po => 
          po.status !== 'cancelled' && po.status !== 'completed'
        );
        
        if (activePOs.length > 0) {
          canDelete = false;
        }
      }

      // Check containers
      const { data: containers, error: containerError } = await supabase
        .from('containers')
        .select('id, status')
        .eq('supplier_id', supplierId);

      if (containerError) throw containerError;

      if (containers?.length > 0) {
        dependencies.push({
          table: 'containers',
          count: containers.length,
          description: `${containers.length} containers linked to this supplier`
        });

        const activeContainers = containers.filter(c => 
          c.status !== 'completed'
        );
        
        if (activeContainers.length > 0) {
          canDelete = false;
        }
      }

      const warnings = [];
      if (!canDelete) {
        warnings.push('Cannot delete supplier with active purchase orders or containers');
        warnings.push('Complete or cancel all active orders first');
      }

      return {
        canDelete,
        dependencies,
        warnings
      };

    } catch (error: any) {
      console.error('Error analyzing supplier deletion impact:', error);
      toast({
        title: "Error",
        description: "Failed to analyze deletion impact.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePurchaseOrderDeletion = async (orderId: string): Promise<DeletionImpact> => {
    setIsAnalyzing(true);
    try {
      const dependencies = [];
      let canDelete = true;

      // Check purchase order items
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('id, received_quantity')
        .eq('purchase_order_id', orderId);

      if (itemsError) throw itemsError;

      if (items?.length > 0) {
        dependencies.push({
          table: 'purchase_order_items',
          count: items.length,
          description: `${items.length} items in this purchase order`
        });

        const receivedItems = items.filter(item => item.received_quantity > 0);
        if (receivedItems.length > 0) {
          canDelete = false;
        }
      }

      // Check container assignments
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .select('container_id, status')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      if (order?.container_id) {
        dependencies.push({
          table: 'containers',
          count: 1,
          description: 'This order is assigned to a container'
        });
      }

      const warnings = [];
      if (!canDelete) {
        warnings.push('Cannot delete purchase order with received items');
        warnings.push('This would affect inventory tracking and audit trail');
      }

      if (order?.status === 'received' || order?.status === 'completed') {
        warnings.push('This order has been processed and received');
        warnings.push('Deletion will affect inventory and financial records');
      }

      return {
        canDelete: order?.status === 'draft' || order?.status === 'cancelled',
        dependencies,
        warnings
      };

    } catch (error: any) {
      console.error('Error analyzing purchase order deletion impact:', error);
      toast({
        title: "Error",
        description: "Failed to analyze deletion impact.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    analyzeSupplierDeletion,
    analyzePurchaseOrderDeletion,
  };
};