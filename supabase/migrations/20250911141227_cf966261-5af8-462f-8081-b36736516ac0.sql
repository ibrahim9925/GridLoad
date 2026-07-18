-- PHASE 1: STAFF INFRASTRUCTURE CREATION
-- Create 2 active sales reps with commission rates
INSERT INTO public.staff (
  id, email, full_name, role, is_active, commission_rate, 
  phone, hire_date, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  'salesrep1@gridload.com',
  'Sarah Johnson',
  'sales_rep',
  true,
  5.00, -- 5% commission
  '+1-555-0101',
  CURRENT_DATE - INTERVAL '6 months',
  now(),
  now()
),
(
  gen_random_uuid(),
  'salesrep2@gridload.com', 
  'Mike Chen',
  'sales_rep',
  true,
  7.50, -- 7.5% commission
  '+1-555-0102',
  CURRENT_DATE - INTERVAL '4 months',
  now(),
  now()
);

-- Create 1 accountant
INSERT INTO public.staff (
  id, email, full_name, role, is_active, commission_rate,
  phone, hire_date, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'accountant@gridload.com',
  'Lisa Rodriguez',
  'accountant', 
  true,
  0.00,
  '+1-555-0201',
  CURRENT_DATE - INTERVAL '1 year',
  now(),
  now()
);

-- Create 1 warehouse manager
INSERT INTO public.staff (
  id, email, full_name, role, is_active, commission_rate,
  phone, hire_date, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'warehouse@gridload.com',
  'David Kumar',
  'warehouse',
  true, 
  0.00,
  '+1-555-0301',
  CURRENT_DATE - INTERVAL '8 months',
  now(),
  now()
);

-- Create 1 installer
INSERT INTO public.staff (
  id, email, full_name, role, is_active, commission_rate,
  phone, hire_date, created_at, updated_at  
) VALUES (
  gen_random_uuid(),
  'installer@gridload.com',
  'James Wilson',
  'installer',
  true,
  0.00,
  '+1-555-0401', 
  CURRENT_DATE - INTERVAL '3 months',
  now(),
  now()
);

-- PHASE 3: FIX BROKEN FOREIGN KEY REFERENCES IN SALES TABLE
-- Get the first active sales rep ID to assign to orphaned sales records
WITH first_sales_rep AS (
  SELECT id FROM public.staff 
  WHERE role = 'sales_rep' AND is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1
)
UPDATE public.sales 
SET sales_rep_id = (SELECT id FROM first_sales_rep),
    updated_at = now()
WHERE sales_rep_id IS NULL 
   OR sales_rep_id NOT IN (
     SELECT id FROM public.staff 
     WHERE role = 'sales_rep' AND is_active = true
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
   OR standard_selling_price IS NULL;