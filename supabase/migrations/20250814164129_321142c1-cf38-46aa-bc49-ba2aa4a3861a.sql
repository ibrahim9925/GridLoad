-- PHASE 1: CRITICAL SECURITY HARDENING - GridLoad Final Ship
-- Priority: BLOCKING production deployment
-- Target: Fix RLS vulnerabilities, secure functions, harden auth

-- =============================================================================
-- 1. STAFF TABLE SECURITY LOCKDOWN
-- =============================================================================

-- Drop existing policies to rebuild securely
DROP POLICY IF EXISTS "Staff can manage their own data" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage all staff" ON public.staff;

-- Create strict role-based access
CREATE POLICY "admin_only_staff_management" ON public.staff
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff admin_check 
    WHERE admin_check.id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "staff_self_read_only" ON public.staff
FOR SELECT USING (id = auth.uid());

-- =============================================================================
-- 2. CUSTOMER DATA PROTECTION
-- =============================================================================

-- Drop existing loose policies
DROP POLICY IF EXISTS "Sales reps can only view customers they have sales with" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can only update customers they have sales with" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can create customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Accountants can view all customers" ON public.customers;

-- Implement strict customer access control
CREATE POLICY "customers_admin_full_access" ON public.customers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "customers_accountant_read" ON public.customers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'accountant'
  )
);

CREATE POLICY "customers_salesrep_own_only" ON public.customers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  ) AND EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.customer_id = customers.id 
    AND sales.sales_rep_id = auth.uid()
  )
);

CREATE POLICY "customers_salesrep_create" ON public.customers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role IN ('sales_rep', 'admin')
  )
);

-- =============================================================================
-- 3. FINANCIAL DATA LOCKDOWN
-- =============================================================================

-- Sales table: Strict access control
DROP POLICY IF EXISTS "Staff can view relevant sales" ON public.sales;
DROP POLICY IF EXISTS "Sales staff can update their sales" ON public.sales;
DROP POLICY IF EXISTS "Admins and sales reps can manage sales" ON public.sales;

CREATE POLICY "sales_admin_accountant_full" ON public.sales
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "sales_rep_own_only" ON public.sales
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  ) AND sales_rep_id = auth.uid()
);

-- Payments table: Financial staff only
DROP POLICY IF EXISTS "Financial staff can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Strict payment data access" ON public.payments;

CREATE POLICY "payments_financial_only" ON public.payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "payments_salesrep_own_sales" ON public.payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  ) AND EXISTS (
    SELECT 1 FROM public.sales 
    WHERE sales.id = payments.sale_id 
    AND sales.sales_rep_id = auth.uid()
  )
);

-- Commission payments: Own data + financial staff
DROP POLICY IF EXISTS "Financial staff can manage commission payments" ON public.commission_payments;
DROP POLICY IF EXISTS "Own commission data only" ON public.commission_payments;

CREATE POLICY "commission_financial_staff" ON public.commission_payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  )
);

CREATE POLICY "commission_own_data" ON public.commission_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  ) AND sales_rep_id = auth.uid()
);

-- =============================================================================
-- 4. MFA SECURITY CRITICAL FIX
-- =============================================================================

-- MFA enrollment sessions: User-only strict access
DROP POLICY IF EXISTS "Users can manage own MFA enrollment sessions" ON public.mfa_enrollment_sessions;
DROP POLICY IF EXISTS "Strict MFA enrollment access" ON public.mfa_enrollment_sessions;

CREATE POLICY "mfa_enrollment_user_only" ON public.mfa_enrollment_sessions
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add session expiry validation trigger
CREATE OR REPLACE FUNCTION public.validate_mfa_session_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'MFA enrollment session has expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_mfa_expiry
  BEFORE INSERT OR UPDATE ON public.mfa_enrollment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_mfa_session_expiry();

-- =============================================================================
-- 5. FUNCTION SECURITY ENHANCEMENT
-- =============================================================================

-- Secure existing functions with SECURITY DEFINER + search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'accountant'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'warehouse'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_installer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'installer'
  );
$$;

-- Secure security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action_type text, 
  p_resource_type text DEFAULT NULL, 
  p_resource_id uuid DEFAULT NULL, 
  p_details jsonb DEFAULT NULL, 
  p_ip_address inet DEFAULT NULL, 
  p_user_agent text DEFAULT NULL, 
  p_session_id text DEFAULT NULL, 
  p_success boolean DEFAULT true, 
  p_risk_level text DEFAULT 'low', 
  p_geolocation jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, action_type, resource_type, resource_id, details,
    ip_address, user_agent, session_id, success, risk_level, geolocation
  ) VALUES (
    auth.uid(), p_action_type, p_resource_type, p_resource_id, p_details,
    p_ip_address, p_user_agent, p_session_id, p_success, p_risk_level, p_geolocation
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Secure rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text, 
  p_endpoint text, 
  p_max_attempts integer DEFAULT 5, 
  p_window_minutes integer DEFAULT 15, 
  p_block_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_record record;
  result jsonb;
BEGIN
  -- Get current rate limit record
  SELECT * INTO current_record 
  FROM public.rate_limits 
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  -- If no record exists, create one
  IF current_record IS NULL THEN
    INSERT INTO public.rate_limits (identifier, endpoint, attempts)
    VALUES (p_identifier, p_endpoint, 1);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'remaining', p_max_attempts - 1,
      'reset_at', now() + (p_window_minutes || ' minutes')::interval
    );
  END IF;
  
  -- Check if currently blocked
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', current_record.blocked_until,
      'reason', 'Rate limit exceeded'
    );
  END IF;
  
  -- Check if window has expired
  IF current_record.first_attempt + (p_window_minutes || ' minutes')::interval < now() THEN
    -- Reset the window
    UPDATE public.rate_limits 
    SET attempts = 1, 
        first_attempt = now(), 
        last_attempt = now(),
        blocked_until = NULL
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'attempts', 1,
      'remaining', p_max_attempts - 1,
      'reset_at', now() + (p_window_minutes || ' minutes')::interval
    );
  END IF;
  
  -- Increment attempts
  UPDATE public.rate_limits 
  SET attempts = attempts + 1, last_attempt = now()
  WHERE identifier = p_identifier AND endpoint = p_endpoint;
  
  -- Check if limit exceeded
  IF current_record.attempts + 1 > p_max_attempts THEN
    -- Block the identifier
    UPDATE public.rate_limits 
    SET blocked_until = now() + (p_block_minutes || ' minutes')::interval
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', now() + (p_block_minutes || ' minutes')::interval,
      'reason', 'Rate limit exceeded'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', current_record.attempts + 1,
    'remaining', p_max_attempts - (current_record.attempts + 1),
    'reset_at', current_record.first_attempt + (p_window_minutes || ' minutes')::interval
  );
END;
$$;

-- =============================================================================
-- 6. GRANT PROPER PERMISSIONS
-- =============================================================================

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_installer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, jsonb, inet, text, text, boolean, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) TO authenticated;

-- Revoke public access to sensitive functions
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sales_rep() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_accountant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_warehouse() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_installer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_event(text, text, uuid, jsonb, inet, text, text, boolean, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer, integer) FROM PUBLIC;