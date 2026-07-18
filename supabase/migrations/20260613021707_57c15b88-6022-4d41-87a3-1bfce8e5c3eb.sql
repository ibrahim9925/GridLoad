-- Add product_type enum and brand column to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type_enum') THEN
    CREATE TYPE public.product_type_enum AS ENUM (
      'inverter','panel','battery','breaker','wire','structure','accessory','other'
    );
  END IF;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type public.product_type_enum,
  ADD COLUMN IF NOT EXISTS brand text;

-- Backfill product_type from category for existing rows
UPDATE public.products SET product_type = CASE
  WHEN lower(category) LIKE '%inverter%' THEN 'inverter'::public.product_type_enum
  WHEN lower(category) LIKE '%panel%' OR lower(category) LIKE '%solar%' THEN 'panel'::public.product_type_enum
  WHEN lower(category) LIKE '%batter%' THEN 'battery'::public.product_type_enum
  WHEN lower(category) LIKE '%breaker%' THEN 'breaker'::public.product_type_enum
  WHEN lower(category) LIKE '%wire%' OR lower(category) LIKE '%cable%' THEN 'wire'::public.product_type_enum
  WHEN lower(category) LIKE '%structure%' OR lower(category) LIKE '%mount%' THEN 'structure'::public.product_type_enum
  WHEN lower(category) LIKE '%accessor%' THEN 'accessory'::public.product_type_enum
  ELSE 'other'::public.product_type_enum
END
WHERE product_type IS NULL;

ALTER TABLE public.products ALTER COLUMN warranty_months SET DEFAULT 12;