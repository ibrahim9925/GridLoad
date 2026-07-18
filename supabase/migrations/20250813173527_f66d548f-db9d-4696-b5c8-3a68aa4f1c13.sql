-- Critical Security Fixes Phase 2: Function Security, Auth Settings, and Enhanced RLS

-- 1. Fix function search paths for security (addresses WARN 1 & 2)
DROP FUNCTION IF EXISTS public.update_site_settings_updated_at();
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'sales_rep');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Create MFA settings table for enhanced security
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mfa_enabled boolean DEFAULT false,
  totp_secret text,
  backup_codes_encrypted text[],
  backup_codes_used_at timestamp with time zone[],
  last_totp_used text,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

-- RLS for MFA settings - users can only access their own settings
CREATE POLICY "Users can manage own MFA settings" ON public.user_mfa_settings
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Create user sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_fingerprint text NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + INTERVAL '8 hours'),
  last_activity timestamp with time zone DEFAULT now()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS for user sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions" ON public.user_sessions
FOR ALL USING (true) WITH CHECK (true);

-- 4. Create installation_sale_items table for proper Sales-Installation integration
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

-- RLS for installation sale items
CREATE POLICY "Installation staff can manage items" ON public.installation_sale_items
FOR ALL USING (is_admin() OR is_installer() OR is_sales_rep());

-- 5. Create automation_executions table for Automation Hub
CREATE TABLE IF NOT EXISTS public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE NOT NULL,
  trigger_data jsonb NOT NULL DEFAULT '{}',
  execution_result jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  execution_duration_ms integer,
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS for automation executions
CREATE POLICY "Admins can view automation executions" ON public.automation_executions
FOR SELECT USING (is_admin());

CREATE POLICY "System can manage automation executions" ON public.automation_executions
FOR ALL USING (true) WITH CHECK (true);

-- 6. Enhanced function for automatic installation creation from sales
CREATE OR REPLACE FUNCTION public.auto_create_installation_from_sale()
RETURNS TRIGGER AS $$
DECLARE
  installation_id uuid;
  sale_item RECORD;
BEGIN
  -- Only create installation if sale is marked as requiring installation
  IF NEW.fulfillment_status = 'pending'::fulfillment_status AND 
     (NEW.notes ILIKE '%install%' OR NEW.delivery_preference = 'installation') THEN
    
    -- Create installation record
    INSERT INTO public.installations (
      sale_id, customer_id, status, site_address, installation_notes
    ) VALUES (
      NEW.id, NEW.customer_id, 'scheduled'::installation_status, 
      NEW.shipping_address, 'Auto-created from sale #' || NEW.invoice_number
    ) RETURNING id INTO installation_id;
    
    -- Link sale items to installation
    FOR sale_item IN 
      SELECT * FROM public.sale_items WHERE sale_id = NEW.id
    LOOP
      INSERT INTO public.installation_sale_items (
        installation_id, sale_item_id, quantity_to_install
      ) VALUES (
        installation_id, sale_item.id, sale_item.quantity
      );
    END LOOP;
    
    -- Log the automation
    INSERT INTO public.automation_executions (
      automation_rule_id, trigger_data, execution_result, status, completed_at
    ) SELECT 
      ar.id,
      jsonb_build_object('sale_id', NEW.id, 'trigger', 'sale_created'),
      jsonb_build_object('installation_id', installation_id, 'success', true),
      'completed',
      now()
    FROM public.automation_rules ar 
    WHERE ar.trigger_type = 'sale_created' AND ar.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic installation creation
DROP TRIGGER IF EXISTS auto_create_installation_from_sale_trigger ON public.sales;
CREATE TRIGGER auto_create_installation_from_sale_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_installation_from_sale();

-- 7. Enhanced function for automatic inventory updates from purchase orders
CREATE OR REPLACE FUNCTION public.update_inventory_from_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
  po_item RECORD;
BEGIN
  -- Only process when purchase order status changes to 'received'
  IF OLD.status != 'received' AND NEW.status = 'received' THEN
    
    -- Update inventory for each item in the purchase order
    FOR po_item IN 
      SELECT poi.product_id, poi.quantity_received, poi.unit_cost
      FROM public.purchase_order_items poi 
      WHERE poi.purchase_order_id = NEW.id AND poi.quantity_received > 0
    LOOP
      -- Update product stock
      UPDATE public.products 
      SET current_stock = current_stock + po_item.quantity_received,
          cost_price = po_item.unit_cost,
          updated_at = now()
      WHERE id = po_item.product_id;
      
      -- Create stock movement record
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, reference_type, 
        reference_id, unit_cost, total_cost, created_by
      ) VALUES (
        po_item.product_id, 'in', po_item.quantity_received, 'purchase_order',
        NEW.id, po_item.unit_cost, po_item.unit_cost * po_item.quantity_received,
        auth.uid()
      );
    END LOOP;
    
    -- Log automation execution
    INSERT INTO public.automation_executions (
      automation_rule_id, trigger_data, execution_result, status, completed_at
    ) SELECT 
      ar.id,
      jsonb_build_object('purchase_order_id', NEW.id, 'trigger', 'purchase_received'),
      jsonb_build_object('items_updated', (SELECT COUNT(*) FROM public.purchase_order_items WHERE purchase_order_id = NEW.id)),
      'completed',
      now()
    FROM public.automation_rules ar 
    WHERE ar.trigger_type = 'purchase_received' AND ar.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create purchase order items table if not exists
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

-- RLS for purchase order items
CREATE POLICY "Warehouse staff can manage PO items" ON public.purchase_order_items
FOR ALL USING (is_admin() OR is_warehouse());

-- Create trigger for inventory updates
DROP TRIGGER IF EXISTS update_inventory_from_purchase_order_trigger ON public.purchase_orders;
CREATE TRIGGER update_inventory_from_purchase_order_trigger
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_from_purchase_order();

-- 8. Create warranty policy updates for proper security
-- First remove overly permissive policies
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

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule_id ON public.automation_executions(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_installation_sale_items_installation ON public.installation_sale_items(installation_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);

-- 10. Sample data for automation rules (enhanced)
INSERT INTO public.automation_rules (name, description, trigger_type, trigger_conditions, action_type, action_config, created_by) VALUES
('Auto Stock Reorder', 'Automatically reorder stock when below threshold', 'stock_low', '{"threshold_type": "below_reorder_point", "auto_reorder": true}', 'create_purchase_order', '{"preferred_supplier": true, "order_quantity_multiplier": 2}', auth.uid()),
('Installation Auto-Schedule', 'Auto-schedule installations for sales requiring installation', 'sale_created', '{"requires_installation": true}', 'create_installation', '{"default_lead_time_days": 7, "auto_assign": true}', auth.uid()),
('Warranty Auto-Register', 'Automatically register warranties for completed installations', 'installation_completed', '{"auto_register": true}', 'create_warranty', '{"warranty_period_months": 12, "warranty_type": "installation"}', auth.uid())
ON CONFLICT (name) DO NOTHING;