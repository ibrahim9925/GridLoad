-- PHASE 1: Update existing admin to have proper setup
UPDATE public.staff 
SET commission_rate = 0.00,
    updated_at = now()
WHERE role = 'admin' AND email = 'ibrahimimseeh@outlook.com';

-- PHASE 3: FIX BROKEN FOREIGN KEY REFERENCES IN SALES TABLE  
-- Assign all orphaned sales to the existing admin temporarily
-- This will resolve FK violations while we work on proper staff setup
UPDATE public.sales 
SET sales_rep_id = (
    SELECT id FROM public.staff 
    WHERE role = 'admin' AND is_active = true 
    LIMIT 1
  ),
  updated_at = now()
WHERE sales_rep_id IS NULL 
   OR sales_rep_id NOT IN (
     SELECT id FROM public.staff 
     WHERE is_active = true
   );

-- PHASE 2: PRODUCT PRICING VALIDATION AND FIXES
-- Fix any products with invalid pricing (selling price <= cost price)
UPDATE public.products 
SET 
  standard_selling_price = CASE 
    WHEN cost_price > 0 THEN cost_price * 1.4 
    ELSE 140 
  END,
  min_selling_price = CASE 
    WHEN cost_price > 0 THEN cost_price * 1.2 
    ELSE 120 
  END,
  max_selling_price = CASE 
    WHEN cost_price > 0 THEN cost_price * 2.0 
    ELSE 280 
  END,
  updated_at = now()
WHERE standard_selling_price <= cost_price 
   OR standard_selling_price = 0 
   OR standard_selling_price IS NULL
   OR min_selling_price IS NULL
   OR max_selling_price IS NULL;