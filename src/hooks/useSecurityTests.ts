// @ts-nocheck
import { useCallback } from "react";
import type { BusinessTest } from "./useBusinessTestTypes";
import { supabase } from "@/integrations/supabase/client";

export const useSecurityTests = () => {
  const createSecurityTests = useCallback((): BusinessTest[] => {
    const tests: BusinessTest[] = [
      {
        name: "Security Audit Log Test",
        category: "Security Management",
        description: "Test security event logging and audit trail functionality",
        module: "Security",
        priority: "Critical",
        fn: async () => {
          const startTime = Date.now();

          try {
            // Test audit log creation via function
            const { data: logData, error: logError } = await supabase
              .rpc('log_security_event', {
                p_action_type: 'test_login_attempt',
                p_resource_type: 'authentication',
                p_resource_id: '00000000-0000-0000-0000-000000000000',
                p_details: { test: true, ip: '127.0.0.1' },
                p_success: true,
                p_risk_level: 'low'
              });

            if (logError) throw logError;

            // Verify log was created
            const { data: auditLogs, error: queryError } = await supabase
              .from('security_audit_logs')
              .select('*')
              .eq('action_type', 'test_login_attempt')
              .limit(1);

            if (queryError) throw queryError;

            const logCreated = auditLogs && auditLogs.length > 0;
            const correctRiskLevel = auditLogs?.[0]?.risk_level === 'low';

            return {
              success: logCreated && correctRiskLevel,
              message: logCreated ? 
                "Security audit log created successfully with correct risk level" :
                "Security audit log creation failed",
              details: {
                logId: auditLogs?.[0]?.id,
                actionType: auditLogs?.[0]?.action_type,
                riskLevel: auditLogs?.[0]?.risk_level,
                success: auditLogs?.[0]?.success,
                logCreated
              },
              duration: Date.now() - startTime,
              testName: "Security Audit Log Test",
              category: "Security Management",
              priority: "Critical",
              module: "Security"
            };

          } catch (err: any) {
            return {
              success: false,
              message: "Security audit log test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Security Audit Log Test",
              category: "Security Management",
              priority: "Critical",
              module: "Security"
            };
          }
        }
      },

      {
        name: "Rate Limiting Test",
        category: "Security Management",
        description: "Test rate limiting functionality for API endpoints",
        module: "Security",
        priority: "High",
        fn: async () => {
          const startTime = Date.now();

          try {
            const testIdentifier = 'test-user-' + Date.now();
            const testEndpoint = '/api/test';

            // Test rate limit function
            const { data: rateLimitResult, error: rateLimitError } = await supabase
              .rpc('check_rate_limit', {
                p_identifier: testIdentifier,
                p_endpoint: testEndpoint,
                p_max_attempts: 3,
                p_window_minutes: 15
              });

            if (rateLimitError) throw rateLimitError;

            const result = rateLimitResult as any;
            const firstAttemptAllowed = result?.allowed === true;
            const correctAttemptCount = result?.attempts === 1;
            const correctRemaining = result?.remaining === 2;

            // Make additional attempts to test limiting
            await supabase.rpc('check_rate_limit', {
              p_identifier: testIdentifier,
              p_endpoint: testEndpoint,
              p_max_attempts: 3,
              p_window_minutes: 15
            });

            await supabase.rpc('check_rate_limit', {
              p_identifier: testIdentifier,
              p_endpoint: testEndpoint,
              p_max_attempts: 3,
              p_window_minutes: 15
            });

            // Fourth attempt should be blocked
            const { data: blockedResult } = await supabase.rpc('check_rate_limit', {
              p_identifier: testIdentifier,
              p_endpoint: testEndpoint,
              p_max_attempts: 3,
              p_window_minutes: 15
            });

            const blockedData = blockedResult as any;
            const rateLimitWorking = blockedData?.allowed === false && blockedData?.blocked === true;

            return {
              success: firstAttemptAllowed && correctAttemptCount && rateLimitWorking,
              message: rateLimitWorking ? 
                "Rate limiting working correctly - blocked after max attempts" :
                "Rate limiting test failed",
              details: {
                firstAttemptAllowed,
                correctAttemptCount,
                correctRemaining,
                rateLimitWorking,
                blockedAfterMax: blockedData?.blocked,
                finalAttempts: blockedData?.attempts
              },
              duration: Date.now() - startTime,
              testName: "Rate Limiting Test",
              category: "Security Management",
              priority: "High",
              module: "Security"
            };

          } catch (err: any) {
            return {
              success: false,
              message: "Rate limiting test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Rate Limiting Test",
              category: "Security Management",
              priority: "High",
              module: "Security"
            };
          }
        }
      },

      {
        name: "System Health Check Test",
        category: "Security Management",
        description: "Test system health monitoring and security score calculation",
        module: "Security",
        priority: "Medium",
        fn: async () => {
          const startTime = Date.now();

          try {
            // Call system health function
            const { data: healthData, error: healthError } = await supabase
              .rpc('get_system_health_status');

            if (healthError) throw healthError;

            const healthResult = healthData as any;
            const hasHealthData = healthResult && typeof healthResult === 'object';
            const hasSecurityScore = healthResult?.security_score !== undefined;
            const hasTableCounts = healthResult?.table_counts && typeof healthResult.table_counts === 'object';
            const hasRecommendations = Array.isArray(healthResult?.recommendations);

            const systemHealthy = healthResult?.database_status === 'healthy';
            const securityScoreValid = healthResult?.security_score >= 0 && healthResult?.security_score <= 100;

            return {
              success: hasHealthData && hasSecurityScore && systemHealthy && securityScoreValid,
              message: systemHealthy ? 
                `System health check passed - Security score: ${healthResult?.security_score}%` :
                "System health check failed",
              details: {
                databaseStatus: healthResult?.database_status,
                securityScore: healthResult?.security_score,
                tableCount: Object.keys(healthResult?.table_counts || {}).length,
                recommendationCount: healthResult?.recommendations?.length || 0,
                tablesWithoutRls: healthResult?.tables_without_rls,
                systemHealthy,
                securityScoreValid
              },
              duration: Date.now() - startTime,
              testName: "System Health Check Test",
              category: "Security Management",
              priority: "Medium",
              module: "Security"
            };

          } catch (err: any) {
            return {
              success: false,
              message: "System health check test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "System Health Check Test",
              category: "Security Management",
              priority: "Medium",
              module: "Security"
            };
          }
        }
      }
    ];

    return tests;
  }, []);

  return { createSecurityTests };
};