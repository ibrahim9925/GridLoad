// @ts-nocheck

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  latency?: number;
}

export const useHealthChecks = () => {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const runHealthChecks = async () => {
    setIsChecking(true);
    const checks: HealthCheck[] = [];

    // Test database connection
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from('staff').select('count').limit(1);
      const latency = Date.now() - startTime;
      
      if (error) {
        checks.push({
          name: 'Database Connection',
          status: 'error',
          message: `Failed: ${error.message}`,
          latency
        });
      } else {
        checks.push({
          name: 'Database Connection',
          status: 'healthy',
          message: 'Connected successfully',
          latency
        });
      }
    } catch (err) {
      checks.push({
        name: 'Database Connection',
        status: 'error',
        message: 'Connection failed',
      });
    }

    // Test authentication
    try {
      const startTime = Date.now();
      const { data: { session }, error } = await supabase.auth.getSession();
      const latency = Date.now() - startTime;
      
      if (error) {
        checks.push({
          name: 'Authentication',
          status: 'warning',
          message: `Auth issue: ${error.message}`,
          latency
        });
      } else if (session) {
        checks.push({
          name: 'Authentication',
          status: 'healthy',
          message: 'User authenticated',
          latency
        });
      } else {
        checks.push({
          name: 'Authentication',
          status: 'warning',
          message: 'No active session',
          latency
        });
      }
    } catch (err) {
      checks.push({
        name: 'Authentication',
        status: 'error',
        message: 'Auth check failed',
      });
    }

    // Test key tables
    const tablesToTest = ['products', 'customers', 'sales', 'leads'] as const;
    for (const table of tablesToTest) {
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.from(table).select('count').limit(1);
        const latency = Date.now() - startTime;
        
        if (error) {
          checks.push({
            name: `Table: ${table}`,
            status: 'error',
            message: `Query failed: ${error.message}`,
            latency
          });
        } else {
          const status = latency > 1000 ? 'warning' : 'healthy';
          checks.push({
            name: `Table: ${table}`,
            status,
            message: status === 'warning' ? 'Slow response' : 'Accessible',
            latency
          });
        }
      } catch (err) {
        checks.push({
          name: `Table: ${table}`,
          status: 'error',
          message: 'Access failed',
        });
      }
    }

    setHealthChecks(checks);
    setIsChecking(false);
  };

  return {
    healthChecks,
    isChecking,
    runHealthChecks
  };
};
