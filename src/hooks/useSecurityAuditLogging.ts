// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityLogDetails {
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  success?: boolean;
}

export const useSecurityAuditLogging = () => {
  const [isLogging, setIsLogging] = useState(false);
  const { toast } = useToast();

  const logSecurityEvent = useCallback(async (eventData: SecurityLogDetails) => {
    setIsLogging(true);
    
    try {
      // Get client IP and user agent for enhanced logging
      const userAgent = navigator.userAgent;
      const timestamp = new Date().toISOString();
      
      // Get geolocation if available
      let geolocation = null;
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 5000,
              enableHighAccuracy: false 
            });
          });
          
          geolocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp
          };
        }
      } catch (geoError) {
        // Geolocation not available or denied, continue without it
        console.warn('Geolocation not available:', geoError);
      }

      const { error } = await supabase.rpc('log_security_event', {
        p_action_type: eventData.action_type,
        p_resource_type: eventData.resource_type || null,
        p_resource_id: eventData.resource_id || null,
        p_details: eventData.details ? JSON.stringify(eventData.details) : null,
        p_user_agent: userAgent,
        p_success: eventData.success !== false,
        p_risk_level: eventData.risk_level || 'low',
        p_geolocation: geolocation ? JSON.stringify(geolocation) : null
      });

      if (error) {
        console.error('Failed to log security event:', error);
        throw error;
      }

      // Show toast for high-risk events
      if (eventData.risk_level && ['high', 'critical'].includes(eventData.risk_level)) {
        toast({
          variant: "destructive",
          title: "Security Alert",
          description: `High-risk activity logged: ${eventData.action_type}`,
        });
      }

    } catch (error) {
      console.error('Security logging failed:', error);
      // Don't throw - logging failures shouldn't break the app
    } finally {
      setIsLogging(false);
    }
  }, [toast]);

  // Quick helper methods for common security events
  const logLogin = useCallback((success: boolean, details?: Record<string, any>) => {
    return logSecurityEvent({
      action_type: 'user_login',
      resource_type: 'auth',
      success,
      risk_level: success ? 'low' : 'medium',
      details: { ...details, timestamp: new Date().toISOString() }
    });
  }, [logSecurityEvent]);

  const logLogout = useCallback(() => {
    return logSecurityEvent({
      action_type: 'user_logout',
      resource_type: 'auth',
      success: true,
      risk_level: 'low'
    });
  }, [logSecurityEvent]);

  const logFailedAuth = useCallback((attemptType: string, details?: Record<string, any>) => {
    return logSecurityEvent({
      action_type: 'auth_failure',
      resource_type: 'auth',
      success: false,
      risk_level: 'high',
      details: { attempt_type: attemptType, ...details }
    });
  }, [logSecurityEvent]);

  const logDataAccess = useCallback((resourceType: string, resourceId?: string, action = 'read') => {
    return logSecurityEvent({
      action_type: `data_${action}`,
      resource_type: resourceType,
      resource_id: resourceId,
      success: true,
      risk_level: action === 'read' ? 'low' : 'medium'
    });
  }, [logSecurityEvent]);

  const logPrivilegedAction = useCallback((action: string, resourceType?: string, resourceId?: string) => {
    return logSecurityEvent({
      action_type: action,
      resource_type: resourceType,
      resource_id: resourceId,
      success: true,
      risk_level: 'high'
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logLogin,
    logLogout,
    logFailedAuth,
    logDataAccess,
    logPrivilegedAction,
    isLogging
  };
};