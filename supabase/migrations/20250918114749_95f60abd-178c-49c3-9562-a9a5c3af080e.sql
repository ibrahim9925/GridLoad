-- Phase 2: Generate Sales History and Test Data

-- Generate realistic sales history for the last 8 months with controlled quantities
DO $$
DECLARE
  customer_ids UUID[];
  sales_rep_ids UUID[];
  product_ids UUID[];
  sale_id UUID;
  product_id UUID;
  sale_quantity INTEGER;
  product_stock INTEGER;
BEGIN
  -- Get available IDs
  SELECT ARRAY_AGG(id) INTO customer_ids FROM public.customers LIMIT 10;
  SELECT ARRAY_AGG(id) INTO sales_rep_ids FROM public.staff WHERE role = 'sales_rep';
  SELECT ARRAY_AGG(id) INTO product_ids FROM public.products WHERE is_active = true;
  
  -- Generate sales over the last 8 months
  FOR i IN 1..120 LOOP
    -- Create sale record
    INSERT INTO public.sales (
      customer_id, sales_rep_id, sale_date, total_amount, payment_status, 
      fulfillment_status, invoice_number, notes, created_at
    ) VALUES (
      customer_ids[1 + (RANDOM() * (array_length(customer_ids, 1) - 1))::INTEGER],
      sales_rep_ids[1 + (RANDOM() * (array_length(sales_rep_ids, 1) - 1))::INTEGER],
      CURRENT_DATE - (RANDOM() * 240)::INTEGER,
      (RANDOM() * 30000 + 2000)::NUMERIC(10,2),
      CASE WHEN RANDOM() > 0.2 THEN 'paid' ELSE 'pending' END,
      'delivered',
      'INV-' || LPAD(i::TEXT, 6, '0'),
      'Historical sales data for supply chain analysis',
      CURRENT_DATE - (RANDOM() * 240)::INTEGER
    ) RETURNING id INTO sale_id;
    
    -- Add 1-4 items per sale with stock-aware quantities
    FOR j IN 1..(1 + (RANDOM() * 3)::INTEGER) LOOP
      product_id := product_ids[1 + (RANDOM() * (array_length(product_ids, 1) - 1))::INTEGER];
      
      -- Get current stock and limit sale quantity
      SELECT current_stock INTO product_stock FROM public.products WHERE id = product_id;
      sale_quantity := LEAST(1 + (RANDOM() * 8)::INTEGER, GREATEST(1, product_stock / 3));
      
      INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
      VALUES (
        sale_id,
        product_id,
        sale_quantity,
        (RANDOM() * 1500 + 200)::NUMERIC(10,2),
        0 -- Will be calculated by trigger
      );
    END LOOP;
  END LOOP;
END $$;

-- Update line totals for all sale items
UPDATE public.sale_items SET line_total = quantity * unit_price WHERE line_total = 0;

-- Update sales totals based on sale items
UPDATE public.sales SET total_amount = (
  SELECT COALESCE(SUM(line_total), 0) 
  FROM public.sale_items 
  WHERE sale_items.sale_id = sales.id
) WHERE sales.total_amount IS NULL OR sales.total_amount = 0;

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
WHERE s.is_active = true
ON CONFLICT DO NOTHING;

-- Update products with supplier relationships
UPDATE public.products SET supplier_id = (
  SELECT s.id FROM public.suppliers s 
  WHERE s.is_active = true 
  ORDER BY RANDOM() 
  LIMIT 1
) WHERE supplier_id IS NULL;

-- Add seasonal demand patterns to products
UPDATE public.products SET 
  seasonal_factor = CASE 
    WHEN category ILIKE '%solar%' OR category ILIKE '%panel%' THEN 1.3
    WHEN category ILIKE '%battery%' OR category ILIKE '%inverter%' THEN 1.1
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

-- Enhanced function to get current liquidity with proper calculations
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
  buffer_percentage NUMERIC;
BEGIN
  -- Get total injected capital
  SELECT (setting_value->>'total')::NUMERIC INTO total_injected
  FROM public.company_settings 
  WHERE setting_key = 'injected_capital';
  
  -- Get buffer percentage
  SELECT (setting_value->>'value')::NUMERIC INTO buffer_percentage
  FROM public.company_settings 
  WHERE setting_key = 'liquidity_buffer_percentage';
  
  -- Calculate frozen capital from containers and POs
  SELECT COALESCE(SUM(frozen_amount), 0) INTO total_frozen
  FROM public.frozen_capital_summary;
  
  -- Calculate outstanding payables
  SELECT COALESCE(SUM(total_amount), 0) INTO total_payables
  FROM public.purchase_orders 
  WHERE status NOT IN ('completed', 'cancelled');
  
  RETURN QUERY SELECT 
    COALESCE(total_injected, 0),
    GREATEST(0, COALESCE(total_injected, 0) - COALESCE(total_frozen, 0) - COALESCE(total_payables, 0)),
    COALESCE(total_frozen, 0),
    COALESCE(total_payables, 0),
    CASE 
      WHEN total_injected > 0 THEN (COALESCE(total_frozen, 0) + COALESCE(total_payables, 0)) / total_injected * 100
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;