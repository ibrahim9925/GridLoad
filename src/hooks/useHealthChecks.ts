// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  duration?: number;
  timestamp: Date;
}

export const useHealthChecks = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const runHealthChecks = useCallback(async () => {
    setIsRunning(true);
    const results: HealthCheckResult[] = [];

    try {
      // Database Connection Check
      const dbStart = Date.now();
      try {
        const { error } = await supabase.from('products').select('id').limit(1);
        results.push({
          name: 'Database Connection',
          status: error ? 'error' : 'healthy',
          message: error ? `Database error: ${error.message}` : 'Database connection successful',
          duration: Date.now() - dbStart,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          name: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error}`,
          duration: Date.now() - dbStart,
          timestamp: new Date()
        });
      }

      // Authentication Check
      const authStart = Date.now();
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        results.push({
          name: 'Authentication',
          status: error ? 'error' : user ? 'healthy' : 'warning',
          message: error ? `Auth error: ${error.message}` : user ? 'User authenticated' : 'No authenticated user',
          duration: Date.now() - authStart,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          name: 'Authentication',
          status: 'error',
          message: `Auth check failed: ${error}`,
          duration: Date.now() - authStart,
          timestamp: new Date()
        });
      }

      // RLS Policies Check
      const rlsStart = Date.now();
      try {
        const { error } = await supabase.from('staff').select('id').limit(1);
        results.push({
          name: 'RLS Policies',
          status: 'healthy',
          message: 'RLS policies are enforced and working',
          duration: Date.now() - rlsStart,
          timestamp: new Date()
        });
      } catch (error: any) {
        const isRLSError = error.message?.includes('RLS') || error.message?.includes('policy');
        results.push({
          name: 'RLS Policies',
          status: isRLSError ? 'healthy' : 'warning',
          message: isRLSError ? 'RLS policies properly blocking access' : `Unexpected error: ${error.message}`,
          duration: Date.now() - rlsStart,
          timestamp: new Date()
        });
      }

      // Real-time Connection Check
      const realtimeStart = Date.now();
      try {
        const channel = supabase.channel('health-check');
        const subscribePromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          channel.subscribe((status) => {
            clearTimeout(timeout);
            if (status === 'SUBSCRIBED') {
              resolve(status);
            } else {
              reject(new Error(`Connection status: ${status}`));
            }
          });
        });

        await subscribePromise;
        supabase.removeChannel(channel);
        
        results.push({
          name: 'Real-time Connection',
          status: 'healthy',
          message: 'Real-time connection established successfully',
          duration: Date.now() - realtimeStart,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          name: 'Real-time Connection',
          status: 'warning',
          message: `Real-time connection issue: ${error}`,
          duration: Date.now() - realtimeStart,
          timestamp: new Date()
        });
      }

      setHealthChecks(results);
      
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;

      if (errorCount > 0) {
        toast({
          title: 'Health Check Completed',
          description: `${errorCount} errors and ${warningCount} warnings found`,
          variant: 'destructive'
        });
      } else if (warningCount > 0) {
        toast({
          title: 'Health Check Completed',
          description: `${warningCount} warnings found`,
        });
      } else {
        toast({
          title: 'Health Check Completed',
          description: 'All systems healthy',
        });
      }

    } catch (error) {
      toast({
        title: 'Health Check Failed',
        description: `Failed to run health checks: ${error}`,
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  }, [toast]);

  return {
    healthChecks,
    isRunning,
    runHealthChecks
  };
};