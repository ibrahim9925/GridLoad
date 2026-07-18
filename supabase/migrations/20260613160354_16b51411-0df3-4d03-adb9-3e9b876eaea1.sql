
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read company settings"
  ON public.company_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_company_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_company_settings_updated_at();

INSERT INTO public.company_settings (key, value) VALUES
  ('company_name', 'GridLoad Energy Solutions'),
  ('company_tagline', 'Solar Equipment Import & Distribution — Palestine'),
  ('company_email', 'info@gridloadenergy.com'),
  ('company_phone', '+970-XXX-XXXX'),
  ('company_tax_id', 'PS-XXXXXXX'),
  ('company_website', 'www.gridloadenergy.com'),
  ('company_iban', 'PS00XXXXXXXXXXXXXXXXXXXX'),
  ('company_bank_details', 'Bank of Palestine | Account: XXXXXXXXXXXX'),
  ('warranty_contact', 'warranty@gridloadenergy.com')
ON CONFLICT (key) DO NOTHING;
