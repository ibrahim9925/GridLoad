// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAuditLogging } from './useSecurityAuditLogging';
import { useToast } from '@/hooks/use-toast';

interface SecurityMetrics {
  failedLogins: number;
  activeSessions: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastSecurityEvent: Date | null;
  mfaEnabled: boolean;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

export const useEnhancedSecurity = () => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    failedLogins: 0,
    activeSessions: 0,
    riskLevel: 'low',
    lastSecurityEvent: null,
    mfaEnabled: false
  });
  
  const [rateLimitData, setRateLimitData] = useState<Map<string, { attempts: number; firstAttempt: number; blockedUntil?: number }>>(new Map());
  const [isBlocked, setIsBlocked] = useState(false);
  
  const { logSecurityEvent, logFailedAuth } = useSecurityAuditLogging();
  const { toast } = useToast();

  // Default rate limiting configuration
  const defaultRateLimit: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  };

  // Admin session timeout (2 hours instead of 24)
  const ADMIN_SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

  // Rate limiting implementation
  const checkRateLimit = useCallback((identifier: string, config: RateLimitConfig = defaultRateLimit): boolean => {
    const now = Date.now();
    const userAttempts = rateLimitData.get(identifier);

    if (!userAttempts) {
      setRateLimitData(prev => new Map(prev.set(identifier, { attempts: 1, firstAttempt: now })));
      return true; // Allow first attempt
    }

    // Check if user is currently blocked
    if (userAttempts.blockedUntil && now < userAttempts.blockedUntil) {
      setIsBlocked(true);
      return false;
    }

    // Reset window if enough time has passed
    if (now - userAttempts.firstAttempt > config.windowMs) {
      setRateLimitData(prev => new Map(prev.set(identifier, { attempts: 1, firstAttempt: now })));
      return true;
    }

    // Check if max attempts exceeded
    if (userAttempts.attempts >= config.maxAttempts) {
      const blockedUntil = now + config.blockDurationMs;
      setRateLimitData(prev => new Map(prev.set(identifier, { 
        ...userAttempts, 
        blockedUntil 
      })));
      setIsBlocked(true);
      
      // Log security event for rate limit exceeded
      logSecurityEvent({
        action_type: 'rate_limit_exceeded',
        resource_type: 'auth',
        success: false,
        risk_level: 'high',
        details: {
          identifier,
          attempts: userAttempts.attempts + 1,
          blocked_until: new Date(blockedUntil).toISOString()
        }
      });

      toast({
        variant: "destructive",
        title: "Security Alert",
        description: `Too many attempts. Access blocked for ${Math.round(config.blockDurationMs / (60 * 1000))} minutes.`,
      });

      return false;
    }

    // Increment attempts
    setRateLimitData(prev => new Map(prev.set(identifier, { 
      ...userAttempts, 
      attempts: userAttempts.attempts + 1 
    })));

    return true;
  }, [rateLimitData, logSecurityEvent, toast]);

  // Device fingerprinting
  const generateDeviceFingerprint = useCallback((): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      canvas: canvas.toDataURL(),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };
    
    return btoa(JSON.stringify(fingerprint));
  }, []);

  // Session management
  const createSecureSession = useCallback(async (sessionToken: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user for session creation');
        return;
      }
      
      const deviceFingerprint = generateDeviceFingerprint();
      const expiresAt = new Date(Date.now() + (4 * 60 * 60 * 1000)); // 4 hours for admin sessions
      
      // Use upsert to handle duplicate session tokens gracefully
      const { error } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: user.id,
          session_token: sessionToken,
          device_fingerprint: deviceFingerprint,
          expires_at: expiresAt.toISOString(),
          login_method: 'password',
          user_agent: navigator.userAgent,
          is_active: true
        }, {
          onConflict: 'session_token'
        });

      if (error) {
        console.error('Session creation failed:', error);
        return; // Don't throw - this is non-critical
      }

      await logSecurityEvent({
        action_type: 'secure_session_created',
        resource_type: 'session',
        success: true,
        risk_level: 'medium',
        details: {
          expires_at: expiresAt.toISOString(),
          device_fingerprint: deviceFingerprint.substring(0, 20) + '...' // Log partial fingerprint
        }
      });

    } catch (error) {
      console.error('Failed to create secure session:', error);
      throw error;
    }
  }, [generateDeviceFingerprint, logSecurityEvent]);

  // Monitor security events
  const monitorSecurityEvents = useCallback(async () => {
    try {
      // Get recent security events
      const { data: recentEvents, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (recentEvents) {
        const failedLogins = recentEvents.filter(e => 
          e.action_type === 'auth_failure' || e.action_type === 'user_login' && !e.success
        ).length;

        const criticalEvents = recentEvents.filter(e => e.risk_level === 'critical').length;
        const highRiskEvents = recentEvents.filter(e => e.risk_level === 'high').length;

        let riskLevel: SecurityMetrics['riskLevel'] = 'low';
        if (criticalEvents > 0) riskLevel = 'critical';
        else if (highRiskEvents > 3) riskLevel = 'high';
        else if (failedLogins > 5) riskLevel = 'medium';

        setSecurityMetrics(prev => ({
          ...prev,
          failedLogins,
          riskLevel,
          lastSecurityEvent: recentEvents[0] ? new Date(recentEvents[0].created_at) : null
        }));
      }

      // Get active sessions count
      const { count: activeSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      setSecurityMetrics(prev => ({
        ...prev,
        activeSessions: activeSessions || 0
      }));

    } catch (error) {
      console.error('Failed to monitor security events:', error);
    }
  }, []);

  // Check MFA status
  const checkMFAStatus = useCallback(async () => {
    try {
      const { data: mfaSettings } = await supabase
        .from('user_mfa_settings')
        .select('mfa_enabled')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      setSecurityMetrics(prev => ({
        ...prev,
        mfaEnabled: mfaSettings?.mfa_enabled || false
      }));
    } catch (error) {
      console.error('Failed to check MFA status:', error);
    }
  }, []);

  // Cleanup expired sessions
  const cleanupExpiredSessions = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('cleanup_expired_sessions');
      if (error) throw error;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }, []);

  // Initialize monitoring
  useEffect(() => {
    monitorSecurityEvents();
    checkMFAStatus();
    cleanupExpiredSessions();

    // Set up periodic monitoring
    const interval = setInterval(() => {
      monitorSecurityEvents();
      cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [monitorSecurityEvents, checkMFAStatus, cleanupExpiredSessions]);

  return {
    securityMetrics,
    checkRateLimit,
    isBlocked,
    createSecureSession,
    generateDeviceFingerprint,
    monitorSecurityEvents,
    checkMFAStatus
  };
};