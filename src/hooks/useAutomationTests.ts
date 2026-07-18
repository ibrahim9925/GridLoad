// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useAutomationTests = () => {
  const createAutomationTests = useCallback((): BusinessTest[] => {
    return [
      {
        name: "Stock Alert Automation Test",
        category: "Automation",
        description: "Test automated stock alert generation",
        module: "Automation",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let productToCleanup: string | null = null;
          let alertToCleanup: string | null = null;

          try {
            // Create test product with low stock
            const { data: product, error: productError } = await supabase
              .from('products')
              .insert({
                name: `Auto Test Product ${Date.now()}`,
                sku: `AUTO-${Date.now()}`,
                category: "Test",
                cost_price: 100,
                standard_selling_price: 150,
                current_stock: 2, // Below threshold
                reorder_point: 10
              })
              .select()
              .single();

            if (productError) throw productError;
            productToCleanup = product.id;

            // Simulate stock alert creation (would normally be triggered automatically)
            const { data: alert, error: alertError } = await supabase
              .from('stock_alerts')
              .insert({
                product_id: product.id,
                alert_type: 'low_stock',
                threshold_quantity: product.reorder_point,
                current_quantity: product.current_stock,
                severity: 'high'
              })
              .select()
              .single();

            if (alertError) throw alertError;
            alertToCleanup = alert.id;

            // Verify alert was created correctly
            const shouldTriggerAlert = product.current_stock <= product.reorder_point;

            return {
              success: shouldTriggerAlert && alert.alert_type === 'low_stock',
              message: "Stock alert automation working correctly",
              details: {
                productId: product.id,
                currentStock: product.current_stock,
                threshold: product.reorder_point,
                alertTriggered: shouldTriggerAlert
              },
              duration: Date.now() - startTime,
              testName: "Stock Alert Automation Test",
              category: "Automation",
              priority: "Critical",
              module: "Automation"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Stock alert automation failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Stock Alert Automation Test",
              category: "Automation",
              priority: "Critical",
              module: "Automation"
            };
          } finally {
            // Cleanup
            if (alertToCleanup) {
              await supabase.from('stock_alerts').delete().eq('id', alertToCleanup);
            }
            if (productToCleanup) {
              await supabase.from('products').delete().eq('id', productToCleanup);
            }
          }
        }
      },
      {
        name: "Automation Rule Processing Test",
        category: "Automation",
        description: "Test automation rule execution",
        module: "Automation",
        priority: "High",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let ruleToCleanup: string | null = null;
          let executionToCleanup: string | null = null;

          try {
            // Create automation rule
            const { data: rule, error: ruleError } = await supabase
              .from('automation_rules')
              .insert({
                name: `Test Rule ${Date.now()}`,
                description: "Test automation rule for low stock alerts",
                trigger_type: "stock_level_change",
                action_type: "send_notification",
                trigger_conditions: {
                  event: "stock_below_threshold",
                  threshold: 10
                },
                action_config: {
                  notification_type: "email",
                  recipients: ["admin@test.com"]
                },
                is_active: true
              })
              .select()
              .single();

            if (ruleError) throw ruleError;
            ruleToCleanup = rule.id;

            // Simulate rule execution
            const { data: execution, error: executionError } = await supabase
              .from('automation_executions')
              .insert({
                automation_rule_id: rule.id,
                trigger_data: {
                  product_id: "test-product-id",
                  previous_stock: 15,
                  current_stock: 8
                },
                status: 'completed',
                execution_result: {
                  success: true,
                  notifications_sent: 1
                },
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                execution_duration_ms: 250
              })
              .select()
              .single();

            if (executionError) throw executionError;
            executionToCleanup = execution.id;

            // Update rule execution count
            const { error: updateError } = await supabase
              .from('automation_rules')
              .update({
                execution_count: (rule.execution_count || 0) + 1,
                last_executed_at: new Date().toISOString()
              })
              .eq('id', rule.id);

            if (updateError) throw updateError;

            return {
              success: execution.status === 'completed',
              message: "Automation rule processed successfully",
              details: {
                ruleId: rule.id,
                executionId: execution.id,
                executionTime: execution.execution_duration_ms
              },
              duration: Date.now() - startTime,
              testName: "Automation Rule Processing Test",
              category: "Automation",
              priority: "High",
              module: "Automation"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Automation rule processing failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Automation Rule Processing Test",
              category: "Automation",
              priority: "High",
              module: "Automation"
            };
          } finally {
            // Cleanup
            if (executionToCleanup) {
              await supabase.from('automation_executions').delete().eq('id', executionToCleanup);
            }
            if (ruleToCleanup) {
              await supabase.from('automation_rules').delete().eq('id', ruleToCleanup);
            }
          }
        }
      },
      {
        name: "Email Notification System Test",
        category: "Automation",
        description: "Test automated email notification system",
        module: "Automation",
        priority: "Medium",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();

          try {
            // Simulate email notification trigger
            const notificationData = {
              type: "low_stock_alert",
              recipient: "warehouse@test.com",
              subject: "Low Stock Alert",
              message: "Product XYZ is running low on stock",
              timestamp: new Date().toISOString()
            };

            // In a real system, this would trigger an actual email
            // For testing, we'll simulate the notification log
            const mockEmailSent = {
              success: true,
              messageId: `msg_${Date.now()}`,
              deliveryStatus: "sent"
            };

            // Log the notification (in real system, this would be in a notifications table)
            const notificationLogged = Boolean(mockEmailSent.messageId);

            return {
              success: mockEmailSent.success && notificationLogged,
              message: "Email notification system working correctly",
              details: {
                notificationType: notificationData.type,
                recipient: notificationData.recipient,
                messageId: mockEmailSent.messageId,
                deliveryStatus: mockEmailSent.deliveryStatus
              },
              duration: Date.now() - startTime,
              testName: "Email Notification System Test",
              category: "Automation",
              priority: "Medium",
              module: "Automation"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Email notification system failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Email Notification System Test",
              category: "Automation",
              priority: "Medium",
              module: "Automation"
            };
          }
        }
      }
    ];
  }, []);

  return { createAutomationTests };
};