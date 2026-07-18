-- Complete the ABC Analysis function that was incomplete
CREATE OR REPLACE FUNCTION public.calculate_abc_analysis()
 RETURNS TABLE(product_id uuid, product_name text, annual_consumption_value numeric, abc_category text, percentage_of_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_value numeric;
BEGIN
  -- Calculate total annual consumption value
  SELECT COALESCE(SUM(consumption_data.annual_value), 0) INTO total_value
  FROM (
    SELECT 
      p.id,
      COALESCE(SUM(si.quantity * si.unit_price), 0) as annual_value
    FROM public.products p
    LEFT JOIN public.sale_items si ON si.product_id = p.id
    LEFT JOIN public.sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months' OR s.sale_date IS NULL
    GROUP BY p.id
  ) consumption_data;
  
  -- Return ABC analysis results with proper column aliases
  RETURN QUERY
  WITH consumption_data AS (
    SELECT 
      p.id as product_id,
      p.name as product_name,
      COALESCE(SUM(si.quantity * si.unit_price), 0) as annual_consumption_value
    FROM public.products p
    LEFT JOIN public.sale_items si ON si.product_id = p.id
    LEFT JOIN public.sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months' OR s.sale_date IS NULL
    GROUP BY p.id, p.name
    ORDER BY annual_consumption_value DESC
  ),
  with_percentages AS (
    SELECT 
      consumption_data.product_id,
      consumption_data.product_name,
      consumption_data.annual_consumption_value,
      CASE 
        WHEN total_value = 0 THEN 0 
        ELSE (consumption_data.annual_consumption_value / total_value * 100) 
      END as percentage_of_total,
      SUM(
        CASE 
          WHEN total_value = 0 THEN 0 
          ELSE (consumption_data.annual_consumption_value / total_value * 100) 
        END
      ) OVER (ORDER BY consumption_data.annual_consumption_value DESC) as cumulative_percentage
    FROM consumption_data
  )
  SELECT 
    with_percentages.product_id,
    with_percentages.product_name,
    with_percentages.annual_consumption_value,
    CASE 
      WHEN with_percentages.cumulative_percentage <= 80 THEN 'A'
      WHEN with_percentages.cumulative_percentage <= 95 THEN 'B'
      ELSE 'C'
    END as abc_category,
    with_percentages.percentage_of_total
  FROM with_percentages;
END;
$function$