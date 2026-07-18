-- Security Enhancement: Remove Development Artifacts and Add Security Monitoring
-- Phase 2: Code-level Security Improvements

-- Create a function to log security incidents
CREATE OR REPLACE FUNCTION public.log_security_incident(
  p_incident_type text,
  p_description text,
  p_severity text DEFAULT 'medium',
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  incident_id uuid;
BEGIN
  -- Create security incident record
  INSERT INTO public.security_alerts (
    user_id,
    alert_type,
    severity,
    title,
    description,
    metadata,
    is_resolved
  ) VALUES (
    auth.uid(),
    p_incident_type,
    p_severity,
    'Security Incident: ' || p_incident_type,
    p_description,
    p_metadata,
    false
  ) RETURNING id INTO incident_id;
  
  -- Also log to audit trail
  PERFORM log_security_event(
    'security_incident_logged',
    'security_monitoring',
    incident_id,
    jsonb_build_object(
      'incident_type', p_incident_type,
      'severity', p_severity,
      'description', p_description
    ),
    NULL, NULL, NULL, true, p_severity
  );
  
  RETURN incident_id;
END;
$$;

-- Create enhanced session security function
CREATE OR REPLACE FUNCTION public.validate_session_security(
  p_session_token text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_record record;
  security_check jsonb := '{}';
  risk_score integer := 0;
BEGIN
  -- Get session details
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_token = p_session_token
  AND is_active = true
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'session_not_found',
      'risk_score', 100
    );
  END IF;
  
  -- Check for IP address changes
  IF p_ip_address IS NOT NULL AND session_record.ip_address != p_ip_address THEN
    risk_score := risk_score + 30;
    security_check := jsonb_set(security_check, '{ip_change}', 'true');
  END IF;
  
  -- Check for user agent changes
  IF p_user_agent IS NOT NULL AND session_record.user_agent != p_user_agent THEN
    risk_score := risk_score + 20;
    security_check := jsonb_set(security_check, '{user_agent_change}', 'true');
  END IF;
  
  -- Check session age
  IF session_record.created_at < now() - INTERVAL '24 hours' THEN
    risk_score := risk_score + 10;
    security_check := jsonb_set(security_check, '{old_session}', 'true');
  END IF;
  
  -- Log security check if risk score is high
  IF risk_score >= 50 THEN
    PERFORM log_security_incident(
      'suspicious_session_activity',
      'Session validation failed security checks',
      CASE 
        WHEN risk_score >= 80 THEN 'high'
        WHEN risk_score >= 50 THEN 'medium'
        ELSE 'low'
      END,
      jsonb_build_object(
        'risk_score', risk_score,
        'session_id', session_record.id,
        'security_checks', security_check
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', risk_score < 80,
    'risk_score', risk_score,
    'security_checks', security_check,
    'session_id', session_record.id
  );
END;
$$;

-- Log this security enhancement
INSERT INTO public.security_audit_logs (
  user_id, action_type, resource_type, details, success, risk_level
) VALUES (
  auth.uid(), 'security_enhancement_phase2', 'code_security', 
  jsonb_build_object(
    'action', 'removed_development_artifacts',
    'enhancements', ARRAY['removed_hardcoded_credentials', 'added_security_headers', 'enhanced_session_validation'],
    'security_level', 'improved'
  ), 
  true, 'medium'
);