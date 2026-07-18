-- Phase 2: Generate Sales History (Safe Mode)

-- Temporarily disable stock reduction triggers
DROP TRIGGER IF EXISTS update_stock_on_sale_item ON public.sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale ON public.sale_items;

-- Generate basic sales records first
INSERT INTO public.sales (
  customer_id, sales_rep_id, sale_date, total_amount, payment_status, 
  fulfillment_status, invoice_number, notes, created_at
)
SELECT 
  (SELECT id FROM public.customers ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM public.staff WHERE role = 'sales_rep' ORDER BY RANDOM() LIMIT 1),
  CURRENT_DATE - (RANDOM() * 240)::INTEGER,
  (RANDOM() * 30000 + 2000)::NUMERIC(10,2),
  CASE WHEN RANDOM() > 0.2 THEN 'paid' ELSE 'pending' END,
  'delivered',
  'HIST-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  'Historical sales data for supply chain analysis',
  CURRENT_DATE - (RANDOM() * 240)::INTEGER
FROM generate_series(1, 80) AS series;

-- Generate sale items with small quantities to avoid stock issues
INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
SELECT 
  s.id,
  (SELECT id FROM public.products WHERE is_active = true ORDER BY RANDOM() LIMIT 1),
  1 + (RANDOM() * 3)::INTEGER, -- Small quantities
  (RANDOM() * 1500 + 200)::NUMERIC(10,2),
  0
FROM public.sales s
WHERE s.invoice_number LIKE 'HIST-%'
AND NOT EXISTS (SELECT 1 FROM public.sale_items si WHERE si.sale_id = s.id);

-- Add more items to some sales
INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
SELECT 
  s.id,
  (SELECT id FROM public.products WHERE is_active = true ORDER BY RANDOM() LIMIT 1),
  1 + (RANDOM() * 2)::INTEGER,
  (RANDOM() * 1200 + 150)::NUMERIC(10,2),
  0
FROM public.sales s
WHERE s.invoice_number LIKE 'HIST-%'
AND RANDOM() > 0.5
LIMIT 40;

-- Update line totals
UPDATE public.sale_items SET line_total = quantity * unit_price WHERE line_total = 0;

-- Update sales totals
UPDATE public.sales SET total_amount = (
  SELECT COALESCE(SUM(line_total), 0) 
  FROM public.sale_items 
  WHERE sale_items.sale_id = sales.id
) WHERE sales.invoice_number LIKE 'HIST-%';

-- Create Outstanding Payables (Purchase Orders)
INSERT INTO public.purchase_orders (
  supplier_id, order_number, order_date, expected_delivery_date, 
  status, total_amount, currency, notes
)
SELECT 
  s.id,
  'PO-SUPP-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  CURRENT_DATE - (RANDOM() * 30)::INTEGER,
  CURRENT_DATE + (RANDOM() * 60 + 15)::INTEGER,
  CASE WHEN RANDOM() > 0.7 THEN 'confirmed' ELSE 'pending' END,
  (RANDOM() * 200000 + 30000)::NUMERIC(10,2),
  'USD',
  'Outstanding payable for supply chain analysis'
FROM public.suppliers s
WHERE s.is_active = true
LIMIT 5;

-- Update products with supplier relationships and seasonal factors
UPDATE public.products SET 
  supplier_id = COALESCE(supplier_id, (
    SELECT s.id FROM public.suppliers s 
    WHERE s.is_active = true 
    ORDER BY RANDOM() 
    LIMIT 1
  )),
  seasonal_factor = CASE 
    WHEN category ILIKE '%solar%' OR category ILIKE '%panel%' OR name ILIKE '%panel%' THEN 1.3
    WHEN category ILIKE '%battery%' OR category ILIKE '%inverter%' OR name ILIKE '%battery%' OR name ILIKE '%inverter%' THEN 1.1
    ELSE 1.0
  END;

-- Function to calculate supplier performance score
CREATE OR REPLACE FUNCTION calculate_supplier_performance_score(
  p_reliability_score NUMERIC,
  p_avg_margin_percentage NUMERIC, 
  p_avg_lead_time_days INTEGER,
  p_on_time_delivery_rate NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (p_reliability_score * 0.3) + 
    (p_avg_margin_percentage * 0.25) + 
    ((100 - LEAST(p_avg_lead_time_days, 60)) * 0.25) + 
    (p_on_time_delivery_rate * 0.2)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update suppliers with calculated performance scores
UPDATE public.suppliers SET quality_score = calculate_supplier_performance_score(
  reliability_score, avg_margin_percentage, avg_lead_time_days, on_time_delivery_rate
) / 20; -- Scale to 1-5 range

-- Create view for frozen capital calculation
CREATE OR REPLACE VIEW public.frozen_capital_summary AS
SELECT 
  'containers' as capital_type,
  SUM(total_cost) as frozen_amount,
  COUNT(*) as item_count,
  'Container shipments in transit' as description
FROM public.containers 
WHERE status NOT IN ('delivered', 'completed')
UNION ALL
SELECT 
  'purchase_orders' as capital_type,
  SUM(total_amount) as frozen_amount,
  COUNT(*) as item_count,
  'Outstanding purchase orders' as description
FROM public.purchase_orders 
WHERE status NOT IN ('completed', 'cancelled');

-- Enhanced function to get current liquidity
CREATE OR REPLACE FUNCTION get_current_liquidity()
RETURNS TABLE(
  injected_capital NUMERIC,
  available_liquidity NUMERIC,
  frozen_capital NUMERIC,
  outstanding_payables NUMERIC,
  utilization_rate NUMERIC
) AS $$
DECLARE
  total_injected NUMERIC;
  total_frozen NUMERIC;
  total_payables NUMERIC;
BEGIN
  -- Get total injected capital
  SELECT (setting_value->>'total')::NUMERIC INTO total_injected
  FROM public.company_settings 
  WHERE setting_key = 'injected_capital';
  
  -- Calculate frozen capital
  SELECT COALESCE(SUM(frozen_amount), 0) INTO total_frozen
  FROM public.frozen_capital_summary;
  
  -- Calculate outstanding payables
  SELECT COALESCE(SUM(total_amount), 0) INTO total_payables
  FROM public.purchase_orders 
  WHERE status NOT IN ('completed', 'cancelled');
  
  RETURN QUERY SELECT 
    COALESCE(total_injected, 2500000),
    GREATEST(0, COALESCE(total_injected, 2500000) - COALESCE(total_frozen, 0) - COALESCE(total_payables, 0)),
    COALESCE(total_frozen, 0),
    COALESCE(total_payables, 0),
    CASE 
      WHEN total_injected > 0 THEN (COALESCE(total_frozen, 0) + COALESCE(total_payables, 0)) / total_injected * 100
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Re-enable stock triggers for future sales (not historical)
CREATE OR REPLACE TRIGGER update_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION update_product_stock_on_sale();