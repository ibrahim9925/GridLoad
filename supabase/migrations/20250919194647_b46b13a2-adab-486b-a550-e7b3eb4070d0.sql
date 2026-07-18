-- Drop and recreate functions that have signature conflicts

-- Drop existing functions
DROP FUNCTION IF EXISTS get_cash_flow_analysis();
DROP FUNCTION IF EXISTS get_real_injected_capital();
DROP FUNCTION IF EXISTS get_supplier_intelligence();
DROP FUNCTION IF EXISTS get_stock_coverage_analysis();
DROP FUNCTION IF EXISTS get_seasonal_demand_intelligence();

-- 1. Real Cash Flow Analysis Function
CREATE OR REPLACE FUNCTION get_cash_flow_analysis()
RETURNS TABLE(
  available_cash NUMERIC,
  frozen_in_containers NUMERIC,
  frozen_in_pos NUMERIC,
  cash_utilization_rate NUMERIC,
  safe_ordering_capacity NUMERIC,
  expected_releases JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_bank_balance NUMERIC := 0;
  frozen_containers NUMERIC := 0;
  frozen_pos NUMERIC := 0;
  releases JSONB := '[]'::jsonb;
BEGIN
  -- Get total bank account balances
  SELECT COALESCE(SUM(current_balance), 0) INTO total_bank_balance
  FROM bank_accounts WHERE is_active = true;
  
  -- Get frozen capital in containers
  SELECT COALESCE(SUM(total_cost), 0) INTO frozen_containers
  FROM containers 
  WHERE status NOT IN ('completed', 'cancelled') AND total_cost > 0;
  
  -- Get frozen capital in purchase orders
  SELECT COALESCE(SUM(total_amount), 0) INTO frozen_pos
  FROM purchase_orders 
  WHERE status NOT IN ('completed', 'received', 'cancelled') AND total_amount > 0;
  
  -- Calculate expected releases (containers arriving in next 90 days)
  WITH expected_container_releases AS (
    SELECT 
      'container' as type,
      total_cost as amount,
      expected_arrival_date as date
    FROM containers
    WHERE status = 'in_transit' 
    AND expected_arrival_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    AND total_cost > 0
  ),
  expected_po_releases AS (
    SELECT 
      'purchase_order' as type,
      total_amount as amount,
      expected_delivery_date as date
    FROM purchase_orders
    WHERE status = 'ordered'
    AND expected_delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    AND total_amount > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', type,
      'amount', amount,
      'date', date
    )
  ) INTO releases
  FROM (
    SELECT * FROM expected_container_releases
    UNION ALL
    SELECT * FROM expected_po_releases
  ) all_releases;
  
  RETURN QUERY SELECT
    total_bank_balance - frozen_containers - frozen_pos as available_cash,
    frozen_containers,
    frozen_pos,
    CASE 
      WHEN total_bank_balance > 0 THEN 
        ROUND(((frozen_containers + frozen_pos) / total_bank_balance) * 100, 2)
      ELSE 0 
    END as cash_utilization_rate,
    GREATEST(0, (total_bank_balance - frozen_containers - frozen_pos) * 0.7) as safe_ordering_capacity,
    COALESCE(releases, '[]'::jsonb) as expected_releases;
END;
$$;

-- 2. Real Injected Capital Function
CREATE OR REPLACE FUNCTION get_real_injected_capital()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  injected_total NUMERIC := 0;
BEGIN
  -- Check if capital_injections table exists, if not use company_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capital_injections') THEN
    SELECT COALESCE(SUM(amount), 0) INTO injected_total
    FROM capital_injections;
  ELSE
    -- Fallback to company_settings or default
    SELECT COALESCE(
      (setting_value->>'total')::numeric, 
      1000000  -- Default 1M NIS
    ) INTO injected_total
    FROM company_settings 
    WHERE setting_key = 'injected_capital'
    LIMIT 1;
  END IF;
  
  RETURN injected_total;
END;
$$;

-- 3. Enhanced Supplier Intelligence Function
CREATE OR REPLACE FUNCTION get_supplier_intelligence()
RETURNS TABLE(
  supplier_id UUID,
  supplier_name TEXT,
  total_orders BIGINT,
  performance_score NUMERIC,
  on_time_delivery_rate NUMERIC,
  last_order_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH supplier_stats AS (
    SELECT 
      s.id,
      s.name,
      COUNT(po.id) as order_count,
      AVG(s.delivery_rating * 20) as performance_score, -- Convert 5-point to 100-point scale
      AVG(s.on_time_delivery_rate) as delivery_rate,
      MAX(po.order_date) as last_order
    FROM suppliers s
    LEFT JOIN purchase_orders po ON po.supplier_id = s.id
    WHERE s.is_active = true
    GROUP BY s.id, s.name
  )
  SELECT 
    ss.id,
    ss.name,
    ss.order_count,
    COALESCE(ss.performance_score, 85.0),
    COALESCE(ss.delivery_rate, 80.0),
    ss.last_order
  FROM supplier_stats ss
  ORDER BY ss.performance_score DESC;
END;
$$;