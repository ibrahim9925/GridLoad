-- Create comprehensive supply chain intelligence functions

-- Function to calculate real injected capital with currency conversion
CREATE OR REPLACE FUNCTION get_real_injected_capital()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  total_nis numeric := 0;
  total_usd numeric := 0;
  current_usd_rate numeric := 3.7;
BEGIN
  -- Get current USD to NIS rate
  SELECT rate INTO current_usd_rate
  FROM currency_rates 
  WHERE from_currency = 'USD' AND to_currency = 'NIS' 
  ORDER BY date DESC 
  LIMIT 1;
  
  -- Sum all capital injections by currency
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'NIS' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
  INTO total_nis, total_usd
  FROM capital_injections;
  
  -- Build result with currency breakdown
  result := jsonb_build_object(
    'total_nis', total_nis,
    'total_usd', total_usd, 
    'total_nis_equivalent', total_nis + (total_usd * current_usd_rate),
    'current_usd_rate', current_usd_rate,
    'last_updated', now()
  );
  
  RETURN result;
END;
$$;

-- Function to get real available liquidity across all bank accounts
CREATE OR REPLACE FUNCTION get_available_liquidity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  nis_liquidity numeric := 0;
  usd_liquidity numeric := 0;
  current_usd_rate numeric := 3.7;
BEGIN
  -- Get current USD to NIS rate
  SELECT rate INTO current_usd_rate
  FROM currency_rates 
  WHERE from_currency = 'USD' AND to_currency = 'NIS' 
  ORDER BY date DESC 
  LIMIT 1;
  
  -- Sum bank account balances by currency
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'NIS' OR currency IS NULL THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN current_balance ELSE 0 END), 0)
  INTO nis_liquidity, usd_liquidity
  FROM bank_accounts
  WHERE is_active = true;
  
  result := jsonb_build_object(
    'nis_liquidity', nis_liquidity,
    'usd_liquidity', usd_liquidity,
    'total_nis_equivalent', nis_liquidity + (usd_liquidity * current_usd_rate),
    'current_usd_rate', current_usd_rate
  );
  
  RETURN result;
END;
$$;

-- Function to calculate real frozen capital from containers and purchase orders
CREATE OR REPLACE FUNCTION get_real_frozen_capital()
RETURNS jsonb
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  container_frozen_usd numeric := 0;
  container_frozen_nis numeric := 0;
  po_frozen_usd numeric := 0;
  po_frozen_nis numeric := 0;
  current_usd_rate numeric := 3.7;
BEGIN
  -- Get current USD to NIS rate
  SELECT rate INTO current_usd_rate
  FROM currency_rates 
  WHERE from_currency = 'USD' AND to_currency = 'NIS' 
  ORDER BY date DESC 
  LIMIT 1;
  
  -- Calculate frozen capital in containers (not yet delivered)
  SELECT 
    COALESCE(SUM(total_cost), 0)
  INTO container_frozen_usd
  FROM containers
  WHERE status NOT IN ('delivered', 'completed', 'cancelled');
  
  -- Calculate frozen capital in purchase orders (not yet completed)
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'NIS' THEN total_amount ELSE 0 END), 0)
  INTO po_frozen_usd, po_frozen_nis
  FROM purchase_orders
  WHERE status NOT IN ('completed', 'cancelled');
  
  result := jsonb_build_object(
    'containers_usd', container_frozen_usd,
    'purchase_orders_usd', po_frozen_usd,
    'purchase_orders_nis', po_frozen_nis,
    'total_frozen_usd', container_frozen_usd + po_frozen_usd,
    'total_frozen_nis', po_frozen_nis,
    'total_frozen_nis_equivalent', po_frozen_nis + ((container_frozen_usd + po_frozen_usd) * current_usd_rate),
    'current_usd_rate', current_usd_rate
  );
  
  RETURN result;
END;
$$;

-- Function to calculate real product costs from purchase order history
CREATE OR REPLACE FUNCTION get_product_real_cost(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  latest_cost_usd numeric := 0;
  latest_cost_nis numeric := 0;
  avg_cost_usd numeric := 0;
  current_usd_rate numeric := 3.7;
  last_purchase_date date;
BEGIN
  -- Get current USD to NIS rate
  SELECT rate INTO current_usd_rate
  FROM currency_rates 
  WHERE from_currency = 'USD' AND to_currency = 'NIS' 
  ORDER BY date DESC 
  LIMIT 1;
  
  -- Get latest purchase cost for this product
  SELECT 
    poi.unit_cost,
    po.currency,
    po.order_date
  INTO latest_cost_usd, latest_cost_nis, last_purchase_date
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.product_id = p_product_id
    AND po.status IN ('completed', 'received')
  ORDER BY po.order_date DESC
  LIMIT 1;
  
  -- Get weighted average cost over last 6 months
  SELECT 
    COALESCE(
      SUM(poi.unit_cost * poi.quantity) / NULLIF(SUM(poi.quantity), 0),
      latest_cost_usd
    )
  INTO avg_cost_usd
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.product_id = p_product_id
    AND po.status IN ('completed', 'received')
    AND po.order_date >= CURRENT_DATE - INTERVAL '6 months';
    
  result := jsonb_build_object(
    'latest_cost_usd', COALESCE(latest_cost_usd, 0),
    'latest_cost_nis', COALESCE(latest_cost_usd * current_usd_rate, 0),
    'avg_cost_usd_6m', COALESCE(avg_cost_usd, latest_cost_usd, 0),
    'avg_cost_nis_6m', COALESCE(avg_cost_usd * current_usd_rate, latest_cost_usd * current_usd_rate, 0), 
    'last_purchase_date', last_purchase_date,
    'current_usd_rate', current_usd_rate
  );
  
  RETURN result;
END;
$$;

-- Function to calculate product sales velocity and margins
CREATE OR REPLACE FUNCTION get_product_sales_intelligence(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb := '{}';
  sales_90d numeric := 0;
  revenue_90d numeric := 0;
  avg_selling_price numeric := 0;
  sales_velocity numeric := 0;
  monthly_sales numeric := 0;
BEGIN
  -- Calculate 90-day sales metrics
  SELECT 
    COALESCE(SUM(si.quantity), 0),
    COALESCE(SUM(si.quantity * si.unit_price), 0),
    COALESCE(AVG(si.unit_price), 0)
  INTO sales_90d, revenue_90d, avg_selling_price
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE si.product_id = p_product_id
    AND s.sale_date >= CURRENT_DATE - INTERVAL '90 days';
    
  sales_velocity := sales_90d / 90.0;
  monthly_sales := sales_velocity * 30;
  
  result := jsonb_build_object(
    'sales_90d', sales_90d,
    'revenue_90d', revenue_90d,
    'avg_selling_price', avg_selling_price,
    'sales_velocity_daily', sales_velocity,
    'monthly_sales', monthly_sales,
    'calculated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Function to get comprehensive supplier intelligence
CREATE OR REPLACE FUNCTION get_supplier_intelligence()
RETURNS TABLE(
  supplier_id uuid,
  supplier_name text,
  total_orders bigint,
  avg_order_value numeric,
  on_time_delivery_rate numeric,
  total_order_amount numeric,
  last_order_date date,
  performance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    COUNT(po.id),
    COALESCE(AVG(po.total_amount), 0),
    -- Calculate on-time delivery rate
    COALESCE(
      (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
       NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL THEN 1 END), 0)) * 100,
      85.0
    ),
    COALESCE(SUM(po.total_amount), 0),
    MAX(po.order_date),
    -- Performance score calculation
    COALESCE(
      (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
       NULLIF(COUNT(po.id), 0)) * 100,
      85.0
    )
  FROM suppliers s
  LEFT JOIN purchase_orders po ON po.supplier_id = s.id
  WHERE s.is_active = true
  GROUP BY s.id, s.name
  ORDER BY performance_score DESC;
END;
$$;