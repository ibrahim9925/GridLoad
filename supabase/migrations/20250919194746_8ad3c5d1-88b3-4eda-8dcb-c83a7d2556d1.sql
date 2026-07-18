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