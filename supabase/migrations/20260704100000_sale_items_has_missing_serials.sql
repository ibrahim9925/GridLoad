ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS has_missing_serials boolean NOT NULL DEFAULT false;
