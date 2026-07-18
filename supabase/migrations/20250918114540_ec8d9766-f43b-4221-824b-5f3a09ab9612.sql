-- Phase 1: Core Data Infrastructure

-- Company Settings Management
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company settings" ON public.company_settings
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Insert initial capital injection settings
INSERT INTO public.company_settings (setting_key, setting_value, description) VALUES
('injected_capital', '{"total": 2500000, "currency": "NIS", "injections": [{"amount": 2500000, "date": "2024-01-01", "description": "Initial capital injection"}]}', 'Total injected capital and history'),
('liquidity_buffer_percentage', '{"value": 30}', 'Minimum liquidity buffer percentage to maintain'),
('seasonal_coverage_targets', '{"winter": 2.0, "spring": 2.5, "summer": 3.0, "autumn": 2.5}', 'Seasonal target coverage in months');

-- Enhanced Suppliers with Performance Metrics
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS reliability_score NUMERIC DEFAULT 85.0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_margin_percentage NUMERIC DEFAULT 25.0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS avg_lead_time_days INTEGER DEFAULT 30;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS on_time_delivery_rate NUMERIC DEFAULT 80.0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 4.0;

-- Update existing suppliers with realistic performance data
UPDATE public.suppliers SET 
  reliability_score = CASE 
    WHEN name ILIKE '%deye%' THEN 90.0
    WHEN name ILIKE '%luxpower%' THEN 85.0
    WHEN name ILIKE '%sorotec%' THEN 88.0
    ELSE 80.0
  END,
  avg_margin_percentage = CASE 
    WHEN name ILIKE '%deye%' THEN 28.0
    WHEN name ILIKE '%luxpower%' THEN 32.0
    WHEN name ILIKE '%sorotec%' THEN 25.0
    ELSE 22.0
  END,
  risk_level = CASE 
    WHEN name ILIKE '%deye%' THEN 'low'
    WHEN name ILIKE '%luxpower%' THEN 'medium'  
    WHEN name ILIKE '%sorotec%' THEN 'low'
    ELSE 'medium'
  END,
  avg_lead_time_days = CASE 
    WHEN name ILIKE '%deye%' THEN 25
    WHEN name ILIKE '%luxpower%' THEN 35
    WHEN name ILIKE '%sorotec%' THEN 28
    ELSE 30
  END,
  on_time_delivery_rate = CASE 
    WHEN name ILIKE '%deye%' THEN 92.0
    WHEN name ILIKE '%luxpower%' THEN 78.0
    WHEN name ILIKE '%sorotec%' THEN 88.0
    ELSE 75.0
  END;

-- Insert key suppliers if they don't exist
INSERT INTO public.suppliers (name, contact_person, email, phone, address, reliability_score, avg_margin_percentage, risk_level, avg_lead_time_days, on_time_delivery_rate)
SELECT * FROM (VALUES 
  ('Deye Technology Co., Ltd.', 'Li Wei', 'orders@deye-tech.com', '+86-512-6789-1234', 'Suzhou, Jiangsu, China', 92.0, 28.0, 'low', 25, 92.0),
  ('Luxpower Engineering', 'Zhang Min', 'sales@luxpower.com', '+86-755-8888-9999', 'Shenzhen, Guangdong, China', 85.0, 32.0, 'medium', 35, 78.0),
  ('Sorotec Renewable Energy', 'Wang Lei', 'info@sorotec.com', '+86-21-5555-6666', 'Shanghai, China', 88.0, 25.0, 'low', 28, 88.0)
) AS new_suppliers(name, contact_person, email, phone, address, reliability_score, avg_margin_percentage, risk_level, avg_lead_time_days, on_time_delivery_rate)
WHERE NOT EXISTS (
  SELECT 1 FROM public.suppliers WHERE suppliers.name = new_suppliers.name
);

-- Update containers with realistic transit scenarios and costs
UPDATE public.containers SET
  status = CASE 
    WHEN container_number LIKE '%001' THEN 'in_transit'::container_status_enum
    WHEN container_number LIKE '%002' THEN 'customs_processing'::container_status_enum  
    WHEN container_number LIKE '%003' THEN 'port_arrival'::container_status_enum
    ELSE status
  END,
  total_cost = CASE 
    WHEN container_number LIKE '%001' THEN 485000
    WHEN container_number LIKE '%002' THEN 650000
    WHEN container_number LIKE '%003' THEN 320000
    ELSE COALESCE(total_cost, 200000)
  END,
  expected_arrival_date = CASE 
    WHEN container_number LIKE '%001' THEN CURRENT_DATE + INTERVAL '15 days'
    WHEN container_number LIKE '%002' THEN CURRENT_DATE + INTERVAL '8 days'
    WHEN container_number LIKE '%003' THEN CURRENT_DATE + INTERVAL '3 days'
    ELSE expected_arrival_date
  END,
  supplier_id = (
    SELECT id FROM public.suppliers 
    WHERE name ILIKE 
      CASE 
        WHEN containers.container_number LIKE '%001' THEN '%deye%'
        WHEN containers.container_number LIKE '%002' THEN '%luxpower%'
        WHEN containers.container_number LIKE '%003' THEN '%sorotec%'
        ELSE '%deye%'
      END
    LIMIT 1
  );

-- Create Capital Injection History table
CREATE TABLE public.capital_injections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NIS',
  injection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  source_type TEXT DEFAULT 'owner_equity',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_injections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financial staff can manage capital injections" ON public.capital_injections
FOR ALL USING (is_admin() OR is_accountant()) WITH CHECK (is_admin() OR is_accountant());

-- Insert initial capital injection
INSERT INTO public.capital_injections (amount, currency, injection_date, description, source_type)
VALUES (2500000, 'NIS', '2024-01-01', 'Initial business capital injection', 'owner_equity');

-- Generate realistic sales history for the last 8 months
INSERT INTO public.sales (
  customer_id, sales_rep_id, sale_date, total_amount, payment_status, 
  fulfillment_status, invoice_number, notes
)
SELECT 
  (SELECT id FROM public.customers ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM public.staff WHERE role = 'sales_rep' ORDER BY RANDOM() LIMIT 1),
  CURRENT_DATE - (RANDOM() * 240)::INTEGER,
  (RANDOM() * 50000 + 5000)::NUMERIC(10,2),
  CASE WHEN RANDOM() > 0.3 THEN 'paid' ELSE 'pending' END,
  'delivered',
  'INV-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  'Historical sales data for supply chain analysis'
FROM generate_series(1, 150) AS series;

-- Generate sale items for the historical sales
INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
SELECT 
  s.id,
  (SELECT id FROM public.products WHERE is_active = true ORDER BY RANDOM() LIMIT 1),
  (RANDOM() * 10 + 1)::INTEGER,
  (RANDOM() * 2000 + 100)::NUMERIC(10,2),
  0 -- Will be calculated by trigger
FROM public.sales s
CROSS JOIN generate_series(1, (RANDOM() * 3 + 1)::INTEGER);

-- Update line totals
UPDATE public.sale_items SET line_total = quantity * unit_price WHERE line_total = 0;

-- Create Outstanding Payables (Purchase Orders)
INSERT INTO public.purchase_orders (
  supplier_id, order_number, order_date, expected_delivery_date, 
  status, total_amount, currency, notes
)
SELECT 
  s.id,
  'PO-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  CURRENT_DATE - (RANDOM() * 30)::INTEGER,
  CURRENT_DATE + (RANDOM() * 60 + 15)::INTEGER,
  CASE WHEN RANDOM() > 0.7 THEN 'confirmed' ELSE 'pending' END,
  (RANDOM() * 300000 + 50000)::NUMERIC(10,2),
  'USD',
  'Outstanding payable for supply chain analysis'
FROM public.suppliers s
WHERE s.is_active = true;

-- Function to calculate current season
CREATE OR REPLACE FUNCTION get_current_season()
RETURNS TEXT AS $$
DECLARE
  current_month INTEGER;
BEGIN
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);
  
  RETURN CASE 
    WHEN current_month IN (12, 1, 2) THEN 'winter'
    WHEN current_month IN (3, 4, 5) THEN 'spring'
    WHEN current_month IN (6, 7, 8) THEN 'summer'
    ELSE 'autumn'
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to get seasonal coverage target
CREATE OR REPLACE FUNCTION get_seasonal_coverage_target()
RETURNS NUMERIC AS $$
DECLARE
  current_season TEXT;
  target_coverage NUMERIC;
BEGIN
  current_season := get_current_season();
  
  SELECT (setting_value->>current_season)::NUMERIC INTO target_coverage
  FROM public.company_settings 
  WHERE setting_key = 'seasonal_coverage_targets';
  
  RETURN COALESCE(target_coverage, 2.5);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;