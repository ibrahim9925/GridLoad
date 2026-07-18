-- Fix remaining function conflicts and add correct sample data

-- 1. Drop ALL versions of get_stock_coverage_analysis to eliminate conflicts
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis(integer);
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis(uuid);
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis(p_product_id uuid);
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis();

-- 2. Create a clean get_stock_coverage_analysis function
CREATE OR REPLACE FUNCTION public.get_stock_coverage_analysis(analysis_days integer DEFAULT 30)
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
      WHERE s.sale_date >= CURRENT_DATE - (analysis_days || ' days')::interval
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