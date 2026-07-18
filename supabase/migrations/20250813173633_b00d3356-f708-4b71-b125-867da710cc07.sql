-- Critical Security Fixes Phase 2: Targeted Updates

-- 1. Only create tables that don't exist yet
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

-- Enable RLS only if table was just created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'purchase_order_items' 
    AND policyname = 'Warehouse staff can manage PO items'
  ) THEN
    ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Warehouse staff can manage PO items" ON public.purchase_order_items
    FOR ALL USING (is_admin() OR is_warehouse());
  END IF;
END $$;

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

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'installation_sale_items'
  ) THEN
    ALTER TABLE public.installation_sale_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Installation staff can manage items" ON public.installation_sale_items
    FOR ALL USING (is_admin() OR is_installer() OR is_sales_rep());
  END IF;
END $$;

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

-- Enable RLS only if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'automation_executions'
  ) THEN
    ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can view automation executions" ON public.automation_executions
    FOR SELECT USING (is_admin());
    CREATE POLICY "System can manage automation executions" ON public.automation_executions
    FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Update warranty policies for proper security
DROP POLICY IF EXISTS "Staff can create warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can update warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can view all warranties" ON public.warranties;

-- Create proper restrictive policies
CREATE POLICY "Authorized staff can create warranties" ON public.warranties
FOR INSERT WITH CHECK (is_admin() OR is_sales_rep());

CREATE POLICY "Authorized staff can update warranties" ON public.warranties
FOR UPDATE USING (is_admin() OR is_sales_rep() OR is_warehouse());

CREATE POLICY "Authorized staff can view warranties" ON public.warranties
FOR SELECT USING (is_admin() OR is_sales_rep() OR is_warehouse());

-- 5. Add enhanced automation rules
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_conditions, action_type, action_config, created_by) VALUES
('Auto Stock Reorder', 'Automatically reorder stock when below threshold', 'stock_low', '{"threshold_type": "below_reorder_point", "auto_reorder": true}', 'create_purchase_order', '{"preferred_supplier": true, "order_quantity_multiplier": 2}', (SELECT id FROM auth.users LIMIT 1)),
('Installation Auto-Schedule', 'Auto-schedule installations for sales requiring installation', 'sale_created', '{"requires_installation": true}', 'create_installation', '{"default_lead_time_days": 7, "auto_assign": true}', (SELECT id FROM auth.users LIMIT 1)),
('Warranty Auto-Register', 'Automatically register warranties for completed installations', 'installation_completed', '{"auto_register": true}', 'create_warranty', '{"warranty_period_months": 12, "warranty_type": "installation"}', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- 6. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule_id ON public.automation_executions(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_installation_sale_items_installation ON public.installation_sale_items(installation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);