-- Fix critical SQL function issues (Part 1: Drop and recreate functions)

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS public.get_cash_flow_analysis();
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis();
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis(integer);
DROP FUNCTION IF EXISTS public.get_seasonal_demand_intelligence();
DROP FUNCTION IF EXISTS public.get_seasonal_demand_intelligence(integer);

-- 2. Create get_cash_flow_analysis function (fixed)
CREATE OR REPLACE FUNCTION public.get_cash_flow_analysis()
RETURNS TABLE (
  available_liquidity numeric,
  frozen_capital numeric,
  outstanding_payables numeric,
  total_injected_capital numeric,
  liquidity_utilization_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      (SELECT SUM(current_balance) FROM bank_accounts WHERE is_active = true), 0
    ) as available_liquidity,
    COALESCE(
      (SELECT SUM(total_cost) FROM containers 
       WHERE status::text IN ('ordered', 'shipped', 'in_transit', 'port_arrival', 'customs_processing')
      ), 0
    ) as frozen_capital,
    COALESCE(
      (SELECT SUM(total_amount - COALESCE((
        SELECT SUM(amount) FROM payments WHERE payments.sale_id = purchase_orders.id
      ), 0)) FROM purchase_orders WHERE status = 'pending'), 0
    ) as outstanding_payables,
    COALESCE(
      (SELECT SUM(amount) FROM capital_injections), 0
    ) as total_injected_capital,
    CASE 
      WHEN COALESCE((SELECT SUM(current_balance) FROM bank_accounts WHERE is_active = true), 0) > 0 THEN
        ROUND(
          (COALESCE((SELECT SUM(total_cost) FROM containers 
                    WHERE status::text IN ('ordered', 'shipped', 'in_transit', 'port_arrival', 'customs_processing')), 0) * 100.0) /
          COALESCE((SELECT SUM(current_balance) FROM bank_accounts WHERE is_active = true), 1), 2
        )
      ELSE 0
    END as liquidity_utilization_rate;
END;
$$;

-- 3. Create get_stock_coverage_analysis function (fixed)
CREATE OR REPLACE FUNCTION public.get_stock_coverage_analysis(coverage_days integer DEFAULT 30)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  current_stock integer,
  avg_daily_sales numeric,
  days_of_coverage numeric,
  reorder_point integer,
  recommended_order_quantity integer,
  urgency_level text,
  supplier_name text,
  lead_time_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.current_stock,
    COALESCE(sales_data.avg_daily_sales, 0) as avg_daily_sales,
    CASE 
      WHEN COALESCE(sales_data.avg_daily_sales, 0) > 0 THEN 
        ROUND(p.current_stock::numeric / sales_data.avg_daily_sales, 1)
      ELSE 999
    END as days_of_coverage,
    COALESCE(p.reorder_point, 20) as reorder_point,
    COALESCE(p.reorder_quantity, 100) as recommended_order_quantity,
    CASE 
      WHEN p.current_stock = 0 THEN 'critical'
      WHEN p.current_stock <= COALESCE(p.reorder_point, 20) THEN 'high'
      WHEN p.current_stock <= (COALESCE(p.reorder_point, 20) * 1.5) THEN 'medium'
      ELSE 'low'
    END as urgency_level,
    COALESCE(s.name, 'No Supplier') as supplier_name,
    COALESCE(ps.lead_time_days, 30) as lead_time_days
  FROM products p
  LEFT JOIN (
    SELECT 
      si.product_id,
      AVG(daily_sales.daily_qty) as avg_daily_sales
    FROM (
      SELECT 
        si.product_id,
        DATE(s.sale_date) as sale_date,
        SUM(si.quantity) as daily_qty
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.sale_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY si.product_id, DATE(s.sale_date)
    ) daily_sales
    JOIN sale_items si ON si.product_id = daily_sales.product_id
    GROUP BY si.product_id
  ) sales_data ON sales_data.product_id = p.id
  LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  LEFT JOIN suppliers s ON s.id = ps.supplier_id
  WHERE p.is_active = true
  ORDER BY 
    CASE 
      WHEN p.current_stock = 0 THEN 1
      WHEN p.current_stock <= COALESCE(p.reorder_point, 20) THEN 2
      WHEN p.current_stock <= (COALESCE(p.reorder_point, 20) * 1.5) THEN 3
      ELSE 4
    END,
    days_of_coverage ASC;
END;
$$;

-- 4. Create get_seasonal_demand_intelligence function
CREATE OR REPLACE FUNCTION public.get_seasonal_demand_intelligence(analysis_months integer DEFAULT 12)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  current_season text,
  seasonal_multiplier numeric,
  projected_demand numeric,
  recommended_stock_level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_season_name text;
BEGIN
  -- Determine current season (Northern Hemisphere)
  current_season_name := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (12, 1, 2) THEN 'winter'
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (3, 4, 5) THEN 'spring'
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) IN (6, 7, 8) THEN 'summer'
    ELSE 'autumn'
  END;

  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    current_season_name as current_season,
    CASE 
      WHEN p.name ILIKE '%solar%' AND current_season_name IN ('spring', 'summer') THEN 1.5
      WHEN p.name ILIKE '%battery%' AND current_season_name = 'winter' THEN 1.3
      WHEN p.name ILIKE '%heating%' AND current_season_name = 'winter' THEN 1.4
      ELSE 1.0
    END as seasonal_multiplier,
    COALESCE(sales_data.avg_monthly_sales, 0) * 
    CASE 
      WHEN p.name ILIKE '%solar%' AND current_season_name IN ('spring', 'summer') THEN 1.5
      WHEN p.name ILIKE '%battery%' AND current_season_name = 'winter' THEN 1.3
      WHEN p.name ILIKE '%heating%' AND current_season_name = 'winter' THEN 1.4
      ELSE 1.0
    END as projected_demand,
    GREATEST(
      COALESCE(p.reorder_point, 20),
      ROUND(COALESCE(sales_data.avg_monthly_sales, 0) * 
        CASE 
          WHEN p.name ILIKE '%solar%' AND current_season_name IN ('spring', 'summer') THEN 1.5
          WHEN p.name ILIKE '%battery%' AND current_season_name = 'winter' THEN 1.3
          WHEN p.name ILIKE '%heating%' AND current_season_name = 'winter' THEN 1.4
          ELSE 1.0
        END * 2)::integer
    ) as recommended_stock_level
  FROM products p
  LEFT JOIN (
    SELECT 
      si.product_id,
      AVG(monthly_sales.monthly_qty) as avg_monthly_sales
    FROM (
      SELECT 
        si.product_id,
        DATE_TRUNC('month', s.sale_date) as sale_month,
        SUM(si.quantity) as monthly_qty
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY si.product_id, DATE_TRUNC('month', s.sale_date)
    ) monthly_sales
    JOIN sale_items si ON si.product_id = monthly_sales.product_id
    GROUP BY si.product_id
  ) sales_data ON sales_data.product_id = p.id
  WHERE p.is_active = true
  ORDER BY projected_demand DESC;
END;
$$;