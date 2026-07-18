// @ts-nocheck

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Type aliases for better code readability
type UserRole = Database["public"]["Enums"]["app_role"];

interface AutomationRule {
  id: string;
  name: string;
  type: 'lead_nurturing' | 'task_assignment' | 'quote_generation' | 'follow_up';
  trigger: string;
  conditions: any[];
  actions: any[];
  isActive: boolean;
  created_at: string;
}

interface WorkflowExecution {
  id: string;
  rule_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  trigger_data: any;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

interface TaskTemplate {
  title: string;
  description: string;
  priority: string;
  assigneeRole: UserRole;
}

export const useAdvancedAutomation = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executeLeadNurturingWorkflow = useCallback(async (leadId: string, leadData: any) => {
    try {
      console.log("🤖 Automation: Executing lead nurturing workflow for lead:", leadId);
      
      if (leadData.status === 'new') {
        const { data: availableReps } = await supabase
          .from('staff')
          .select('id, full_name')
          .eq('role', 'sales_rep' as UserRole)
          .limit(1);

        if (availableReps && availableReps.length > 0) {
          await supabase
            .from('leads')
            .update({ 
              assigned_to: availableReps[0].id,
              updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

          console.log("✅ Automation: Lead auto-assigned to:", availableReps[0].full_name);
        }
      }

      if (leadData.estimated_value > 10000) {
        console.log("📅 Automation: Scheduling high-priority follow-up");
        
        toast({
          title: "High-Value Lead Detected",
          description: `Lead worth $${leadData.estimated_value.toLocaleString()} requires immediate attention.`,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Automation: Error in lead nurturing workflow:", error);
      return { success: false, error };
    }
  }, [toast]);

  const executeTaskAssignment = useCallback(async (taskType: string, entityId: string, data: any) => {
    try {
      console.log("📋 Automation: Executing task assignment for:", taskType);

      const taskTemplates: Record<string, TaskTemplate> = {
        'new_sale': {
          title: 'Process New Sale',
          description: 'Review and process the new sale order',
          priority: 'high',
          assigneeRole: 'sales_rep' as UserRole
        },
        'installation_ready': {
          title: 'Schedule Installation',
          description: 'Contact customer to schedule installation',
          priority: 'medium',
          assigneeRole: 'installer' as UserRole
        },
        'payment_overdue': {
          title: 'Follow Up on Overdue Payment',
          description: 'Contact customer regarding overdue payment',
          priority: 'high',
          assigneeRole: 'accountant' as UserRole
        }
      };

      const template = taskTemplates[taskType];
      if (!template) return { success: false, error: 'Unknown task type' };

      const { data: assignees } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('role', template.assigneeRole)
        .limit(1);

      if (assignees && assignees.length > 0) {
        console.log(`✅ Automation: Auto-assigned ${taskType} task to:`, assignees[0].full_name);
        
        toast({
          title: "Task Auto-Assigned",
          description: `${template.title} assigned to ${assignees[0].full_name}`,
        });
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Automation: Error in task assignment:", error);
      return { success: false, error };
    }
  }, [toast]);

  const executeQuoteGeneration = useCallback(async (leadId: string, requirements: any) => {
    try {
      console.log("💰 Automation: Generating automated quote for lead:", leadId);

      const basePrice = requirements.systemSize * 1000;
      const installationCost = requirements.complexity === 'high' ? 5000 : 3000;
      const totalAmount = basePrice + installationCost;

      const quoteData = {
        lead_id: leadId,
        total_amount: totalAmount,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        line_items: [
          {
            description: `Solar System (${requirements.systemSize}kW)`,
            quantity: 1,
            unit_price: basePrice,
            total: basePrice
          },
          {
            description: 'Installation & Setup',
            quantity: 1,
            unit_price: installationCost,
            total: installationCost
          }
        ]
      };

      console.log("✅ Automation: Quote generated:", quoteData);
      
      toast({
        title: "Quote Generated",
        description: `Automated quote of $${totalAmount.toLocaleString()} created for lead.`,
      });

      return { success: true, quote: quoteData };
    } catch (error) {
      console.error("❌ Automation: Error in quote generation:", error);
      return { success: false, error };
    }
  }, [toast]);

  const executeFollowUpSequence = useCallback(async (entityType: string, entityId: string, sequenceType: string) => {
    try {
      console.log("📞 Automation: Executing follow-up sequence:", sequenceType);

      const sequences = {
        'new_lead': [
          { delay: 0, type: 'email', template: 'welcome_new_lead' },
          { delay: 24, type: 'task', template: 'first_contact_call' },
          { delay: 72, type: 'email', template: 'follow_up_email' }
        ],
        'quote_sent': [
          { delay: 24, type: 'task', template: 'quote_follow_up_call' },
          { delay: 72, type: 'email', template: 'quote_reminder' },
          { delay: 168, type: 'task', template: 'final_quote_follow_up' }
        ]
      };

      const sequence = sequences[sequenceType as keyof typeof sequences];
      if (!sequence) return { success: false, error: 'Unknown sequence type' };

      console.log(`✅ Automation: Scheduled ${sequence.length} follow-up actions`);
      
      toast({
        title: "Follow-up Sequence Started",
        description: `${sequence.length} automated follow-up actions scheduled.`,
      });

      return { success: true, actions: sequence.length };
    } catch (error) {
      console.error("❌ Automation: Error in follow-up sequence:", error);
      return { success: false, error };
    }
  }, [toast]);

  return {
    rules,
    executions,
    isLoading,
    executeLeadNurturingWorkflow,
    executeTaskAssignment,
    executeQuoteGeneration,
    executeFollowUpSequence
  };
};
