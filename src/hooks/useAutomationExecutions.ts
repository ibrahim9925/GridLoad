// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationExecution {
  id: string;
  rule_id: string;
  result: any;
  status: string;
  error?: string;
  executed_at: string;
  automation_rules?: {
    name: string;
    description?: string;
  };
}

export const useAutomationExecutions = () => {
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadExecutions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('automation_executions')
        .select(`
          *,
          automation_rules (
            name,
            description
          )
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error loading automation executions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load automation executions",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const executeAutomationRule = useCallback(async (
    ruleId: string, 
    triggerData: any
  ) => {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .insert({
          rule_id: ruleId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate automation execution (in real app, this would be handled by background jobs)
      setTimeout(async () => {
        await supabase
          .from('automation_executions')
          .update({
            status: 'completed',
            result: { success: true, processed: true }
          })
          .eq('id', data.id);
        
        loadExecutions();
      }, 2000);

      toast({
        title: "Automation Triggered",
        description: "Automation rule is being executed",
      });

      return data;
    } catch (error) {
      console.error('Error executing automation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to execute automation rule",
      });
      throw error;
    }
  }, [toast, loadExecutions]);

  const retryExecution = useCallback(async (executionId: string) => {
    try {
      const { error } = await supabase
        .from('automation_executions')
        .update({
          status: 'pending',
          error: null
        })
        .eq('id', executionId);

      if (error) throw error;

      toast({
        title: "Retry Initiated",
        description: "Automation execution is being retried",
      });

      loadExecutions();
    } catch (error) {
      console.error('Error retrying execution:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to retry automation execution",
      });
    }
  }, [toast, loadExecutions]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  return {
    executions,
    isLoading,
    executeAutomationRule,
    retryExecution,
    reload: loadExecutions
  };
};