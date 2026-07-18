
-- Extend products table for public catalog
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS specs jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS datasheet_url text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Allow anonymous public read of active products for the public site
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='Public can read active products') THEN
    EXECUTE 'CREATE POLICY "Public can read active products" ON public.products FOR SELECT TO anon USING (is_active = true)';
  END IF;
END $$;
GRANT SELECT ON public.products TO anon;

-- BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  cta_text text,
  cta_link text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON public.banners FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth read all banners" ON public.banners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage banners" ON public.banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location text,
  country text,
  system_size_kwp numeric,
  description text,
  images text[] DEFAULT ARRAY[]::text[],
  completion_date date,
  is_featured boolean DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active projects" ON public.projects FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth read all projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage projects" ON public.projects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ABOUT SECTIONS
CREATE TABLE IF NOT EXISTS public.about_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  title text,
  body text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.about_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.about_sections TO authenticated;
GRANT ALL ON public.about_sections TO service_role;
ALTER TABLE public.about_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active about" ON public.about_sections FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Auth read all about" ON public.about_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage about" ON public.about_sections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- QUOTES
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  country text,
  product_interest text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quotes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a quote" ON public.quotes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth can submit a quote" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin read quotes" ON public.quotes FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin update quotes" ON public.quotes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin delete quotes" ON public.quotes FOR DELETE TO authenticated USING (public.is_admin());

-- Slug auto-generation for products
CREATE OR REPLACE FUNCTION public.tr_products_set_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(coalesce(NEW.name,''), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN base := 'product'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = candidate AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS products_set_slug ON public.products;
CREATE TRIGGER products_set_slug BEFORE INSERT OR UPDATE OF name, slug ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tr_products_set_slug();

-- Backfill slugs for existing products
UPDATE public.products SET slug = NULL WHERE slug = '';
UPDATE public.products SET name = name WHERE slug IS NULL;
