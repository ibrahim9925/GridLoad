// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

interface AutomationRuleInsert {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_conditions: Json;
  action_type: string;
  action_config: Json;
  is_active?: boolean;
}

export const useEnhancedAutomation = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const executeAutomationRule = useCallback(async (ruleId: string, triggerData: Record<string, any>) => {
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.rpc('execute_automation_rule', {
        rule_id: ruleId,
        trigger_data: triggerData
      });

      if (error) throw error;

      console.log('✅ Automation rule executed:', data);
      return data;
    } catch (error) {
      console.error('❌ Error executing automation rule:', error);
      toast({
        variant: "destructive",
        title: "Automation Error",
        description: "Failed to execute automation rule.",
      });
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  const triggerSalesAutomation = useCallback(async (saleData: any) => {
    try {
      // Get active automation rules for sales events
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('trigger_type', 'sales_event')
        .eq('is_active', true);

      if (error) throw error;

      // Execute applicable rules
      const executions = await Promise.all(
        rules.map(rule => 
          executeAutomationRule(rule.id, {
            event: 'sale_created',
            sale: saleData,
            timestamp: new Date().toISOString()
          })
        )
      );

      return executions;
    } catch (error) {
      console.error('❌ Error triggering sales automation:', error);
    }
  }, [executeAutomationRule]);

  const triggerInventoryAutomation = useCallback(async (inventoryData: any) => {
    try {
      // Get active automation rules for inventory events
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('trigger_type', 'inventory_event')
        .eq('is_active', true);

      if (error) throw error;

      // Execute applicable rules
      const executions = await Promise.all(
        rules.map(rule => 
          executeAutomationRule(rule.id, {
            event: 'stock_updated',
            inventory: inventoryData,
            timestamp: new Date().toISOString()
          })
        )
      );

      return executions;
    } catch (error) {
      console.error('❌ Error triggering inventory automation:', error);
    }
  }, [executeAutomationRule]);

  const triggerInstallationAutomation = useCallback(async (installationData: any) => {
    try {
      // Get active automation rules for installation events
      const { data: rules, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('trigger_type', 'installation_event')
        .eq('is_active', true);

      if (error) throw error;

      // Execute applicable rules
      const executions = await Promise.all(
        rules.map(rule => 
          executeAutomationRule(rule.id, {
            event: 'installation_status_changed',
            installation: installationData,
            timestamp: new Date().toISOString()
          })
        )
      );

      return executions;
    } catch (error) {
      console.error('❌ Error triggering installation automation:', error);
    }
  }, [executeAutomationRule]);

  const createStockAlertRule = useCallback(async (productId: string, threshold: number) => {
    try {
      const rule: AutomationRuleInsert = {
        name: `Stock Alert for Product ${productId}`,
        description: `Automatically alert when stock falls below ${threshold}`,
        trigger_type: 'inventory_event',
        trigger_conditions: {
          event_type: 'stock_low',
          conditions: {
            product_id: productId,
            threshold: threshold
          }
        } as Json,
        action_type: 'send_notification',
        action_config: {
          type: 'stock_alert',
          config: {
            message: `Stock is running low for product ${productId}`,
            recipients: ['warehouse', 'admin'],
            severity: 'medium'
          }
        } as Json,
        is_active: true
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Automation Rule Created",
        description: "Stock alert automation has been set up.",
      });

      return data;
    } catch (error) {
      console.error('❌ Error creating stock alert rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create automation rule.",
      });
    }
  }, [toast]);

  const createReorderRule = useCallback(async (productId: string, reorderPoint: number, reorderQuantity: number) => {
    try {
      const rule: AutomationRuleInsert = {
        name: `Auto Reorder for Product ${productId}`,
        description: `Automatically create purchase order when stock falls below ${reorderPoint}`,
        trigger_type: 'inventory_event',
        trigger_conditions: {
          event_type: 'reorder_point_reached',
          conditions: {
            product_id: productId,
            reorder_point: reorderPoint
          }
        } as Json,
        action_type: 'create_purchase_order',
        action_config: {
          type: 'auto_reorder',
          config: {
            product_id: productId,
            quantity: reorderQuantity,
            urgency: 'normal'
          }
        } as Json,
        is_active: true
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Reorder Rule Created",
        description: "Automatic reordering has been set up.",
      });

      return data;
    } catch (error) {
      console.error('❌ Error creating reorder rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create reorder automation.",
      });
    }
  }, [toast]);

  const createInstallationNotificationRule = useCallback(async () => {
    try {
      const rule: AutomationRuleInsert = {
        name: 'Installation Status Notifications',
        description: 'Send notifications when installation status changes',
        trigger_type: 'installation_event',
        trigger_conditions: {
          event_type: 'status_changed',
          conditions: {
            notify_on: ['scheduled', 'in_progress', 'completed', 'cancelled']
          }
        } as Json,
        action_type: 'send_notification',
        action_config: {
          type: 'installation_update',
          config: {
            message: 'Installation status has been updated',
            recipients: ['customer', 'sales_rep', 'installer'],
            channels: ['email', 'dashboard']
          }
        } as Json,
        is_active: true
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Installation Automation Created",
        description: "Installation notifications have been set up.",
      });

      return data;
    } catch (error) {
      console.error('❌ Error creating installation notification rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create installation automation.",
      });
    }
  }, [toast]);

  return {
    isExecuting,
    executeAutomationRule,
    triggerSalesAutomation,
    triggerInventoryAutomation,
    triggerInstallationAutomation,
    createStockAlertRule,
    createReorderRule,
    createInstallationNotificationRule,
  };
};