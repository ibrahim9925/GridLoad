-- Critical Security Fixes Phase 2: Simplified Updates

-- 1. Create purchase order items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  quantity_ordered integer NOT NULL,
  quantity_received integer DEFAULT 0,
  unit_cost numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 2. Create installation sale items table
CREATE TABLE IF NOT EXISTS public.installation_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES public.installations(id) ON DELETE CASCADE NOT NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE CASCADE NOT NULL,
  quantity_to_install integer NOT NULL DEFAULT 0,
  quantity_installed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(installation_id, sale_item_id)
);

ALTER TABLE public.installation_sale_items ENABLE ROW LEVEL SECURITY;

-- 3. Create automation executions table
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  trigger_data jsonb NOT NULL DEFAULT '{}',
  execution_result jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  execution_duration_ms integer,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policies
CREATE POLICY "Warehouse staff can manage PO items" ON public.purchase_order_items
FOR ALL USING (is_admin() OR is_warehouse());

CREATE POLICY "Installation staff can manage items" ON public.installation_sale_items
FOR ALL USING (is_admin() OR is_installer() OR is_sales_rep());

CREATE POLICY "Admins can view automation executions" ON public.automation_executions
FOR SELECT USING (is_admin());

CREATE POLICY "System can manage automation executions" ON public.automation_executions
FOR ALL USING (true) WITH CHECK (true);

-- 5. Update warranty policies for proper security
DROP POLICY IF EXISTS "Staff can create warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can update warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can view all warranties" ON public.warranties;

CREATE POLICY "Authorized staff can create warranties" ON public.warranties
FOR INSERT WITH CHECK (is_admin() OR is_sales_rep());

CREATE POLICY "Authorized staff can update warranties" ON public.warranties
FOR UPDATE USING (is_admin() OR is_sales_rep() OR is_warehouse());

CREATE POLICY "Authorized staff can view warranties" ON public.warranties
FOR SELECT USING (is_admin() OR is_sales_rep() OR is_warehouse());