-- Fix search_path security issues for supply chain functions

-- Update get_product_sales_velocity function with proper search_path
CREATE OR REPLACE FUNCTION get_product_sales_velocity(p_product_id uuid, p_days integer DEFAULT 90)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  monthly_sales_avg numeric,
  weekly_sales_avg numeric,
  daily_sales_avg numeric,
  sales_trend numeric,
  seasonal_pattern jsonb,
  last_sale_date date,
  total_sales_period integer
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH sales_data AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      DATE(s.sale_date) as sale_date,
      SUM(si.quantity) as daily_quantity
    FROM products p
    LEFT JOIN sale_items si ON si.product_id = p.id
    LEFT JOIN sales s ON s.id = si.sale_id
    WHERE p.id = p_product_id 
      AND s.sale_date >= CURRENT_DATE - (p_days || ' days')::interval
    GROUP BY p.id, p.name, DATE(s.sale_date)
  ),
  velocity_calc AS (
    SELECT 
      sd.product_id,
      sd.product_name,
      COALESCE(AVG(sd.daily_quantity), 0) as daily_avg,
      COALESCE(AVG(sd.daily_quantity) * 7, 0) as weekly_avg,
      COALESCE(AVG(sd.daily_quantity) * 30, 0) as monthly_avg,
      COUNT(sd.sale_date) as sales_days,
      MAX(sd.sale_date) as last_sale,
      -- Calculate trend (last 30 days vs previous 30 days)
      CASE 
        WHEN COUNT(sd.sale_date) >= 60 THEN
          (AVG(CASE WHEN sd.sale_date >= CURRENT_DATE - INTERVAL '30 days' THEN sd.daily_quantity END) - 
           AVG(CASE WHEN sd.sale_date < CURRENT_DATE - INTERVAL '30 days' THEN sd.daily_quantity END)) /
          NULLIF(AVG(CASE WHEN sd.sale_date < CURRENT_DATE - INTERVAL '30 days' THEN sd.daily_quantity END), 0) * 100
        ELSE 0
      END as trend_percent
    FROM sales_data sd
    GROUP BY sd.product_id, sd.product_name
  ),
  seasonal_data AS (
    SELECT 
      sd.product_id,
      jsonb_object_agg(
        TO_CHAR(sd.sale_date, 'MM'),
        COALESCE(AVG(sd.daily_quantity), 0)
      ) as seasonal_pattern
    FROM sales_data sd
    WHERE sd.daily_quantity > 0
    GROUP BY sd.product_id
  )
  SELECT 
    vc.product_id,
    vc.product_name,
    vc.monthly_avg,
    vc.weekly_avg,
    vc.daily_avg,
    COALESCE(vc.trend_percent, 0) as sales_trend,
    COALESCE(sd.seasonal_pattern, '{}'::jsonb) as seasonal_pattern,
    vc.last_sale,
    vc.sales_days
  FROM velocity_calc vc
  LEFT JOIN seasonal_data sd ON sd.product_id = vc.product_id;
END;
$$;

-- Update get_stock_coverage_analysis function with proper search_path
CREATE OR REPLACE FUNCTION get_stock_coverage_analysis(p_product_id uuid DEFAULT NULL)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  current_stock integer,
  reserved_stock integer,
  available_stock integer,
  monthly_sales_velocity numeric,
  weeks_of_coverage numeric,
  months_of_coverage numeric,
  stockout_date date,
  reorder_recommended boolean,
  urgency_level text,
  seasonal_adjustment numeric
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH product_velocity AS (
    SELECT * FROM get_product_sales_velocity(p_product_id, 90)
  ),
  stock_analysis AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.current_stock,
      COALESCE(p.reserved_qty, 0) as reserved_stock,
      (p.current_stock - COALESCE(p.reserved_qty, 0)) as available_stock,
      COALESCE(pv.monthly_sales_avg, 0) as monthly_velocity,
      COALESCE(pv.weekly_sales_avg, 0) as weekly_velocity,
      pv.seasonal_pattern,
      -- Calculate current season multiplier
      CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (12, 1, 2) THEN 
          COALESCE((pv.seasonal_pattern->>'12')::numeric + (pv.seasonal_pattern->>'01')::numeric + (pv.seasonal_pattern->>'02')::numeric, 0) / 3
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (3, 4, 5) THEN 
          COALESCE((pv.seasonal_pattern->>'03')::numeric + (pv.seasonal_pattern->>'04')::numeric + (pv.seasonal_pattern->>'05')::numeric, 0) / 3
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (6, 7, 8) THEN 
          COALESCE((pv.seasonal_pattern->>'06')::numeric + (pv.seasonal_pattern->>'07')::numeric + (pv.seasonal_pattern->>'08')::numeric, 0) / 3
        ELSE 
          COALESCE((pv.seasonal_pattern->>'09')::numeric + (pv.seasonal_pattern->>'10')::numeric + (pv.seasonal_pattern->>'11')::numeric, 0) / 3
      END as current_seasonal_factor
    FROM products p
    LEFT JOIN product_velocity pv ON pv.product_id = p.id
    WHERE (p_product_id IS NULL OR p.id = p_product_id)
      AND p.is_active = true
  )
  SELECT 
    sa.product_id,
    sa.product_name,
    sa.current_stock,
    sa.reserved_stock,
    sa.available_stock,
    sa.monthly_velocity,
    -- Weeks of coverage
    CASE 
      WHEN sa.weekly_velocity > 0 THEN sa.available_stock / sa.weekly_velocity
      ELSE 999
    END as weeks_of_coverage,
    -- Months of coverage
    CASE 
      WHEN sa.monthly_velocity > 0 THEN sa.available_stock / sa.monthly_velocity
      ELSE 999
    END as months_of_coverage,
    -- Estimated stockout date
    CASE 
      WHEN sa.weekly_velocity > 0 THEN 
        CURRENT_DATE + (sa.available_stock / sa.weekly_velocity * 7)::integer
      ELSE NULL
    END as stockout_date,
    -- Reorder recommendation
    CASE 
      WHEN sa.monthly_velocity > 0 AND sa.available_stock / sa.monthly_velocity < 2 THEN true
      WHEN sa.available_stock <= 10 THEN true
      ELSE false
    END as reorder_recommended,
    -- Urgency level
    CASE 
      WHEN sa.available_stock <= 0 THEN 'critical'
      WHEN sa.monthly_velocity > 0 AND sa.available_stock / sa.monthly_velocity < 0.5 THEN 'critical'
      WHEN sa.monthly_velocity > 0 AND sa.available_stock / sa.monthly_velocity < 1 THEN 'high'
      WHEN sa.monthly_velocity > 0 AND sa.available_stock / sa.monthly_velocity < 2 THEN 'medium'
      ELSE 'low'
    END as urgency_level,
    -- Seasonal adjustment factor
    COALESCE(sa.current_seasonal_factor / NULLIF(sa.monthly_velocity, 0), 1) as seasonal_adjustment
  FROM stock_analysis sa
  ORDER BY 
    CASE 
      WHEN sa.monthly_velocity > 0 THEN sa.available_stock / sa.monthly_velocity
      ELSE 999
    END ASC;
END;
$$;

-- Update get_cash_flow_analysis function with proper search_path
CREATE OR REPLACE FUNCTION get_cash_flow_analysis()
RETURNS TABLE (
  available_cash numeric,
  frozen_in_containers numeric,
  frozen_in_pos numeric,
  expected_releases jsonb,
  liquidity_timeline jsonb,
  safe_ordering_capacity numeric,
  cash_utilization_rate numeric
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_cash numeric;
  container_frozen numeric;
  po_frozen numeric;
  releases jsonb := '[]'::jsonb;
  timeline jsonb := '[]'::jsonb;
BEGIN
  -- Get current available cash from bank accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO current_cash
  FROM bank_accounts WHERE is_active = true;
  
  -- Get frozen capital in containers
  SELECT COALESCE(SUM(total_cost), 0) INTO container_frozen
  FROM containers 
  WHERE status NOT IN ('delivered', 'completed');
  
  -- Get frozen capital in purchase orders
  SELECT COALESCE(SUM(total_amount), 0) INTO po_frozen
  FROM purchase_orders 
  WHERE status NOT IN ('completed', 'received', 'cancelled');
  
  -- Build expected releases timeline
  WITH release_schedule AS (
    SELECT 
      'container' as source_type,
      id as source_id,
      total_cost as amount,
      COALESCE(estimated_delivery_date, CURRENT_DATE + INTERVAL '30 days') as release_date
    FROM containers 
    WHERE status NOT IN ('delivered', 'completed')
    
    UNION ALL
    
    SELECT 
      'purchase_order' as source_type,
      id as source_id,
      total_amount as amount,
      COALESCE(expected_delivery_date, CURRENT_DATE + INTERVAL '14 days') as release_date
    FROM purchase_orders 
    WHERE status NOT IN ('completed', 'received', 'cancelled')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', release_date,
      'amount', amount,
      'type', source_type,
      'cumulative', SUM(amount) OVER (ORDER BY release_date)
    )
  ) INTO releases
  FROM release_schedule
  ORDER BY release_date;
  
  -- Build liquidity timeline (next 6 months)
  WITH monthly_timeline AS (
    SELECT 
      generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE + INTERVAL '6 months'),
        '1 month'::interval
      ) as month_start
  ),
  monthly_releases AS (
    SELECT 
      date_trunc('month', (release->>'date')::date) as month,
      SUM((release->>'amount')::numeric) as released_amount
    FROM jsonb_array_elements(releases) as release
    GROUP BY date_trunc('month', (release->>'date')::date)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', to_char(mt.month_start, 'YYYY-MM'),
      'starting_cash', current_cash,
      'released_funds', COALESCE(mr.released_amount, 0),
      'projected_cash', current_cash + COALESCE(mr.released_amount, 0)
    ) ORDER BY mt.month_start
  ) INTO timeline
  FROM monthly_timeline mt
  LEFT JOIN monthly_releases mr ON mr.month = mt.month_start;
  
  RETURN QUERY SELECT 
    current_cash as available_cash,
    container_frozen as frozen_in_containers,
    po_frozen as frozen_in_pos,
    releases as expected_releases,
    timeline as liquidity_timeline,
    -- Safe ordering capacity (keep 30% buffer)
    current_cash * 0.7 as safe_ordering_capacity,
    -- Cash utilization rate
    CASE 
      WHEN current_cash > 0 THEN ((container_frozen + po_frozen) / current_cash * 100)
      ELSE 0
    END as cash_utilization_rate;
END;
$$;

-- Update get_seasonal_demand_intelligence function with proper search_path
CREATE OR REPLACE FUNCTION get_seasonal_demand_intelligence()
RETURNS TABLE (
  product_id uuid,
  product_name text,
  seasonal_index jsonb,
  peak_season text,
  low_season text,
  seasonality_strength numeric,
  next_season_recommendation text,
  preparation_timeline jsonb
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH monthly_sales AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      TO_CHAR(s.sale_date, 'MM') as month,
      EXTRACT(YEAR FROM s.sale_date) as year,
      SUM(si.quantity) as monthly_quantity
    FROM products p
    LEFT JOIN sale_items si ON si.product_id = p.id
    LEFT JOIN sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '24 months'
    GROUP BY p.id, p.name, TO_CHAR(s.sale_date, 'MM'), EXTRACT(YEAR FROM s.sale_date)
  ),
  seasonal_analysis AS (
    SELECT 
      ms.product_id,
      ms.product_name,
      ms.month,
      AVG(ms.monthly_quantity) as avg_monthly_sales,
      STDDEV(ms.monthly_quantity) as sales_stddev
    FROM monthly_sales ms
    GROUP BY ms.product_id, ms.product_name, ms.month
  ),
  seasonality_metrics AS (
    SELECT 
      sa.product_id,
      sa.product_name,
      jsonb_object_agg(sa.month, sa.avg_monthly_sales) as seasonal_index,
      -- Find peak and low seasons
      (array_agg(sa.month ORDER BY sa.avg_monthly_sales DESC))[1] as peak_month,
      (array_agg(sa.month ORDER BY sa.avg_monthly_sales ASC))[1] as low_month,
      -- Calculate seasonality strength (coefficient of variation)
      CASE 
        WHEN AVG(sa.avg_monthly_sales) > 0 THEN 
          STDDEV(sa.avg_monthly_sales) / AVG(sa.avg_monthly_sales) * 100
        ELSE 0
      END as seasonality_strength
    FROM seasonal_analysis sa
    GROUP BY sa.product_id, sa.product_name
  )
  SELECT 
    sm.product_id,
    sm.product_name,
    sm.seasonal_index,
    -- Convert peak month to season name
    CASE 
      WHEN sm.peak_month IN ('12', '01', '02') THEN 'Winter'
      WHEN sm.peak_month IN ('03', '04', '05') THEN 'Spring'
      WHEN sm.peak_month IN ('06', '07', '08') THEN 'Summer'
      ELSE 'Autumn'
    END as peak_season,
    -- Convert low month to season name
    CASE 
      WHEN sm.low_month IN ('12', '01', '02') THEN 'Winter'
      WHEN sm.low_month IN ('03', '04', '05') THEN 'Spring'
      WHEN sm.low_month IN ('06', '07', '08') THEN 'Summer'
      ELSE 'Autumn'
    END as low_season,
    sm.seasonality_strength,
    -- Next season recommendation
    CASE 
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (11, 12, 1) THEN 'Prepare for Spring demand increase'
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (2, 3, 4) THEN 'Prepare for Summer peak season'
      WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (5, 6, 7) THEN 'Prepare for Autumn demand shift'
      ELSE 'Prepare for Winter season adjustments'
    END as next_season_recommendation,
    -- Preparation timeline (next 3 months)
    jsonb_build_array(
      jsonb_build_object(
        'month', to_char(CURRENT_DATE + INTERVAL '1 month', 'YYYY-MM'),
        'recommended_action', 'Monitor demand patterns',
        'target_coverage', 2.5
      ),
      jsonb_build_object(
        'month', to_char(CURRENT_DATE + INTERVAL '2 months', 'YYYY-MM'),
        'recommended_action', 'Adjust inventory levels',
        'target_coverage', 3.0
      ),
      jsonb_build_object(
        'month', to_char(CURRENT_DATE + INTERVAL '3 months', 'YYYY-MM'),
        'recommended_action', 'Prepare for seasonal peak',
        'target_coverage', 3.5
      )
    ) as preparation_timeline
  FROM seasonality_metrics sm
  WHERE sm.seasonality_strength > 10  -- Only include products with meaningful seasonality
  ORDER BY sm.seasonality_strength DESC;
END;
$$;