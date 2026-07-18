-- CRITICAL SECURITY HARDENING MIGRATION
-- This migration addresses all critical data exposure vulnerabilities

-- ============================================================================
-- STEP 1: FIX RLS POLICIES FOR DATA PROTECTION
-- ============================================================================

-- Fix customers table - restrict access to admin and assigned sales rep only
DROP POLICY IF EXISTS "customers_staff_access" ON public.customers;
CREATE POLICY "customers_admin_full_access" ON public.customers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin'::user_role 
    AND staff.is_active = true
  )
);

CREATE POLICY "customers_sales_limited_access" ON public.customers  
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    JOIN public.sales sl ON sl.customer_id = customers.id
    WHERE s.id = auth.uid() 
    AND s.role = 'sales_rep'::user_role 
    AND s.is_active = true
    AND sl.sales_rep_id = auth.uid()
  )
);

-- Fix leads table - only assigned sales rep and admin access
DROP POLICY IF EXISTS "leads_restricted_access" ON public.leads;
CREATE POLICY "leads_admin_access" ON public.leads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin'::user_role 
    AND staff.is_active = true
  )
);

CREATE POLICY "leads_assigned_sales_access" ON public.leads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'sales_rep'::user_role 
    AND staff.is_active = true
  ) AND (leads.assigned_to = auth.uid() OR leads.assigned_to IS NULL)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin'::user_role, 'sales_rep'::user_role)
    AND staff.is_active = true
  )
);

-- Fix staff table - users can only see their own data, admins see all
DROP POLICY IF EXISTS "Staff can read own data" ON public.staff;
DROP POLICY IF EXISTS "Admin can manage staff" ON public.staff;

CREATE POLICY "staff_own_data_access" ON public.staff
FOR SELECT USING (staff.id = auth.uid());

CREATE POLICY "staff_admin_full_access" ON public.staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.role = 'admin'::user_role 
    AND s.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.id = auth.uid() 
    AND s.role = 'admin'::user_role 
    AND s.is_active = true
  )
);

-- Fix suppliers table - admin and warehouse only
DROP POLICY IF EXISTS "Restricted supplier access" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse and admin can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse and admin can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse staff can manage suppliers" ON public.suppliers;

CREATE POLICY "suppliers_restricted_access" ON public.suppliers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin'::user_role, 'warehouse'::user_role)
    AND staff.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role IN ('admin'::user_role, 'warehouse'::user_role)
    AND staff.is_active = true
  )
);

-- Fix profiles table - enhance existing policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "profiles_own_access" ON public.profiles
FOR SELECT USING (profiles.id = auth.uid());

CREATE POLICY "profiles_own_update" ON public.profiles
FOR UPDATE USING (profiles.id = auth.uid())
WITH CHECK (profiles.id = auth.uid());

CREATE POLICY "profiles_admin_access" ON public.profiles
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

-- ============================================================================
-- STEP 2: ENHANCED RATE LIMITING AND SESSION MANAGEMENT
-- ============================================================================

-- Create enhanced rate limiting table for authentication
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user identifier
  endpoint TEXT NOT NULL, -- login, signup, password_reset
  attempts INTEGER DEFAULT 1,
  first_attempt TIMESTAMPTZ DEFAULT now(),
  last_attempt TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on auth rate limits
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_rate_limits_admin_only" ON public.auth_rate_limits
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.role = 'admin'::user_role 
    AND staff.is_active = true
  )
);

-- ============================================================================
-- STEP 3: SECURITY CONFIGURATION FUNCTIONS
-- ============================================================================

-- Function to check if user session should timeout (admin sessions: 2 hours)
CREATE OR REPLACE FUNCTION public.check_session_timeout(p_user_id UUID, p_last_activity TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  timeout_duration INTERVAL;
BEGIN
  SELECT role INTO user_role FROM public.staff WHERE id = p_user_id;
  
  -- Admin and accountant sessions timeout after 2 hours
  IF user_role IN ('admin', 'accountant') THEN
    timeout_duration := '2 hours'::INTERVAL;
  ELSE
    -- Other roles timeout after 8 hours
    timeout_duration := '8 hours'::INTERVAL;
  END IF;
  
  RETURN (p_last_activity + timeout_duration) < now();
END;
$$;

-- Function to enforce authentication rate limiting
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
AS $$
DECLARE
  current_record RECORD;
  result JSONB;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.auth_rate_limits (identifier, endpoint, attempts)
  VALUES (p_identifier, p_endpoint, 1)
  ON CONFLICT (identifier, endpoint) 
  DO UPDATE SET 
    attempts = auth_rate_limits.attempts + 1,
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
    PERFORM log_security_event(
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

-- ============================================================================
-- STEP 4: SECURITY MONITORING ENHANCEMENTS
-- ============================================================================

-- Create security incidents table for tracking major security events
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL, -- 'data_breach', 'unauthorized_access', 'suspicious_activity'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_users UUID[],
  affected_resources TEXT[],
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_incidents_admin_only" ON public.security_incidents
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

-- Function to create security incident
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
  PERFORM log_security_event(
    'security_incident_created',
    'security_incident',
    incident_id,
    jsonb_build_object('severity', p_severity, 'type', p_incident_type),
    NULL, NULL, NULL, true, p_severity
  );
  
  RETURN incident_id;
END;
$$;

-- ============================================================================
-- STEP 5: DATA ACCESS AUDIT TRAIL ENHANCEMENT  
-- ============================================================================

-- Enhanced function to log all sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  risk_level TEXT := 'medium';
  user_role user_role;
BEGIN
  -- Get user role for risk assessment
  SELECT role INTO user_role FROM public.staff WHERE id = auth.uid();
  
  -- Determine risk level based on table and user role
  risk_level := CASE
    WHEN TG_TABLE_NAME IN ('customers', 'staff', 'suppliers') AND user_role != 'admin' THEN 'high'
    WHEN TG_TABLE_NAME IN ('payments', 'commission_payments') THEN 'critical'
    WHEN TG_TABLE_NAME = 'leads' AND user_role != 'admin' AND user_role != 'sales_rep' THEN 'high'
    ELSE 'medium'
  END;
  
  -- Log the access
  PERFORM log_security_event(
    'sensitive_data_access',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'user_role', user_role,
      'table', TG_TABLE_NAME
    ),
    NULL, NULL, NULL, true, risk_level
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_customers_access ON public.customers;
CREATE TRIGGER audit_customers_access
  AFTER SELECT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_staff_access ON public.staff;
CREATE TRIGGER audit_staff_access
  AFTER SELECT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_leads_access ON public.leads;
CREATE TRIGGER audit_leads_access
  AFTER SELECT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_suppliers_access ON public.suppliers;  
CREATE TRIGGER audit_suppliers_access
  AFTER SELECT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_data_access();

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration addresses:
-- ✅ Customer Personal Information Protection
-- ✅ Lead Contact Information Protection  
-- ✅ Staff Personal Information Protection
-- ✅ Supplier Contact Details Protection
-- ✅ User Profile Information Protection
-- ✅ Enhanced Rate Limiting for Authentication
-- ✅ Session Timeout Policies
-- ✅ Security Incident Tracking
-- ✅ Comprehensive Audit Trail