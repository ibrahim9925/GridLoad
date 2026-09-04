-- Public intake for the homepage Bill Analyzer.
-- Kept separate from CRM `leads` so anonymous traffic cannot read sales records.

CREATE TABLE IF NOT EXISTS public.bill_analyzer_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  monthly_bill NUMERIC,
  price_per_kwh NUMERIC,
  roof_size NUMERIC,
  daily_usage_hours NUMERIC,
  battery_needed BOOLEAN,
  monthly_consumption NUMERIC,
  daily_consumption NUMERIC,
  system_size NUMERIC,
  battery_capacity NUMERIC,
  panels_required INTEGER,
  roof_space_required NUMERIC,
  annual_savings NUMERIC,
  peak_sun_hours NUMERIC,
  source TEXT DEFAULT 'bill-analyzer',
  language TEXT,
  location TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bill_analyzer_leads_status
  ON public.bill_analyzer_leads (status, created_at DESC);

DROP TRIGGER IF EXISTS bill_analyzer_leads_updated_at ON public.bill_analyzer_leads;
CREATE TRIGGER bill_analyzer_leads_updated_at
  BEFORE UPDATE ON public.bill_analyzer_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bill_analyzer_leads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.bill_analyzer_leads TO authenticated;
GRANT ALL ON public.bill_analyzer_leads TO service_role;

DROP POLICY IF EXISTS "allow_admin_view_bill_analyzer_leads" ON public.bill_analyzer_leads;
CREATE POLICY "allow_admin_view_bill_analyzer_leads"
  ON public.bill_analyzer_leads
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "allow_admin_update_bill_analyzer_leads" ON public.bill_analyzer_leads;
CREATE POLICY "allow_admin_update_bill_analyzer_leads"
  ON public.bill_analyzer_leads
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_bill_analyzer_lead(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_id uuid;
BEGIN
  INSERT INTO public.bill_analyzer_leads (
    first_name, phone, email,
    monthly_bill, price_per_kwh, roof_size, daily_usage_hours, battery_needed,
    monthly_consumption, daily_consumption, system_size, battery_capacity,
    panels_required, roof_space_required, annual_savings, peak_sun_hours,
    source, language, location, user_agent, status
  ) VALUES (
    COALESCE(payload->>'first_name', 'Customer'),
    payload->>'phone',
    NULLIF(payload->>'email', ''),
    NULLIF(payload->>'monthly_bill', '')::numeric,
    NULLIF(payload->>'price_per_kwh', '')::numeric,
    NULLIF(payload->>'roof_size', '')::numeric,
    NULLIF(payload->>'daily_usage_hours', '')::numeric,
    COALESCE((payload->>'battery_needed')::boolean, false),
    NULLIF(payload->>'monthly_consumption', '')::numeric,
    NULLIF(payload->>'daily_consumption', '')::numeric,
    NULLIF(payload->>'system_size', '')::numeric,
    NULLIF(payload->>'battery_capacity', '')::numeric,
    NULLIF(payload->>'panels_required', '')::integer,
    NULLIF(payload->>'roof_space_required', '')::numeric,
    NULLIF(payload->>'annual_savings', '')::numeric,
    NULLIF(payload->>'peak_sun_hours', '')::numeric,
    COALESCE(payload->>'source', 'bill-analyzer'),
    payload->>'language',
    payload->>'location',
    payload->>'user_agent',
    COALESCE(payload->>'status', 'new')
  )
  ON CONFLICT (phone) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    email = COALESCE(EXCLUDED.email, public.bill_analyzer_leads.email),
    monthly_bill = EXCLUDED.monthly_bill,
    price_per_kwh = EXCLUDED.price_per_kwh,
    roof_size = EXCLUDED.roof_size,
    daily_usage_hours = EXCLUDED.daily_usage_hours,
    battery_needed = EXCLUDED.battery_needed,
    monthly_consumption = EXCLUDED.monthly_consumption,
    daily_consumption = EXCLUDED.daily_consumption,
    system_size = EXCLUDED.system_size,
    battery_capacity = EXCLUDED.battery_capacity,
    panels_required = EXCLUDED.panels_required,
    roof_space_required = EXCLUDED.roof_space_required,
    annual_savings = EXCLUDED.annual_savings,
    peak_sun_hours = EXCLUDED.peak_sun_hours,
    language = EXCLUDED.language,
    location = EXCLUDED.location,
    user_agent = EXCLUDED.user_agent,
    status = COALESCE(EXCLUDED.status, public.bill_analyzer_leads.status),
    updated_at = NOW()
  RETURNING id INTO lead_id;

  RETURN lead_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_bill_analyzer_lead(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_bill_analyzer_lead(jsonb) TO anon, authenticated;
