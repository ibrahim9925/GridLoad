-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_stock_coverage_analysis(integer);

-- Recreate with improved logic for stock coverage analysis
CREATE OR REPLACE FUNCTION public.get_stock_coverage_analysis(analysis_days integer DEFAULT 90)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  supplier_id uuid,
  supplier_name text,
  current_stock integer,
  reorder_point integer,
  max_stock_level integer,
  avg_daily_sales numeric,
  days_of_coverage integer,
  urgency_level text,
  lead_time_days integer,
  recommended_order_quantity integer,
  seasonal_multiplier numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    COALESCE(ps.supplier_id, s.id) as supplier_id,
    COALESCE(s.name, 'Unknown Supplier') as supplier_name,
    COALESCE(p.current_stock, 0) as current_stock,
    COALESCE(p.reorder_point, 20) as reorder_point,
    COALESCE(p.max_stock_level, 1000) as max_stock_level,
    
    -- Calculate average daily sales with proper handling of zero sales
    GREATEST(
      COALESCE(
        (SELECT SUM(si.quantity)::numeric / GREATEST(analysis_days, 1)
         FROM sale_items si 
         JOIN sales sal ON sal.id = si.sale_id
         WHERE si.product_id = p.id 
         AND sal.sale_date >= CURRENT_DATE - INTERVAL '1 day' * analysis_days
        ), 0
      ), 
      0.1  -- Minimum daily sales assumption for products with no sales history
    ) as avg_daily_sales,
    
    -- Calculate days of coverage with realistic bounds
    LEAST(
      CASE 
        WHEN COALESCE(
          (SELECT SUM(si.quantity)::numeric / GREATEST(analysis_days, 1)
           FROM sale_items si 
           JOIN sales sal ON sal.id = si.sale_id
           WHERE si.product_id = p.id 
           AND sal.sale_date >= CURRENT_DATE - INTERVAL '1 day' * analysis_days
          ), 0
        ) > 0 THEN
          ROUND(COALESCE(p.current_stock, 0) / GREATEST(
            (SELECT SUM(si.quantity)::numeric / GREATEST(analysis_days, 1)
             FROM sale_items si 
             JOIN sales sal ON sal.id = si.sale_id
             WHERE si.product_id = p.id 
             AND sal.sale_date >= CURRENT_DATE - INTERVAL '1 day' * analysis_days
            ), 0.1
          ))
        ELSE 
          -- For products with no sales history, assume based on stock level
          CASE 
            WHEN COALESCE(p.current_stock, 0) = 0 THEN 0
            WHEN COALESCE(p.current_stock, 0) <= 5 THEN 30   -- Low stock = 30 days coverage assumption
            WHEN COALESCE(p.current_stock, 0) <= 20 THEN 60  -- Medium stock = 60 days
            ELSE 90  -- High stock = 90 days maximum
          END
      END,
      365  -- Cap at 1 year maximum coverage
    )::integer as days_of_coverage,
    
    -- Determine urgency level based on stock and coverage
    CASE 
      WHEN COALESCE(p.current_stock, 0) = 0 THEN 'critical'
      WHEN COALESCE(p.current_stock, 0) <= 5 THEN 'critical'
      WHEN COALESCE(p.current_stock, 0) <= COALESCE(p.reorder_point, 20) THEN 'high'
      WHEN COALESCE(p.current_stock, 0) <= (COALESCE(p.reorder_point, 20) * 1.5) THEN 'medium'
      ELSE 'low'
    END as urgency_level,
    
    COALESCE(ps.lead_time_days, s.lead_time_days, 14) as lead_time_days,
    
    -- Calculate recommended order quantity
    CASE 
      WHEN COALESCE(p.current_stock, 0) <= COALESCE(p.reorder_point, 20) THEN
        GREATEST(
          COALESCE(p.reorder_quantity, 50),
          -- Order enough for lead time + safety stock
          ROUND(
            GREATEST(
              (SELECT SUM(si.quantity)::numeric / GREATEST(analysis_days, 1)
               FROM sale_items si 
               JOIN sales sal ON sal.id = si.sale_id
               WHERE si.product_id = p.id 
               AND sal.sale_date >= CURRENT_DATE - INTERVAL '1 day' * analysis_days
              ), 0.1
            ) * (COALESCE(ps.lead_time_days, s.lead_time_days, 14) + 7)  -- lead time + 1 week safety
          )::integer
        )
      ELSE 0
    END as recommended_order_quantity,
    
    -- Simple seasonal multiplier (can be enhanced)
    CASE 
      WHEN EXTRACT(month FROM CURRENT_DATE) IN (12, 1, 2) THEN 1.2  -- Winter
      WHEN EXTRACT(month FROM CURRENT_DATE) IN (6, 7, 8) THEN 1.1   -- Summer
      ELSE 1.0
    END as seasonal_multiplier
    
  FROM products p
  LEFT JOIN product_suppliers ps ON ps.product_id = p.id AND ps.is_preferred = true
  LEFT JOIN suppliers s ON s.id = ps.supplier_id
  WHERE p.is_active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(p.current_stock, 0) = 0 THEN 1
      WHEN COALESCE(p.current_stock, 0) <= 5 THEN 2
      WHEN COALESCE(p.current_stock, 0) <= COALESCE(p.reorder_point, 20) THEN 3
      ELSE 4
    END,
    p.name;
END;
$$;