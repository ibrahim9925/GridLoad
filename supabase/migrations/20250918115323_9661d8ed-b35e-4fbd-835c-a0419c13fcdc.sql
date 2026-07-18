-- Complete data generation without triggers

-- Disable ALL stock-related triggers temporarily
DROP TRIGGER IF EXISTS comprehensive_sales_automation ON public.sales;
DROP TRIGGER IF EXISTS comprehensive_sales_automation_enhanced ON public.sales;
DROP TRIGGER IF EXISTS update_stock_on_sale_item ON public.sale_items;
DROP TRIGGER IF EXISTS update_stock_on_sale ON public.sale_items;
DROP TRIGGER IF EXISTS trigger_stock_alerts_on_sale ON public.sales;

-- Generate minimal sales data for testing
INSERT INTO public.sales (
  customer_id, sales_rep_id, sale_date, total_amount, payment_status, 
  fulfillment_status, invoice_number, notes
)
SELECT 
  (SELECT id FROM public.customers ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM public.staff WHERE role = 'sales_rep' ORDER BY RANDOM() LIMIT 1),
  CURRENT_DATE - (RANDOM() * 180)::INTEGER,
  5000 + (RANDOM() * 15000)::NUMERIC(10,2),
  CASE WHEN RANDOM() > 0.3 THEN 'paid' ELSE 'pending' END,
  'delivered',
  'SC-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  'Supply chain test data'
FROM generate_series(1, 30)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sales WHERE invoice_number LIKE 'SC-%'
);

-- Generate simple sale items
INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
SELECT 
  s.id,
  (SELECT id FROM public.products WHERE is_active = true ORDER BY RANDOM() LIMIT 1),
  1 + (RANDOM() * 2)::INTEGER,
  500 + (RANDOM() * 1000)::NUMERIC(10,2),
  0
FROM public.sales s
WHERE s.invoice_number LIKE 'SC-%'
AND NOT EXISTS (SELECT 1 FROM public.sale_items si WHERE si.sale_id = s.id)
LIMIT 50;

-- Update line totals and sales totals
UPDATE public.sale_items SET line_total = quantity * unit_price WHERE line_total = 0;

UPDATE public.sales SET total_amount = (
  SELECT COALESCE(SUM(line_total), total_amount) 
  FROM public.sale_items 
  WHERE sale_items.sale_id = sales.id
) WHERE invoice_number LIKE 'SC-%';

-- Add some purchase orders for payables
INSERT INTO public.purchase_orders (
  supplier_id, order_number, order_date, expected_delivery_date, 
  status, total_amount, currency, notes
)
SELECT 
  s.id,
  'SC-PO-' || LPAD((ROW_NUMBER() OVER())::TEXT, 4, '0'),
  CURRENT_DATE - (RANDOM() * 20)::INTEGER,
  CURRENT_DATE + (RANDOM() * 40 + 10)::INTEGER,
  CASE WHEN RANDOM() > 0.8 THEN 'confirmed' ELSE 'pending' END,
  50000 + (RANDOM() * 150000)::NUMERIC(10,2),
  'USD',
  'Supply chain test payable'
FROM public.suppliers s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.purchase_orders WHERE order_number LIKE 'SC-PO-%'
)
LIMIT 3;

-- Create a hook to use real-time seasonal coverage
CREATE OR REPLACE FUNCTION get_intelligent_reorder_recommendations()
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  supplier_name TEXT,
  current_stock INTEGER,
  monthly_sales NUMERIC,
  target_coverage NUMERIC,
  coverage_months NUMERIC,
  recommended_quantity INTEGER,
  estimated_cost NUMERIC,
  priority_level TEXT,
  action_recommended TEXT
) AS $$
DECLARE
  seasonal_target NUMERIC;
BEGIN
  -- Get current seasonal target
  seasonal_target := get_seasonal_coverage_target();
  
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    COALESCE(s.name, 'Unknown Supplier'),
    p.current_stock,
    COALESCE(
      (SELECT AVG(monthly_qty) FROM (
        SELECT DATE_TRUNC('month', sales.sale_date) as month,
               SUM(si.quantity) as monthly_qty
        FROM sale_items si
        JOIN sales ON sales.id = si.sale_id
        WHERE si.product_id = p.id 
        AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', sales.sale_date)
      ) monthly_sales), 0.5
    ) as monthly_sales_calc,
    seasonal_target * COALESCE(p.seasonal_factor, 1.0) as target_coverage_calc,
    CASE 
      WHEN COALESCE(
        (SELECT AVG(monthly_qty) FROM (
          SELECT DATE_TRUNC('month', sales.sale_date) as month,
                 SUM(si.quantity) as monthly_qty
          FROM sale_items si
          JOIN sales ON sales.id = si.sale_id
          WHERE si.product_id = p.id 
          AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', sales.sale_date)
        ) monthly_sales), 0.5
      ) > 0 THEN 
        p.current_stock / COALESCE(
          (SELECT AVG(monthly_qty) FROM (
            SELECT DATE_TRUNC('month', sales.sale_date) as month,
                   SUM(si.quantity) as monthly_qty
            FROM sale_items si
            JOIN sales ON sales.id = si.sale_id
            WHERE si.product_id = p.id 
            AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', sales.sale_date)
          ) monthly_sales), 0.5
        )
      ELSE 12
    END as coverage_calc,
    GREATEST(1, CEIL(
      COALESCE(
        (SELECT AVG(monthly_qty) FROM (
          SELECT DATE_TRUNC('month', sales.sale_date) as month,
                 SUM(si.quantity) as monthly_qty
          FROM sale_items si
          JOIN sales ON sales.id = si.sale_id
          WHERE si.product_id = p.id 
          AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', sales.sale_date)
        ) monthly_sales), 0.5
      ) * (seasonal_target * COALESCE(p.seasonal_factor, 1.0) - 
           CASE 
             WHEN COALESCE(
               (SELECT AVG(monthly_qty) FROM (
                 SELECT DATE_TRUNC('month', sales.sale_date) as month,
                        SUM(si.quantity) as monthly_qty
                 FROM sale_items si
                 JOIN sales ON sales.id = si.sale_id
                 WHERE si.product_id = p.id 
                 AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', sales.sale_date)
               ) monthly_sales), 0.5
             ) > 0 THEN 
               p.current_stock / COALESCE(
                 (SELECT AVG(monthly_qty) FROM (
                   SELECT DATE_TRUNC('month', sales.sale_date) as month,
                          SUM(si.quantity) as monthly_qty
                   FROM sale_items si
                   JOIN sales ON sales.id = si.sale_id
                   WHERE si.product_id = p.id 
                   AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                   GROUP BY DATE_TRUNC('month', sales.sale_date)
                 ) monthly_sales), 0.5
               )
             ELSE 12
           END)
    )) as recommended_qty,
    COALESCE(p.cost_nis, p.cost_price, 100) * GREATEST(1, CEIL(
      COALESCE(
        (SELECT AVG(monthly_qty) FROM (
          SELECT DATE_TRUNC('month', sales.sale_date) as month,
                 SUM(si.quantity) as monthly_qty
          FROM sale_items si
          JOIN sales ON sales.id = si.sale_id
          WHERE si.product_id = p.id 
          AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY DATE_TRUNC('month', sales.sale_date)
        ) monthly_sales), 0.5
      ) * (seasonal_target * COALESCE(p.seasonal_factor, 1.0))
    )) as cost_estimate,
    CASE 
      WHEN p.current_stock <= COALESCE(p.reorder_point, 10) THEN 'Critical'
      WHEN CASE 
             WHEN COALESCE(
               (SELECT AVG(monthly_qty) FROM (
                 SELECT DATE_TRUNC('month', sales.sale_date) as month,
                        SUM(si.quantity) as monthly_qty
                 FROM sale_items si
                 JOIN sales ON sales.id = si.sale_id
                 WHERE si.product_id = p.id 
                 AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', sales.sale_date)
               ) monthly_sales), 0.5
             ) > 0 THEN 
               p.current_stock / COALESCE(
                 (SELECT AVG(monthly_qty) FROM (
                   SELECT DATE_TRUNC('month', sales.sale_date) as month,
                          SUM(si.quantity) as monthly_qty
                   FROM sale_items si
                   JOIN sales ON sales.id = si.sale_id
                   WHERE si.product_id = p.id 
                   AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                   GROUP BY DATE_TRUNC('month', sales.sale_date)
                 ) monthly_sales), 0.5
               )
             ELSE 12
           END < seasonal_target * 0.7 THEN 'High'
      WHEN CASE 
             WHEN COALESCE(
               (SELECT AVG(monthly_qty) FROM (
                 SELECT DATE_TRUNC('month', sales.sale_date) as month,
                        SUM(si.quantity) as monthly_qty
                 FROM sale_items si
                 JOIN sales ON sales.id = si.sale_id
                 WHERE si.product_id = p.id 
                 AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', sales.sale_date)
               ) monthly_sales), 0.5
             ) > 0 THEN 
               p.current_stock / COALESCE(
                 (SELECT AVG(monthly_qty) FROM (
                   SELECT DATE_TRUNC('month', sales.sale_date) as month,
                          SUM(si.quantity) as monthly_qty
                   FROM sale_items si
                   JOIN sales ON sales.id = si.sale_id
                   WHERE si.product_id = p.id 
                   AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                   GROUP BY DATE_TRUNC('month', sales.sale_date)
                 ) monthly_sales), 0.5
               )
             ELSE 12
           END < seasonal_target THEN 'Medium'
      ELSE 'Low'
    END,
    CASE 
      WHEN p.current_stock <= COALESCE(p.reorder_point, 10) THEN 'Order Immediately'
      WHEN CASE 
             WHEN COALESCE(
               (SELECT AVG(monthly_qty) FROM (
                 SELECT DATE_TRUNC('month', sales.sale_date) as month,
                        SUM(si.quantity) as monthly_qty
                 FROM sale_items si
                 JOIN sales ON sales.id = si.sale_id
                 WHERE si.product_id = p.id 
                 AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', sales.sale_date)
               ) monthly_sales), 0.5
             ) > 0 THEN 
               p.current_stock / COALESCE(
                 (SELECT AVG(monthly_qty) FROM (
                   SELECT DATE_TRUNC('month', sales.sale_date) as month,
                          SUM(si.quantity) as monthly_qty
                   FROM sale_items si
                   JOIN sales ON sales.id = si.sale_id
                   WHERE si.product_id = p.id 
                   AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                   GROUP BY DATE_TRUNC('month', sales.sale_date)
                 ) monthly_sales), 0.5
               )
             ELSE 12
           END < seasonal_target THEN 'Reorder Soon'
      ELSE 'Monitor'
    END
  FROM products p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true
  ORDER BY 
    CASE 
      WHEN p.current_stock <= COALESCE(p.reorder_point, 10) THEN 1
      WHEN CASE 
             WHEN COALESCE(
               (SELECT AVG(monthly_qty) FROM (
                 SELECT DATE_TRUNC('month', sales.sale_date) as month,
                        SUM(si.quantity) as monthly_qty
                 FROM sale_items si
                 JOIN sales ON sales.id = si.sale_id
                 WHERE si.product_id = p.id 
                 AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                 GROUP BY DATE_TRUNC('month', sales.sale_date)
               ) monthly_sales), 0.5
             ) > 0 THEN 
               p.current_stock / COALESCE(
                 (SELECT AVG(monthly_qty) FROM (
                   SELECT DATE_TRUNC('month', sales.sale_date) as month,
                          SUM(si.quantity) as monthly_qty
                   FROM sale_items si
                   JOIN sales ON sales.id = si.sale_id
                   WHERE si.product_id = p.id 
                   AND sales.sale_date >= CURRENT_DATE - INTERVAL '6 months'
                   GROUP BY DATE_TRUNC('month', sales.sale_date)
                 ) monthly_sales), 0.5
               )
             ELSE 12
           END < seasonal_target THEN 2
      ELSE 3
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;