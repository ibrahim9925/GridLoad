-- Extend leads table for solar calculator functionality
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_bill NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS monthly_consumption_kwh NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS roof_space_m2 NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS roof_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS battery_preference BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS system_size_kw NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recommended_panels TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recommended_inverter TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recommended_batteries TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS calculator_data JSONB DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create enum for lead types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE lead_type_enum AS ENUM ('general', 'supplier', 'solar_calculator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add lead_type column as enum type
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type lead_type_enum DEFAULT 'general';