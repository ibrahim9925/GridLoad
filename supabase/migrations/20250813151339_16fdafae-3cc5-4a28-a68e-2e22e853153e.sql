-- Fix all database functions with mutable search_path security issue
-- This addresses the critical security warning by setting proper search_path

-- 1. Fix is_sales_rep function
CREATE OR REPLACE FUNCTION public.is_sales_rep()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  );
$function$;

-- 2. Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role FROM public.staff WHERE id = user_id;
$function$;

-- 3. Fix is_accountant function
CREATE OR REPLACE FUNCTION public.is_accountant()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'accountant'
  );
$function$;

-- 4. Fix is_installer function
CREATE OR REPLACE FUNCTION public.is_installer()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'installer'
  );
$function$;

-- 5. Fix is_warehouse function
CREATE OR REPLACE FUNCTION public.is_warehouse()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'warehouse'
  );
$function$;

-- 6. Fix update_commission_on_sale function
CREATE OR REPLACE FUNCTION public.update_commission_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- 7. Fix update_stock_on_sale function
CREATE OR REPLACE FUNCTION public.update_stock_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (NEW.product_id, 'out', -NEW.quantity, 'sale', NEW.sale_id, auth.uid());
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- 8. Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role FROM public.staff WHERE id = auth.uid();
$function$;

-- 9. Fix check_warranty_expiry function
CREATE OR REPLACE FUNCTION public.check_warranty_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NEW.warranty_end_date < CURRENT_DATE AND OLD.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$function$;

-- 10. Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  );
$function$;

-- 11. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.staff (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'sales_rep');
  RETURN NEW;
END;
$function$;

-- 12. Fix calculate_reorder_point function
CREATE OR REPLACE FUNCTION public.calculate_reorder_point(product_id_param uuid, lead_time_days integer DEFAULT 7, safety_stock_days integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  avg_daily_sales NUMERIC;
  calculated_reorder_point INTEGER;
BEGIN
  -- Calculate average daily sales over last 30 days
  SELECT COALESCE(AVG(daily_sales), 0) INTO avg_daily_sales
  FROM (
    SELECT DATE(si.created_at) as sale_date, SUM(si.quantity) as daily_sales
    FROM sale_items si
    WHERE si.product_id = product_id_param
      AND si.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(si.created_at)
  ) daily_totals;
  
  -- Calculate reorder point: (lead time + safety stock) * average daily sales
  calculated_reorder_point := CEIL(avg_daily_sales * (lead_time_days + safety_stock_days));
  
  -- Minimum reorder point of 5
  RETURN GREATEST(calculated_reorder_point, 5);
END;
$function$;

-- 13. Fix generate_stock_alerts function
CREATE OR REPLACE FUNCTION public.generate_stock_alerts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  product_record RECORD;
  alert_count INTEGER := 0;
BEGIN
  -- Clear existing unacknowledged alerts
  DELETE FROM public.stock_alerts WHERE is_acknowledged = false;
  
  -- Generate new alerts for all products
  FOR product_record IN 
    SELECT p.*, COALESCE(p.reorder_point, 20) as calculated_reorder_point
    FROM public.products p 
    WHERE p.is_active = true
  LOOP
    -- Out of stock alert
    IF product_record.current_stock = 0 THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity, 
        severity, auto_reorder_suggested, suggested_order_quantity
      ) VALUES (
        product_record.id, 'out_of_stock', 0, product_record.current_stock,
        'critical', true, COALESCE(product_record.reorder_quantity, 50)
      );
      alert_count := alert_count + 1;
      
    -- Low stock alert (at or below reorder point)
    ELSIF product_record.current_stock <= product_record.calculated_reorder_point THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity,
        severity, auto_reorder_suggested, suggested_order_quantity
      ) VALUES (
        product_record.id, 'reorder_point', product_record.calculated_reorder_point, product_record.current_stock,
        CASE 
          WHEN product_record.current_stock <= (product_record.calculated_reorder_point * 0.5) THEN 'high'
          ELSE 'medium'
        END,
        true, COALESCE(product_record.reorder_quantity, 50)
      );
      alert_count := alert_count + 1;
      
    -- Overstock alert (above max stock level)
    ELSIF product_record.current_stock > COALESCE(product_record.max_stock_level, 1000) THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity, severity
      ) VALUES (
        product_record.id, 'overstock', product_record.max_stock_level, product_record.current_stock, 'low'
      );
      alert_count := alert_count + 1;
    END IF;
  END LOOP;
  
  RETURN alert_count;
END;
$function$;

-- 14. Fix update_sale_payment_status function
CREATE OR REPLACE FUNCTION public.update_sale_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- 15. Fix update_stock_on_sale_item function
CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update product stock
    UPDATE public.products 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Create stock movement record
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (NEW.product_id, 'out', NEW.quantity, 'sale', NEW.sale_id, auth.uid());
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- 16. Fix update_warranty_end_date function
CREATE OR REPLACE FUNCTION public.update_warranty_end_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.warranty_end_date = NEW.warranty_start_date + INTERVAL '1 month' * NEW.warranty_period_months;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create comprehensive security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  session_id text,
  success boolean DEFAULT true,
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  geolocation jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin can view audit logs"
ON public.security_audit_logs
FOR SELECT
USING (is_admin());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action_type ON public.security_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_level ON public.security_audit_logs(risk_level);

-- Create function to log security events
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
AS $function$
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
$function$;

-- Create MFA settings table
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  totp_secret text,
  backup_codes text[],
  mfa_enabled boolean DEFAULT false,
  last_used_at timestamp with time zone,
  enrolled_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on MFA settings
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own MFA settings
CREATE POLICY "Users can manage own MFA settings"
ON public.user_mfa_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all MFA settings (for support)
CREATE POLICY "Admins can view all MFA settings"
ON public.user_mfa_settings
FOR SELECT
USING (is_admin());

-- Create session tracking table for enhanced security
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  geolocation jsonb,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  device_fingerprint text,
  login_method text DEFAULT 'password'
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
ON public.user_sessions
FOR SELECT
USING (is_admin());

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- Create function to manage session cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Deactivate expired sessions
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup event
  PERFORM log_security_event(
    'session_cleanup',
    'user_sessions',
    NULL,
    jsonb_build_object('deleted_sessions', deleted_count),
    NULL,
    'system',
    NULL,
    true,
    'low'
  );
  
  RETURN deleted_count;
END;
$function$;