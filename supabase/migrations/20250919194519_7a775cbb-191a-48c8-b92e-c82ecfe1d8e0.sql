-- Create comprehensive supply chain intelligence functions

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

-- 4. Enhanced Stock Coverage Analysis Function  
CREATE OR REPLACE FUNCTION get_stock_coverage_analysis()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  current_stock INTEGER,
  monthly_sales_velocity NUMERIC,
  weeks_of_coverage NUMERIC,
  months_of_coverage NUMERIC,
  reorder_recommended BOOLEAN,
  urgency_level TEXT,
  seasonal_adjustment NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH sales_velocity AS (
    SELECT 
      si.product_id,
      AVG(si.quantity) as avg_monthly_sales,
      COUNT(DISTINCT DATE_TRUNC('month', s.sale_date)) as active_months
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY si.product_id
  ),
  current_season AS (
    SELECT CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (12, 1, 2) THEN 'winter'
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (3, 4, 5) THEN 'spring'  
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (6, 7, 8) THEN 'summer'
      ELSE 'autumn'
    END as season
  ),
  seasonal_factors AS (
    SELECT 
      'winter'::text as season, 0.7::numeric as factor
    UNION ALL SELECT 'spring', 1.0
    UNION ALL SELECT 'summer', 1.8  -- Solar season peak
    UNION ALL SELECT 'autumn', 1.2
  )
  SELECT 
    p.id,
    p.name,
    COALESCE(p.current_stock, 0),
    COALESCE(sv.avg_monthly_sales * 
      COALESCE(sf.factor, 1.0), 0) as monthly_velocity,
    CASE 
      WHEN COALESCE(sv.avg_monthly_sales * sf.factor, 0) > 0 
      THEN (COALESCE(p.current_stock, 0) * 4.33) / (sv.avg_monthly_sales * sf.factor)
      ELSE 999
    END as weeks_coverage,
    CASE 
      WHEN COALESCE(sv.avg_monthly_sales * sf.factor, 0) > 0 
      THEN COALESCE(p.current_stock, 0) / (sv.avg_monthly_sales * sf.factor)
      ELSE 999
    END as months_coverage,
    CASE
      WHEN COALESCE(p.current_stock, 0) <= COALESCE(p.reorder_point, 10) THEN true
      WHEN sv.avg_monthly_sales > 0 AND 
           (COALESCE(p.current_stock, 0) / (sv.avg_monthly_sales * sf.factor)) < 2 THEN true
      ELSE false
    END as reorder_recommended,
    CASE 
      WHEN COALESCE(p.current_stock, 0) = 0 THEN 'critical'
      WHEN COALESCE(p.current_stock, 0) <= 5 THEN 'critical'
      WHEN sv.avg_monthly_sales > 0 AND 
           (COALESCE(p.current_stock, 0) / (sv.avg_monthly_sales * sf.factor)) < 1 THEN 'high'
      WHEN sv.avg_monthly_sales > 0 AND 
           (COALESCE(p.current_stock, 0) / (sv.avg_monthly_sales * sf.factor)) < 2 THEN 'medium'
      ELSE 'low'
    END as urgency_level,
    COALESCE(sf.factor, 1.0) as seasonal_adjustment
  FROM products p
  LEFT JOIN sales_velocity sv ON sv.product_id = p.id
  CROSS JOIN current_season cs
  LEFT JOIN seasonal_factors sf ON sf.season = cs.season
  WHERE p.is_active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(p.current_stock, 0) = 0 THEN 1
      WHEN COALESCE(p.current_stock, 0) <= 5 THEN 2  
      WHEN sv.avg_monthly_sales > 0 AND 
           (COALESCE(p.current_stock, 0) / (sv.avg_monthly_sales * sf.factor)) < 1 THEN 3
      ELSE 4
    END,
    sv.avg_monthly_sales DESC;
END;
$$;

-- 5. Seasonal Demand Intelligence Function
CREATE OR REPLACE FUNCTION get_seasonal_demand_intelligence()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  current_month_sales NUMERIC,
  avg_monthly_sales NUMERIC,
  seasonal_index NUMERIC,
  demand_trend TEXT,
  peak_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_sales AS (
    SELECT 
      si.product_id,
      EXTRACT(MONTH FROM s.sale_date) as month_num,
      SUM(si.quantity) as monthly_qty
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY si.product_id, EXTRACT(MONTH FROM s.sale_date)
  ),
  product_averages AS (
    SELECT 
      product_id,
      AVG(monthly_qty) as avg_monthly,
      MAX(monthly_qty) as peak_monthly,
      MAX(CASE WHEN monthly_qty = MAX(monthly_qty) OVER (PARTITION BY product_id) 
              THEN month_num END) as peak_month
    FROM monthly_sales
    GROUP BY product_id
  ),
  current_month_data AS (
    SELECT 
      si.product_id,
      SUM(si.quantity) as current_month_qty
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE DATE_TRUNC('month', s.sale_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY si.product_id
  )
  SELECT 
    p.id,
    p.name,
    COALESCE(cmd.current_month_qty, 0),
    COALESCE(pa.avg_monthly, 0),
    CASE 
      WHEN pa.avg_monthly > 0 THEN 
        COALESCE(cmd.current_month_qty, 0) / pa.avg_monthly
      ELSE 1
    END as seasonal_index,
    CASE 
      WHEN COALESCE(cmd.current_month_qty, 0) > pa.avg_monthly * 1.5 THEN 'high_demand'
      WHEN COALESCE(cmd.current_month_qty, 0) > pa.avg_monthly * 1.2 THEN 'above_average'
      WHEN COALESCE(cmd.current_month_qty, 0) < pa.avg_monthly * 0.8 THEN 'below_average'
      ELSE 'normal'
    END as demand_trend,
    COALESCE(pa.peak_month::integer, EXTRACT(MONTH FROM CURRENT_DATE)::integer)
  FROM products p
  LEFT JOIN product_averages pa ON pa.product_id = p.id
  LEFT JOIN current_month_data cmd ON cmd.product_id = p.id
  WHERE p.is_active = true
  AND pa.avg_monthly > 0
  ORDER BY seasonal_index DESC;
END;
$$;

-- Create capital_injections table if it doesn't exist
CREATE TABLE IF NOT EXISTS capital_injections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  injection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  currency TEXT DEFAULT 'NIS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on capital_injections
ALTER TABLE capital_injections ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for capital_injections
CREATE POLICY "Admins can manage capital injections"
ON capital_injections
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());