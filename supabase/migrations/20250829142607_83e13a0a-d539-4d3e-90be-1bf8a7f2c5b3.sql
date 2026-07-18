-- FINAL SECURITY HARDENING - Fix Function Search Path Issues
-- This addresses the remaining security linter warnings

-- ============================================================================
-- STEP 1: FIX FUNCTION SEARCH PATH SECURITY ISSUES
-- ============================================================================

-- Fix search path for session timeout function
CREATE OR REPLACE FUNCTION public.check_session_timeout(p_user_id UUID, p_last_activity TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
  timeout_duration INTERVAL;
BEGIN
  SELECT role INTO user_role FROM public.staff WHERE id = p_user_id;
  
  -- Admin and accountant sessions timeout after 2 hours for enhanced security
  IF user_role IN ('admin', 'accountant') THEN
    timeout_duration := '2 hours'::INTERVAL;
  ELSE
    -- Other roles timeout after 8 hours
    timeout_duration := '8 hours'::INTERVAL;
  END IF;
  
  RETURN (p_last_activity + timeout_duration) < now();
END;
$$;

-- Fix search path for rate limit function
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier TEXT, 
  p_endpoint TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15,
  p_block_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_record RECORD;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.auth_rate_limits (identifier, endpoint, attempts)
  VALUES (p_identifier, p_endpoint, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    attempts = public.auth_rate_limits.attempts + 1,
    last_attempt = now()
  RETURNING * INTO current_record;
  
  -- Check if currently blocked
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', current_record.blocked_until,
      'reason', 'Rate limit exceeded'
    );
  END IF;
  
  -- Check if window expired, reset if so
  IF current_record.first_attempt + (p_window_minutes || ' minutes')::INTERVAL < now() THEN
    UPDATE public.auth_rate_limits 
    SET attempts = 1, first_attempt = now(), blocked_until = NULL
    WHERE id = current_record.id;
    
    RETURN jsonb_build_object('allowed', true, 'attempts', 1);
  END IF;
  
  -- Check if limit exceeded
  IF current_record.attempts > p_max_attempts THEN
    UPDATE public.auth_rate_limits 
    SET blocked_until = now() + (p_block_minutes || ' minutes')::INTERVAL
    WHERE id = current_record.id;
    
    -- Log security event
    PERFORM public.log_security_event(
      'auth_rate_limit_exceeded',
      'authentication',
      NULL,
      jsonb_build_object('identifier', p_identifier, 'endpoint', p_endpoint, 'attempts', current_record.attempts),
      NULL, NULL, NULL, false, 'high'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', now() + (p_block_minutes || ' minutes')::INTERVAL,
      'reason', 'Rate limit exceeded'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', current_record.attempts,
    'remaining', p_max_attempts - current_record.attempts
  );
END;
$$;

-- Fix search path for incident creation function
CREATE OR REPLACE FUNCTION public.create_security_incident(
  p_incident_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT,
  p_affected_users UUID[] DEFAULT NULL,
  p_affected_resources TEXT[] DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  incident_id UUID;
BEGIN
  INSERT INTO public.security_incidents (
    incident_type, severity, title, description, 
    affected_users, affected_resources, metadata
  ) VALUES (
    p_incident_type, p_severity, p_title, p_description,
    p_affected_users, p_affected_resources, p_metadata
  ) RETURNING id INTO incident_id;
  
  -- Log the incident creation
  PERFORM public.log_security_event(
    'security_incident_created',
    'security_incident',
    incident_id,
    jsonb_build_object('severity', p_severity, 'type', p_incident_type),
    NULL, NULL, NULL, true, p_severity
  );
  
  RETURN incident_id;
END;
$$;

-- Fix search path for audit logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_data_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  risk_level TEXT := 'medium';
  user_role user_role;
BEGIN
  -- Get user role for risk assessment
  SELECT role INTO user_role FROM public.staff WHERE id = auth.uid();
  
  -- Determine risk level based on table and operation
  risk_level := CASE
    WHEN TG_TABLE_NAME IN ('customers', 'staff', 'suppliers') AND TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN 'high'
    WHEN TG_TABLE_NAME IN ('payments', 'commission_payments') THEN 'critical'
    WHEN TG_TABLE_NAME = 'leads' AND TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN 'medium'
    ELSE 'low'
  END;
  
  -- Log the modification
  PERFORM public.log_security_event(
    'sensitive_data_' || lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'user_role', user_role,
      'table', TG_TABLE_NAME,
      'timestamp', now()
    ),
    NULL, NULL, NULL, true, risk_level
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- STEP 2: CREATE SECURITY CONFIGURATION TABLE  
-- ============================================================================

-- Create security configuration table for centralized security settings
CREATE TABLE IF NOT EXISTS public.security_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.staff(id)
);

ALTER TABLE public.security_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_config_admin_only" ON public.security_configuration
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin'::user_role 
    AND staff.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin'::user_role 
    AND staff.is_active = true
  )
);

-- Insert default security configuration
INSERT INTO public.security_configuration (setting_key, setting_value, description) 
VALUES 
  ('auth_rate_limit_max_attempts', '5', 'Maximum authentication attempts before rate limiting'),
  ('auth_rate_limit_window_minutes', '15', 'Rate limiting window in minutes'),
  ('auth_rate_limit_block_minutes', '30', 'Duration to block after rate limit exceeded'),
  ('admin_session_timeout_hours', '2', 'Admin session timeout in hours'),
  ('regular_session_timeout_hours', '8', 'Regular user session timeout in hours'),
  ('mfa_required_roles', '["admin", "accountant"]', 'Roles that require MFA'),
  ('security_monitoring_enabled', 'true', 'Enable real-time security monitoring'),
  ('audit_sensitive_data_access', 'true', 'Log all sensitive data access'),
  ('incident_auto_creation_enabled', 'true', 'Automatically create security incidents for high-risk events'),
  ('password_strength_enforcement', 'true', 'Enforce strong password requirements')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- STEP 3: ENHANCED SECURITY MONITORING FUNCTIONS
-- ============================================================================

-- Function to get security configuration
CREATE OR REPLACE FUNCTION public.get_security_config(p_setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  config_value JSONB;
BEGIN
  SELECT setting_value INTO config_value 
  FROM public.security_configuration 
  WHERE setting_key = p_setting_key;
  
  RETURN COALESCE(config_value, 'null'::jsonb);
END;
$$;

-- Function to update security configuration
CREATE OR REPLACE FUNCTION public.update_security_config(
  p_setting_key TEXT,
  p_setting_value JSONB,
  p_updated_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = p_updated_by 
    AND role = 'admin'::user_role 
    AND is_active = true
  ) THEN
    RETURN false;
  END IF;
  
  -- Update configuration
  INSERT INTO public.security_configuration (setting_key, setting_value, updated_by)
  VALUES (p_setting_key, p_setting_value, p_updated_by)
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    last_updated = now(),
    updated_by = EXCLUDED.updated_by;
  
  -- Log configuration change
  PERFORM public.log_security_event(
    'security_config_updated',
    'security_configuration',
    NULL,
    jsonb_build_object('setting_key', p_setting_key, 'new_value', p_setting_value),
    NULL, NULL, NULL, true, 'high'
  );
  
  RETURN true;
END;
$$;

-- Function to check if MFA is required for user
CREATE OR REPLACE FUNCTION public.is_mfa_required_for_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role user_role;
  required_roles JSONB;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.staff WHERE id = p_user_id;
  
  -- Get MFA required roles from configuration
  SELECT setting_value INTO required_roles 
  FROM public.security_configuration 
  WHERE setting_key = 'mfa_required_roles';
  
  -- Check if user role is in required roles list
  RETURN required_roles ? user_role::text;
END;
$$;

-- ============================================================================
-- SUMMARY & SECURITY STATUS
-- ============================================================================

-- Create function to get overall security status
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB := '{}';
  rls_enabled_count INTEGER;
  total_tables_count INTEGER;
  recent_incidents_count INTEGER;
  failed_logins_count INTEGER;
BEGIN
  -- Count RLS enabled tables
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
  AND c.relkind = 'r' 
  AND c.relrowsecurity = true;
  
  -- Count total public tables
  SELECT COUNT(*) INTO total_tables_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
  AND c.relkind = 'r';
  
  -- Count recent security incidents
  SELECT COUNT(*) INTO recent_incidents_count
  FROM public.security_incidents
  WHERE created_at >= now() - INTERVAL '24 hours';
  
  -- Count failed login attempts in last 24 hours
  SELECT COUNT(*) INTO failed_logins_count
  FROM public.security_audit_logs
  WHERE action_type LIKE '%login%' 
  AND success = false 
  AND created_at >= now() - INTERVAL '24 hours';
  
  -- Build result
  result := jsonb_build_object(
    'rls_coverage', jsonb_build_object(
      'enabled_tables', rls_enabled_count,
      'total_tables', total_tables_count,
      'coverage_percentage', ROUND((rls_enabled_count::numeric / NULLIF(total_tables_count, 0)) * 100, 2)
    ),
    'security_metrics', jsonb_build_object(
      'recent_incidents', recent_incidents_count,
      'failed_logins_24h', failed_logins_count
    ),
    'overall_status', CASE 
      WHEN rls_enabled_count = total_tables_count AND recent_incidents_count = 0 THEN 'secure'
      WHEN rls_enabled_count >= (total_tables_count * 0.8) THEN 'warning'
      ELSE 'critical'
    END,
    'last_updated', now()
  );
  
  RETURN result;
END;
$$;

-- ============================================================================
-- FINAL SECURITY VALIDATION
-- ============================================================================

-- Validate all critical tables have RLS enabled
DO $$
DECLARE
  critical_table TEXT;
  rls_status BOOLEAN;
BEGIN
  FOR critical_table IN VALUES ('customers'), ('staff'), ('leads'), ('suppliers'), ('profiles'), ('payments'), ('security_audit_logs'), ('security_incidents') LOOP
    SELECT c.relrowsecurity INTO rls_status
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
    AND c.relname = critical_table;
    
    IF NOT COALESCE(rls_status, false) THEN
      RAISE NOTICE 'CRITICAL: Table % does not have RLS enabled!', critical_table;
    ELSE
      RAISE NOTICE 'SUCCESS: Table % has RLS properly configured', critical_table;
    END IF;
  END LOOP;
END;
$$;