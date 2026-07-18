// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RateLimitResult {
  allowed: boolean;
  blocked?: boolean;
  attempts?: number;
  remaining?: number;
  reset_at?: string;
  blocked_until?: string;
  reason?: string;
}

interface RateLimitConfig {
  maxAttempts?: number;
  windowMinutes?: number;
  blockMinutes?: number;
}

export const useAdvancedRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkRateLimit = useCallback(async (
    identifier: string,
    endpoint: string,
    config: RateLimitConfig = {}
  ): Promise<RateLimitResult> => {
    setIsChecking(true);
    
    try {
      const {
        maxAttempts = 5,
        windowMinutes = 15,
        blockMinutes = 30
      } = config;

      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_max_attempts: maxAttempts,
        p_window_minutes: windowMinutes,
        p_block_minutes: blockMinutes
      });

      if (error) throw error;

      const result = (data as unknown) as RateLimitResult;

      // Show user-friendly messages for rate limiting
      if (result.blocked) {
        const blockedUntil = result.blocked_until ? new Date(result.blocked_until) : null;
        const timeRemaining = blockedUntil ? Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60)) : 0;
        
        toast({
          variant: "destructive",
          title: "Too Many Attempts",
          description: `Access temporarily blocked. Try again in ${timeRemaining} minutes.`,
        });
      } else if (result.remaining !== undefined && result.remaining <= 2) {
        toast({
          variant: "destructive",
          title: "Rate Limit Warning",
          description: `You have ${result.remaining} attempts remaining before being temporarily blocked.`,
        });
      }

      return result;

    } catch (error: any) {
      console.error('Rate limit check failed:', error);
      
      // Return safe default in case of error
      return {
        allowed: true,
        attempts: 1,
        remaining: 4
      };
    } finally {
      setIsChecking(false);
    }
  }, [toast]);

  // Check if an IP or user is currently blocked
  const isBlocked = useCallback(async (
    identifier: string,
    endpoint: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('blocked_until')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .single();

      if (error || !data) return false;

      if (data.blocked_until) {
        const blockedUntil = new Date(data.blocked_until);
        return blockedUntil > new Date();
      }

      return false;
    } catch (error) {
      console.error('Failed to check block status:', error);
      return false;
    }
  }, []);

  // Get rate limit info for an identifier
  const getRateLimitInfo = useCallback(async (
    identifier: string,
    endpoint: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('endpoint', endpoint)
        .single();

      if (error || !data) return null;

      return {
        attempts: data.attempts,
        firstAttempt: data.first_attempt,
        lastAttempt: data.last_attempt,
        blockedUntil: data.blocked_until,
        isBlocked: data.blocked_until ? new Date(data.blocked_until) > new Date() : false
      };
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
      return null;
    }
  }, []);

  // Clear rate limit for an identifier (admin only)
  const clearRateLimit = useCallback(async (
    identifier: string,
    endpoint: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('rate_limits')
        .delete()
        .eq('identifier', identifier)
        .eq('endpoint', endpoint);

      if (error) throw error;

      toast({
        title: "Rate Limit Cleared",
        description: `Rate limit has been cleared for ${identifier}`,
      });

      return true;
    } catch (error: any) {
      console.error('Failed to clear rate limit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear rate limit. Check permissions.",
      });
      return false;
    }
  }, [toast]);

  return {
    isChecking,
    checkRateLimit,
    isBlocked,
    getRateLimitInfo,
    clearRateLimit
  };
};