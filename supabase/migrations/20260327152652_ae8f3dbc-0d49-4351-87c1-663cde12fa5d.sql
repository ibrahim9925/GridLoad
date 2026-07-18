
-- Products missing columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS requires_installation boolean DEFAULT false;

-- Product serial numbers missing columns
ALTER TABLE public.product_serial_numbers ADD COLUMN IF NOT EXISTS received_date timestamptz;

-- User sessions missing columns
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- Security alerts missing columns
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Security incidents missing columns
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS affected_users integer DEFAULT 0;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS affected_resources text;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Security audit logs missing columns
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS success boolean DEFAULT true;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low';
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS geolocation text;

-- Auth rate limits missing columns
ALTER TABLE public.auth_rate_limits ADD COLUMN IF NOT EXISTS endpoint text;
ALTER TABLE public.auth_rate_limits ADD COLUMN IF NOT EXISTS last_attempt timestamptz DEFAULT now();

-- Leads missing columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type text DEFAULT 'general';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS calculator_data jsonb DEFAULT '{}'::jsonb;

-- Site settings - rename columns won't work, add aliases
-- The code expects setting_key and setting_value but we have key and value
-- We'll handle this in code instead
