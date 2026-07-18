-- Fix site_settings table creation
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- Insert default settings
INSERT INTO site_settings (setting_key, setting_value) VALUES 
  ('company_profile', '{"name": "GridLoad", "address": "", "phone": "", "email": ""}'),
  ('taxation', '{"default_rate": 0.1, "inclusive": false}'),
  ('valuation_method', '"weighted_average"'),
  ('otp_ttl', '300'),
  ('session_max_age', '28800'),
  ('password_policy', '{"min_length": 12, "require_special": true, "require_numbers": true}')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS and create policies
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_settings_admin_all ON site_settings
  FOR ALL USING (is_admin());

CREATE POLICY site_settings_staff_read ON site_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);