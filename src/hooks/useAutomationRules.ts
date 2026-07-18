// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  conditions: any;
  actions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
  created_by?: string;
}

export const useAutomationRules = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load automation rules:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load automation rules",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRule = async (ruleData: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'last_executed_at'>) => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert([ruleData])
        .select()
        .single();

      if (error) throw error;

      setRules(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Automation rule created successfully",
      });
      return data;
    } catch (error) {
      console.error('Failed to create automation rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create automation rule",
      });
      throw error;
    }
  };

  const updateRule = async (id: string, updates: Partial<AutomationRule>) => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRules(prev => prev.map(rule => rule.id === id ? data : rule));
      toast({
        title: "Success",
        description: "Automation rule updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Failed to update automation rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update automation rule",
      });
      throw error;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== id));
      toast({
        title: "Success",
        description: "Automation rule deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete automation rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete automation rule",
      });
      throw error;
    }
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    return updateRule(id, { is_active: isActive });
  };

  useEffect(() => {
    loadRules();
  }, []);

  return {
    rules,
    isLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    reload: loadRules
  };
};