// @ts-nocheck
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSecurityAuditLogging } from './useSecurityAuditLogging';

interface MfaSettings {
  mfa_enabled: boolean;
  is_setup_complete: boolean;
  mfa_method: string;
  grace_period_expires_at: string | null;
  backup_codes_encrypted: string[] | null;
}

interface EnrollmentSession {
  session_token: string;
  totp_secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export const useMfaManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [mfaSettings, setMfaSettings] = useState<MfaSettings | null>(null);
  const { toast } = useToast();
  const { logSecurityEvent } = useSecurityAuditLogging();

  // Check current MFA status
  const checkMfaStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_mfa_settings')
        .select('mfa_enabled, is_setup_complete, mfa_method, grace_period_expires_at, backup_codes_encrypted')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setMfaSettings(data);
      return data;
    } catch (error) {
      console.error('Failed to check MFA status:', error);
      return null;
    }
  }, []);

  // Start MFA enrollment process
  const startMfaEnrollment = useCallback(async (): Promise<EnrollmentSession | null> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate TOTP secret
      const { data: secretData, error: secretError } = await supabase
        .rpc('generate_totp_secret');

      if (secretError) throw secretError;

      const totpSecret = secretData;
      const sessionToken = crypto.randomUUID();
      
      // Generate QR code URL for authenticator apps
      const issuer = 'GridLoad CRM';
      const accountName = user.email;
      const qrCodeUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${totpSecret}&issuer=${encodeURIComponent(issuer)}`;

      // Generate backup codes
      const { data: backupCodes, error: backupError } = await supabase
        .rpc('generate_backup_codes', { p_user_id: user.id });

      if (backupError) throw backupError;

      // Create enrollment session
      const { error: sessionError } = await supabase
        .from('mfa_enrollment_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          totp_secret: totpSecret,
          qr_code_url: qrCodeUrl,
          backup_codes: backupCodes
        });

      if (sessionError) throw sessionError;

      await logSecurityEvent({
        action_type: 'mfa_enrollment_started',
        resource_type: 'authentication',
        success: true,
        risk_level: 'medium',
        details: {
          enrollment_method: 'totp',
          session_token: sessionToken.substring(0, 8) + '...'
        }
      });

      return {
        session_token: sessionToken,
        totp_secret: totpSecret,
        qr_code_url: qrCodeUrl,
        backup_codes: backupCodes
      };

    } catch (error: any) {
      console.error('Failed to start MFA enrollment:', error);
      toast({
        variant: "destructive",
        title: "MFA Enrollment Failed",
        description: error.message || "Failed to start MFA enrollment process.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, logSecurityEvent]);

  // Complete MFA enrollment
  const completeMfaEnrollment = useCallback(async (
    sessionToken: string,
    totpCode: string
  ): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify TOTP code
      const { data: isValid, error: verifyError } = await supabase
        .rpc('validate_totp_code', {
          p_user_id: user.id,
          p_totp_code: totpCode
        });

      if (verifyError) throw verifyError;
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "The verification code you entered is invalid. Please try again.",
        });
        return false;
      }

      // Get enrollment session
      const { data: session, error: sessionError } = await supabase
        .from('mfa_enrollment_sessions')
        .select('totp_secret')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .single();

      if (sessionError) throw sessionError;

      // Create or update MFA settings
      const { error: settingsError } = await supabase
        .from('user_mfa_settings')
        .upsert({
          user_id: user.id,
          mfa_enabled: true,
          totp_secret: session.totp_secret,
          is_setup_complete: true,
          mfa_method: 'totp',
          enrolled_at: new Date().toISOString()
        });

      if (settingsError) throw settingsError;

      // Mark enrollment session as completed
      const { error: completeError } = await supabase
        .from('mfa_enrollment_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('session_token', sessionToken);

      if (completeError) throw completeError;

      await logSecurityEvent({
        action_type: 'mfa_enrollment_completed',
        resource_type: 'authentication',
        success: true,
        risk_level: 'high',
        details: {
          enrollment_method: 'totp',
          mfa_enabled: true
        }
      });

      toast({
        title: "MFA Enabled Successfully",
        description: "Two-factor authentication has been enabled for your account.",
      });

      await checkMfaStatus();
      return true;

    } catch (error: any) {
      console.error('Failed to complete MFA enrollment:', error);
      toast({
        variant: "destructive",
        title: "MFA Setup Failed",
        description: error.message || "Failed to complete MFA setup.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, logSecurityEvent, checkMfaStatus]);

  // Disable MFA
  const disableMfa = useCallback(async (totpCode: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Verify TOTP code before disabling
      const { data: isValid, error: verifyError } = await supabase
        .rpc('validate_totp_code', {
          p_user_id: user.id,
          p_totp_code: totpCode
        });

      if (verifyError) throw verifyError;
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid Code",
          description: "Please enter a valid verification code to disable MFA.",
        });
        return false;
      }

      // Disable MFA
      const { error } = await supabase
        .from('user_mfa_settings')
        .update({
          mfa_enabled: false,
          is_setup_complete: false,
          totp_secret: null,
          backup_codes_encrypted: null,
          backup_codes_used_at: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await logSecurityEvent({
        action_type: 'mfa_disabled',
        resource_type: 'authentication',
        success: true,
        risk_level: 'high',
        details: {
          mfa_method: 'totp',
          disabled_by_user: true
        }
      });

      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });

      await checkMfaStatus();
      return true;

    } catch (error: any) {
      console.error('Failed to disable MFA:', error);
      toast({
        variant: "destructive",
        title: "Failed to Disable MFA",
        description: error.message || "Failed to disable two-factor authentication.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast, logSecurityEvent, checkMfaStatus]);

  // Verify TOTP during login
  const verifyTotp = useCallback(async (totpCode: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: isValid, error } = await supabase
        .rpc('validate_totp_code', {
          p_user_id: user.id,
          p_totp_code: totpCode
        });

      if (error) throw error;

      if (isValid) {
        await logSecurityEvent({
          action_type: 'mfa_verification_success',
          resource_type: 'authentication',
          success: true,
          risk_level: 'low'
        });
      } else {
        await logSecurityEvent({
          action_type: 'mfa_verification_failed',
          resource_type: 'authentication',
          success: false,
          risk_level: 'medium',
          details: { code_length: totpCode.length }
        });
      }

      return isValid;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }, [logSecurityEvent]);

  // Verify backup code during login
  const verifyBackupCode = useCallback(async (backupCode: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: isValid, error } = await supabase
        .rpc('validate_backup_code', {
          p_user_id: user.id,
          p_backup_code: backupCode
        });

      if (error) throw error;

      if (isValid) {
        await logSecurityEvent({
          action_type: 'backup_code_verification_success',
          resource_type: 'authentication',
          success: true,
          risk_level: 'medium'
        });

        toast({
          title: "Backup Code Used",
          description: "A backup code has been used for authentication. Consider generating new codes.",
        });
      } else {
        await logSecurityEvent({
          action_type: 'backup_code_verification_failed',
          resource_type: 'authentication',
          success: false,
          risk_level: 'high'
        });
      }

      return isValid;
    } catch (error) {
      console.error('Backup code verification failed:', error);
      return false;
    }
  }, [logSecurityEvent, toast]);

  return {
    isLoading,
    mfaSettings,
    checkMfaStatus,
    startMfaEnrollment,
    completeMfaEnrollment,
    disableMfa,
    verifyTotp,
    verifyBackupCode
  };
};