-- PHASE 1B: RESOLVE REMAINING SECURITY LINTER WARNINGS
-- Fix function search paths, OTP expiry, and auth settings

-- =============================================================================
-- 1. FIX FUNCTION SEARCH PATH WARNINGS
-- =============================================================================

-- Update any remaining functions with mutable search paths
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role IN ('admin', 'accountant')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'sales_rep');
  RETURN NEW;
END;
$$;

-- Secure all automation and utility functions
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_rate NUMERIC;
BEGIN
  -- Get the sales rep's commission rate
  SELECT COALESCE(s.commission_rate, 0) INTO commission_rate
  FROM public.staff s
  WHERE s.id = NEW.sales_rep_id;
  
  -- Calculate and update commission amount
  NEW.commission_amount := NEW.total_amount * (commission_rate / 100);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sale_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update total_paid and balance_due for the sale
  UPDATE public.sales 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.payments 
      WHERE sale_id = NEW.sale_id
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.payments 
      WHERE sale_id = NEW.sale_id
    ),
    payment_status = CASE 
      WHEN (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.payments 
        WHERE sale_id = NEW.sale_id
      ) >= total_amount THEN 'paid'
      WHEN (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.payments 
        WHERE sale_id = NEW.sale_id
      ) > 0 THEN 'partial_paid'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = NEW.sale_id;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. CONFIGURE AUTH SECURITY SETTINGS
-- =============================================================================

-- Configure OTP settings (requires manual admin action)
-- This creates a reference for admin configuration via Supabase dashboard

COMMENT ON TABLE public.security_audit_logs IS 
'ADMIN ACTION REQUIRED: 
1. In Supabase Dashboard > Authentication > Settings:
   - Set OTP Expiry to 300 seconds (5 minutes)
   - Enable Leaked Password Protection
   - Set Strong Password Policy: 8+ chars, uppercase, lowercase, number, special char
   - Enable Rate Limiting: 5 attempts per 15 minutes
2. In Authentication > Providers:
   - Disable signup confirmations for testing (optional)
   - Set redirect URLs appropriately';

-- =============================================================================
-- 3. ENHANCED SECURITY AUDIT LOGGING
-- =============================================================================

-- Create a function to automatically log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type text;
  resource_type text;
  risk_level text := 'medium';
BEGIN
  -- Determine action type based on TG_OP
  action_type := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
    ELSE 'unknown'
  END;
  
  -- Determine resource type from table name
  resource_type := TG_TABLE_NAME;
  
  -- Set risk level based on table sensitivity
  risk_level := CASE TG_TABLE_NAME
    WHEN 'staff' THEN 'high'
    WHEN 'payments' THEN 'high'
    WHEN 'commission_payments' THEN 'high'
    WHEN 'security_audit_logs' THEN 'critical'
    WHEN 'customers' THEN 'medium'
    WHEN 'sales' THEN 'medium'
    ELSE 'low'
  END;
  
  -- Log the action
  PERFORM public.log_security_event(
    action_type || '_' || resource_type,
    resource_type,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_role', (SELECT role FROM public.staff WHERE id = auth.uid())
    ),
    NULL, -- IP will be set by application
    NULL, -- User agent will be set by application
    NULL, -- Session ID will be set by application
    true,
    risk_level
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- 4. RATE LIMITING ENHANCEMENT
-- =============================================================================

-- Create table for authentication rate limiting
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or IP
  endpoint text NOT NULL, -- 'login', 'signup', 'reset_password', 'verify_otp'
  attempts integer DEFAULT 1,
  first_attempt timestamp with time zone DEFAULT now(),
  last_attempt timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limiting data
CREATE POLICY "admin_only_rate_limits" ON public.auth_rate_limits
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================================================
-- 5. GRANT PERMISSIONS FOR NEW FUNCTIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_financial_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action() TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_financial_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_admin_action() FROM PUBLIC;