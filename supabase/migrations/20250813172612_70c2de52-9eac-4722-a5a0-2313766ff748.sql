-- Critical Security Fixes: Update RLS Policies

-- 1. Fix customers table - restrict access to assigned sales reps only
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Sales staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Sales staff can create customers" ON public.customers;

CREATE POLICY "Sales reps can view own customers" ON public.customers
FOR SELECT USING (
  is_admin() OR is_accountant() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.customer_id = customers.id 
    AND s.sales_rep_id = auth.uid()
  ))
);

CREATE POLICY "Sales reps can create customers" ON public.customers
FOR INSERT WITH CHECK (is_admin() OR is_sales_rep());

CREATE POLICY "Sales reps can update own customers" ON public.customers
FOR UPDATE USING (
  is_admin() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.customer_id = customers.id 
    AND s.sales_rep_id = auth.uid()
  ))
);

-- 2. Fix staff table - restrict to own records only
DROP POLICY IF EXISTS "Staff can view limited staff info" ON public.staff;

CREATE POLICY "Staff can view own record" ON public.staff
FOR SELECT USING (
  is_admin() OR 
  (id = auth.uid()) OR 
  (is_sales_rep() AND role IN ('sales_rep', 'installer') AND id IN (
    SELECT DISTINCT sales_rep_id FROM sales WHERE sales_rep_id IS NOT NULL
    UNION
    SELECT DISTINCT assigned_engineer FROM installations WHERE assigned_engineer IS NOT NULL
  ))
);

-- 3. Fix suppliers table - restrict to warehouse and admin only
DROP POLICY IF EXISTS "Staff can view suppliers" ON public.suppliers;

CREATE POLICY "Warehouse and admin can view suppliers" ON public.suppliers
FOR SELECT USING (is_admin() OR is_warehouse());

-- 4. Fix commission data access - restrict to own records
DROP POLICY IF EXISTS "Staff can view commission payments" ON public.commission_payments;
DROP POLICY IF EXISTS "Restricted commission payment access" ON public.commission_payments;

CREATE POLICY "Own commission data only" ON public.commission_payments
FOR SELECT USING (
  is_admin() OR is_accountant() OR 
  (is_sales_rep() AND sales_rep_id = auth.uid())
);

-- 5. Create site_settings table for Settings page backend
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  setting_type text NOT NULL DEFAULT 'text', -- text, number, boolean, json
  category text NOT NULL DEFAULT 'general', -- general, security, email, system
  description text,
  is_public boolean DEFAULT false, -- whether setting can be accessed by non-admins
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_settings
CREATE POLICY "Admins can manage settings" ON public.site_settings
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public settings viewable by staff" ON public.site_settings
FOR SELECT USING (is_public = true AND auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('company_name', '"GridLoad CRM"', 'text', 'general', 'Company name displayed in the application', true),
('company_email', '"admin@gridload.com"', 'text', 'general', 'Primary company email address', false),
('company_phone', '"+1-800-GRIDLOAD"', 'text', 'general', 'Primary company phone number', true),
('default_tax_rate', '0.08', 'number', 'financial', 'Default tax rate for sales calculations', false),
('session_timeout_minutes', '480', 'number', 'security', 'Session timeout in minutes', false),
('max_login_attempts', '5', 'number', 'security', 'Maximum login attempts before account lockout', false),
('commission_default_rate', '0.05', 'number', 'financial', 'Default commission rate for new sales reps', false),
('low_stock_threshold', '10', 'number', 'inventory', 'Default low stock threshold for products', false),
('enable_notifications', 'true', 'boolean', 'system', 'Enable system notifications', false),
('maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create updated_at trigger for site_settings
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- 6. Create automation_rules table for Automation Hub
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- sales_created, payment_received, stock_low, etc.
  trigger_conditions jsonb NOT NULL DEFAULT '{}',
  action_type text NOT NULL, -- send_email, create_task, update_stock, etc.
  action_config jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_executed_at timestamp with time zone,
  execution_count integer DEFAULT 0
);

-- Enable RLS on automation_rules
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_rules
CREATE POLICY "Admins can manage automation rules" ON public.automation_rules
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Staff can view active automation rules" ON public.automation_rules
FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Insert sample automation rules
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_conditions, action_type, action_config, created_by) VALUES
('Low Stock Alert', 'Send email when product stock falls below threshold', 'stock_low', '{"threshold_type": "below_reorder_point"}', 'send_email', '{"recipients": ["warehouse@gridload.com"], "template": "low_stock_alert"}', auth.uid()),
('Payment Confirmation', 'Send receipt email when payment is received', 'payment_received', '{"min_amount": 0}', 'send_email', '{"recipients": ["customer"], "template": "payment_receipt"}', auth.uid()),
('Commission Calculation', 'Calculate commission when sale is marked as paid', 'sale_paid', '{"auto_calculate": true}', 'update_commission', '{"rate_source": "staff_rate"}', auth.uid())
ON CONFLICT DO NOTHING;