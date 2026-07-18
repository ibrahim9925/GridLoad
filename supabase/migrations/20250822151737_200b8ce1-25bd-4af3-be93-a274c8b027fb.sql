-- Add warranty_months column to products table for warranty auto-creation
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT NULL;

-- Update some sample products to have warranty periods (for inverters, batteries, etc.)
UPDATE public.products 
  SET warranty_months = 24 
  WHERE category ILIKE '%inverter%' 
  OR name ILIKE '%inverter%'
  OR category ILIKE '%battery%'
  OR name ILIKE '%battery%';

UPDATE public.products 
  SET warranty_months = 12 
  WHERE category ILIKE '%solar%' 
  OR name ILIKE '%panel%'
  OR category ILIKE '%module%';