-- Fix RLS policies for better deletion permissions and add bank integration functions

-- 1. Update sales RLS to allow deletion for admins and accountants
DROP POLICY IF EXISTS "sales_staff_access" ON public.sales;
CREATE POLICY "sales_staff_access" 
ON public.sales 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = ANY (ARRAY['admin'::user_role, 'sales_rep'::user_role, 'warehouse'::user_role, 'accountant'::user_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = ANY (ARRAY['admin'::user_role, 'sales_rep'::user_role, 'accountant'::user_role])
  )
);

-- 2. Update suppliers RLS to allow deletion for admins and warehouse
DROP POLICY IF EXISTS "suppliers_role_based_access" ON public.suppliers;
CREATE POLICY "suppliers_role_based_access" 
ON public.suppliers 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = ANY (ARRAY['admin'::user_role, 'warehouse'::user_role, 'accountant'::user_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true 
    AND staff.role = ANY (ARRAY['admin'::user_role, 'warehouse'::user_role])
  )
);

-- 3. Create advanced supply chain intelligence functions

-- Get real-time cash flow status for supply chain decisions
CREATE OR REPLACE FUNCTION public.get_supply_chain_cash_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_balance numeric;
  frozen_capital numeric;
  pending_orders numeric;
  available_liquidity numeric;
BEGIN
  -- Calculate total balance across all accounts
  SELECT COALESCE(SUM(current_balance), 0) INTO total_balance
  FROM public.bank_accounts 
  WHERE is_active = true;
  
  -- Calculate frozen capital (pending POs)
  SELECT COALESCE(SUM(total_amount), 0) INTO frozen_capital
  FROM public.purchase_orders 
  WHERE status IN ('pending', 'confirmed', 'shipped');
  
  -- Calculate pending customer payments
  SELECT COALESCE(SUM(balance_due), 0) INTO pending_orders
  FROM public.sales 
  WHERE payment_status IN ('pending', 'partial_paid');
  
  -- Available liquidity calculation
  available_liquidity := total_balance - frozen_capital;
  
  result := jsonb_build_object(
    'total_balance', total_balance,
    'frozen_capital', frozen_capital,
    'available_liquidity', GREATEST(available_liquidity, 0),
    'pending_receivables', pending_orders,
    'cash_flow_health', CASE 
      WHEN available_liquidity > 50000 THEN 'healthy'
      WHEN available_liquidity > 10000 THEN 'moderate'
      ELSE 'constrained'
    END,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- Get supplier performance with risk scoring
CREATE OR REPLACE FUNCTION public.get_enhanced_supplier_performance()
RETURNS TABLE(
  supplier_id uuid,
  supplier_name text,
  total_orders integer,
  avg_lead_time_actual numeric,
  on_time_delivery_rate numeric,
  quality_incidents integer,
  total_value_ordered numeric,
  risk_score numeric,
  performance_grade text,
  last_order_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    COUNT(po.id)::integer as total_orders,
    AVG(CASE 
      WHEN po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL 
      THEN EXTRACT(days FROM po.actual_delivery_date - po.expected_delivery_date)
      ELSE s.lead_time_days::numeric
    END) as avg_lead_time_actual,
    (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
     NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0) * 100) as on_time_delivery_rate,
    0::integer as quality_incidents, -- Placeholder for future quality tracking
    COALESCE(SUM(po.total_amount), 0) as total_value_ordered,
    -- Risk score calculation (lower is better)
    (CASE 
      WHEN s.lead_time_days > 60 THEN 30
      WHEN s.lead_time_days > 30 THEN 15
      ELSE 5
    END +
    CASE 
      WHEN COUNT(po.id) = 0 THEN 50 -- No history
      WHEN (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0)) < 0.7 THEN 40
      WHEN (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0)) < 0.85 THEN 20
      ELSE 5
    END) as risk_score,
    -- Performance grade
    CASE 
      WHEN COUNT(po.id) = 0 THEN 'Ungraded'
      WHEN (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0)) >= 0.9 
           AND s.lead_time_days <= 30 THEN 'A+'
      WHEN (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0)) >= 0.8 THEN 'A'
      WHEN (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN po.actual_delivery_date IS NOT NULL THEN 1 END), 0)) >= 0.7 THEN 'B'
      ELSE 'C'
    END as performance_grade,
    MAX(po.order_date) as last_order_date
  FROM public.suppliers s
  LEFT JOIN public.purchase_orders po ON po.supplier_id = s.id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, s.lead_time_days
  ORDER BY risk_score ASC, total_value_ordered DESC;
END;
$$;

-- Get intelligent reorder recommendations based on real data
CREATE OR REPLACE FUNCTION public.get_intelligent_reorder_recommendations()
RETURNS TABLE(
  product_id uuid,
  product_name text,
  current_stock integer,
  sales_velocity numeric,
  days_until_stockout integer,
  recommended_order_qty integer,
  best_supplier_id uuid,
  best_supplier_name text,
  estimated_cost numeric,
  priority_score numeric,
  action_required text
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
    p.current_stock,
    -- Calculate sales velocity (units per day over last 30 days)
    COALESCE(
      (SELECT SUM(si.quantity) / 30.0 
       FROM public.sale_items si 
       JOIN public.sales s ON s.id = si.sale_id 
       WHERE si.product_id = p.id 
       AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
      0.1
    ) as sales_velocity,
    -- Days until stockout
    CASE 
      WHEN COALESCE(
        (SELECT SUM(si.quantity) / 30.0 
         FROM public.sale_items si 
         JOIN public.sales s ON s.id = si.sale_id 
         WHERE si.product_id = p.id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
        0.1
      ) > 0 
      THEN (p.current_stock / COALESCE(
        (SELECT SUM(si.quantity) / 30.0 
         FROM public.sale_items si 
         JOIN public.sales s ON s.id = si.sale_id 
         WHERE si.product_id = p.id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
        0.1
      ))::integer
      ELSE 999
    END as days_until_stockout,
    -- Recommended order quantity
    GREATEST(
      p.reorder_quantity,
      (COALESCE(
        (SELECT SUM(si.quantity) / 30.0 
         FROM public.sale_items si 
         JOIN public.sales s ON s.id = si.sale_id 
         WHERE si.product_id = p.id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
        0.1
      ) * 60)::integer -- 2 months of inventory
    ) as recommended_order_qty,
    -- Best supplier (lowest cost, best performance)
    best_ps.supplier_id as best_supplier_id,
    best_s.name as best_supplier_name,
    best_ps.cost_price * GREATEST(
      p.reorder_quantity,
      (COALESCE(
        (SELECT SUM(si.quantity) / 30.0 
         FROM public.sale_items si 
         JOIN public.sales s ON s.id = si.sale_id 
         WHERE si.product_id = p.id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
        0.1
      ) * 60)::integer
    ) as estimated_cost,
    -- Priority score (higher = more urgent)
    (
      CASE 
        WHEN p.current_stock <= p.reorder_point THEN 100
        WHEN p.current_stock <= p.reorder_point * 1.5 THEN 80
        ELSE 50
      END +
      CASE 
        WHEN COALESCE(
          (SELECT SUM(si.quantity) / 30.0 
           FROM public.sale_items si 
           JOIN public.sales s ON s.id = si.sale_id 
           WHERE si.product_id = p.id 
           AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
          0.1
        ) > 5 THEN 50 -- High velocity
        WHEN COALESCE(
          (SELECT SUM(si.quantity) / 30.0 
           FROM public.sale_items si 
           JOIN public.sales s ON s.id = si.sale_id 
           WHERE si.product_id = p.id 
           AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
          0.1
        ) > 1 THEN 25 -- Medium velocity
        ELSE 10 -- Low velocity
      END
    ) as priority_score,
    -- Action required
    CASE 
      WHEN p.current_stock = 0 THEN 'CRITICAL: Out of stock'
      WHEN p.current_stock <= p.reorder_point AND COALESCE(
        (SELECT SUM(si.quantity) / 30.0 
         FROM public.sale_items si 
         JOIN public.sales s ON s.id = si.sale_id 
         WHERE si.product_id = p.id 
         AND s.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 
        0.1
      ) > 1 THEN 'URGENT: Order immediately'
      WHEN p.current_stock <= p.reorder_point * 1.5 THEN 'MODERATE: Plan order'
      ELSE 'LOW: Monitor stock'
    END as action_required
  FROM public.products p
  LEFT JOIN LATERAL (
    SELECT ps.supplier_id, ps.cost_price
    FROM public.product_suppliers ps
    JOIN public.suppliers s ON s.id = ps.supplier_id
    WHERE ps.product_id = p.id AND s.is_active = true
    ORDER BY ps.cost_price ASC, s.reliability_score DESC
    LIMIT 1
  ) best_ps ON true
  LEFT JOIN public.suppliers best_s ON best_s.id = best_ps.supplier_id
  WHERE p.is_active = true
  ORDER BY priority_score DESC, sales_velocity DESC;
END;
$$;