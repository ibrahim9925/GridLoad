-- Critical Security Fixes Phase 2: Function Security, Auth Settings, and Enhanced RLS (Fixed)

-- 1. Fix function search paths for security (addresses WARN 1 & 2) - Handle dependencies properly
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
DROP FUNCTION IF EXISTS public.update_site_settings_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate the trigger
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_settings_updated_at();

-- Fix handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'sales_rep');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate the auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Create MFA settings table for enhanced security
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mfa_enabled boolean DEFAULT false,
  totp_secret text,
  backup_codes_encrypted text[],
  backup_codes_used_at timestamp with time zone[],
  last_totp_used text,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- RLS for MFA settings - users can only access their own settings
CREATE POLICY "Users can manage own MFA settings" ON public.user_mfa_settings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Create user sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint text NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + INTERVAL '8 hours'),
  last_activity timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS for user sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" ON public.user_sessions
FOR ALL USING (true) WITH CHECK (true);

-- 4. Create installation_sale_items table for proper Sales-Installation integration
CREATE TABLE IF NOT EXISTS public.installation_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES public.installations(id) ON DELETE CASCADE NOT NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE CASCADE NOT NULL,
  quantity_to_install integer NOT NULL DEFAULT 0,
  quantity_installed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(installation_id, sale_item_id)
);

ALTER TABLE public.installation_sale_items ENABLE ROW LEVEL SECURITY;

-- RLS for installation sale items
CREATE POLICY "Installation staff can manage items" ON public.installation_sale_items
FOR ALL USING (is_admin() OR is_installer() OR is_sales_rep());

-- 5. Create automation_executions table for Automation Hub
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  trigger_data jsonb NOT NULL DEFAULT '{}',
  execution_result jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  execution_duration_ms integer,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS for automation executions
CREATE POLICY "Admins can view automation executions" ON public.automation_executions
FOR SELECT USING (is_admin());

CREATE POLICY "System can manage automation executions" ON public.automation_executions
FOR ALL USING (true) WITH CHECK (true);

-- 6. Create purchase order items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_cost numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS for purchase order items
CREATE POLICY "Warehouse staff can manage PO items" ON public.purchase_order_items
FOR ALL USING (is_admin() OR is_warehouse());

-- 7. Create warranty policy updates for proper security
-- First remove overly permissive policies
DROP POLICY IF EXISTS "Staff can create warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can update warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can view all warranties" ON public.warranties;

-- Create proper restrictive policies
CREATE POLICY "Authorized staff can create warranties" ON public.warranties
FOR INSERT WITH CHECK (is_admin() OR is_sales_rep());

CREATE POLICY "Authorized staff can update warranties" ON public.warranties
FOR UPDATE USING (is_admin() OR is_sales_rep() OR is_warehouse());

CREATE POLICY "Authorized staff can view warranties" ON public.warranties
FOR SELECT USING (is_admin() OR is_sales_rep() OR is_warehouse());

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule_id ON public.automation_executions(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_installation_sale_items_installation ON public.installation_sale_items(installation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);