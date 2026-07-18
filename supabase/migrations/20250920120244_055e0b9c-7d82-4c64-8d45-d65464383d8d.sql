-- Fix the get_stock_coverage_analysis function to show realistic coverage days
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis();

CREATE OR REPLACE FUNCTION public.get_stock_coverage_analysis()
RETURNS TABLE(
  product_id uuid,
  product_name text,
  current_stock integer,
  avg_daily_sales numeric,
  days_of_coverage numeric,
  target_coverage_days integer,
  recommended_action text,
  priority text,
  supplier_name text,
  last_reorder_date date,
  notes text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analysis_start_date date;
BEGIN
  -- Use a rolling 60-day window for better accuracy
  analysis_start_date := CURRENT_DATE - INTERVAL '60 days';
  
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.current_stock,
    
    -- Calculate realistic daily sales velocity with better logic
    CASE 
      WHEN COALESCE(daily_sales.avg_daily, 0) = 0 THEN 0.05  -- Very minimal default for zero sales
      ELSE GREATEST(daily_sales.avg_daily, 0.1)  -- Minimum of 0.1 per day for active products
    END as avg_daily_sales,
    
    -- Calculate days of coverage with proper bounds
    CASE 
      WHEN COALESCE(daily_sales.avg_daily, 0) = 0 THEN 
        CASE WHEN p.current_stock > 0 THEN 365 ELSE 0 END  -- If no sales but stock exists, show 1 year max
      ELSE 
        LEAST(
          GREATEST(p.current_stock / GREATEST(daily_sales.avg_daily, 0.1), 0),  -- Minimum coverage of 0
          365  -- Maximum coverage of 1 year for display purposes
        )
    END as days_of_coverage,
    
    -- Target coverage based on product type and lead times
    CASE 
      WHEN ps.lead_time_days IS NOT NULL THEN ps.lead_time_days + 14  -- Lead time + 2 weeks buffer
      ELSE 30  -- Default 30-day target
    END as target_coverage_days,
    
    -- Recommended action based on coverage analysis
    CASE 
      WHEN p.current_stock = 0 THEN 'order_now'
      WHEN COALESCE(daily_sales.avg_daily, 0) = 0 THEN 'monitor'  -- No recent sales
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 7 THEN 'order_now'
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 21 THEN 'reorder_soon'
      ELSE 'monitor'
    END as recommended_action,
    
    -- Priority based on stock level and sales activity
    CASE 
      WHEN p.current_stock = 0 THEN 'critical'
      WHEN COALESCE(daily_sales.avg_daily, 0) > 1 AND (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 7 THEN 'high'
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 14 THEN 'medium'
      ELSE 'low'
    END as priority,
    
    COALESCE(s.name, 'No Supplier') as supplier_name,
    p.last_restock_date,
    
    -- Helpful notes for decision making
    CASE 
      WHEN COALESCE(daily_sales.avg_daily, 0) = 0 THEN 'No recent sales - monitor demand'
      WHEN p.current_stock = 0 THEN 'OUT OF STOCK - Immediate action required'
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 7 THEN 'Less than 1 week stock remaining'
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) > 180 THEN 'Possible overstock situation'
      ELSE CONCAT(
        'Selling ~', 
        ROUND(COALESCE(daily_sales.avg_daily, 0), 1), 
        ' units/day on average'
      )
    END as notes
    
  FROM public.products p
  LEFT JOIN (
    -- Calculate average daily sales over the analysis period with proper date filtering
    SELECT 
      si.product_id,
      AVG(COALESCE(daily_sales.total_quantity, 0)) as avg_daily
    FROM (
      SELECT DISTINCT si.product_id
      FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE s.sale_date >= analysis_start_date
    ) si
    LEFT JOIN (
      SELECT 
        si.product_id,
        DATE(s.sale_date) as sale_date,
        SUM(si.quantity) as total_quantity
      FROM public.sale_items si
      JOIN public.sales s ON s.id = si.sale_id
      WHERE s.sale_date >= analysis_start_date
      GROUP BY si.product_id, DATE(s.sale_date)
    ) daily_sales ON daily_sales.product_id = si.product_id
    GROUP BY si.product_id
  ) daily_sales ON daily_sales.product_id = p.id
  
  LEFT JOIN public.product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  LEFT JOIN public.suppliers s ON s.id = ps.supplier_id
  
  WHERE p.is_active = true
  ORDER BY 
    CASE 
      WHEN p.current_stock = 0 THEN 1
      WHEN COALESCE(daily_sales.avg_daily, 0) > 0 AND (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 7 THEN 2
      WHEN (p.current_stock / GREATEST(daily_sales.avg_daily, 0.1)) < 21 THEN 3
      ELSE 4
    END,
    COALESCE(daily_sales.avg_daily, 0) DESC,
    p.name;
END;
$$;