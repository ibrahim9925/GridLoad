-- CRITICAL SECURITY FIXES

-- 1. Fix database functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_commission_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  commission_rate NUMERIC;
BEGIN
  -- Get the sales rep's commission rate
  SELECT COALESCE(s.commission_rate, 0) INTO commission_rate
  FROM public.staff s
  WHERE s.id = NEW.sales_rep_id;
  
  -- Calculate and update commission amount
  NEW.commission_amount := NEW.total_amount * (commission_rate / 100);
  
  RETURN NEW;
END;
$$;

-- 2. Harden warranty module RLS policies
DROP POLICY IF EXISTS "Staff can view warranties" ON public.warranties;
DROP POLICY IF EXISTS "Staff can view all warranty claims" ON public.warranty_claims;

-- Create stricter warranty policies
CREATE POLICY "Authorized staff can view warranties"
ON public.warranties
FOR SELECT
USING (
  is_admin() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = warranties.sale_id AND s.sales_rep_id = auth.uid()
  )) OR
  is_warehouse()
);

CREATE POLICY "Authorized staff can manage warranties"
ON public.warranties
FOR ALL
USING (
  is_admin() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = warranties.sale_id AND s.sales_rep_id = auth.uid()
  )) OR
  is_warehouse()
)
WITH CHECK (
  is_admin() OR 
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = warranties.sale_id AND s.sales_rep_id = auth.uid()
  )) OR
  is_warehouse()
);

-- Fix warranty claims access - remove public access
DROP POLICY IF EXISTS "Staff can view all warranty claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Staff can create warranty claims" ON public.warranty_claims;
DROP POLICY IF EXISTS "Staff can update warranty claims" ON public.warranty_claims;

CREATE POLICY "Authorized staff can view warranty claims"
ON public.warranty_claims
FOR SELECT
USING (
  is_admin() OR 
  is_warehouse() OR
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.warranties w 
    JOIN public.sales s ON w.sale_id = s.id
    WHERE w.id = warranty_claims.warranty_id AND s.sales_rep_id = auth.uid()
  ))
);

CREATE POLICY "Authorized staff can manage warranty claims"
ON public.warranty_claims
FOR ALL
USING (
  is_admin() OR 
  is_warehouse() OR
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.warranties w 
    JOIN public.sales s ON w.sale_id = s.id
    WHERE w.id = warranty_claims.warranty_id AND s.sales_rep_id = auth.uid()
  ))
)
WITH CHECK (
  is_admin() OR 
  is_warehouse() OR
  (is_sales_rep() AND EXISTS (
    SELECT 1 FROM public.warranties w 
    JOIN public.sales s ON w.sale_id = s.id
    WHERE w.id = warranty_claims.warranty_id AND s.sales_rep_id = auth.uid()
  ))
);

-- 3. Create site_settings table for proper settings management
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  setting_type text NOT NULL DEFAULT 'string',
  description text,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Public settings are viewable by staff"
ON public.site_settings
FOR SELECT
USING (is_public = true AND auth.uid() IS NOT NULL);

-- Create trigger for site_settings
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_settings_updated_at();

-- 4. Create automatic installation from sales trigger
CREATE OR REPLACE FUNCTION public.create_installation_from_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create installation for sales that require installation
  IF NEW.fulfillment_status IN ('pending', 'processing') THEN
    INSERT INTO public.installations (
      sale_id,
      customer_id,
      status,
      site_address,
      installation_notes
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      'scheduled',
      NEW.shipping_address,
      'Auto-created from sale #' || NEW.invoice_number
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic installation creation
DROP TRIGGER IF EXISTS create_installation_on_sale ON public.sales;
CREATE TRIGGER create_installation_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_installation_from_sale();

-- 5. Create purchase order completion trigger for inventory updates
CREATE OR REPLACE FUNCTION public.update_inventory_on_po_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  po_item RECORD;
BEGIN
  -- Only process when status changes to 'completed' or 'received'
  IF NEW.status IN ('completed', 'received') AND OLD.status != NEW.status THEN
    -- Update inventory for each item in the purchase order
    FOR po_item IN 
      SELECT poi.product_id, poi.received_quantity, poi.unit_cost
      FROM public.purchase_order_items poi
      WHERE poi.purchase_order_id = NEW.id
    LOOP
      -- Update product stock
      UPDATE public.products 
      SET 
        current_stock = current_stock + po_item.received_quantity,
        last_restock_date = NEW.actual_delivery_date,
        updated_at = now()
      WHERE id = po_item.product_id;
      
      -- Create stock movement record
      INSERT INTO public.stock_movements (
        product_id, 
        movement_type, 
        quantity, 
        unit_cost,
        total_cost,
        reference_type, 
        reference_id, 
        created_by,
        notes
      ) VALUES (
        po_item.product_id,
        'in',
        po_item.received_quantity,
        po_item.unit_cost,
        po_item.received_quantity * po_item.unit_cost,
        'purchase_order',
        NEW.id,
        auth.uid(),
        'Inventory update from PO completion'
      );
      
      -- Create inventory valuation record
      INSERT INTO public.inventory_valuations (
        product_id,
        quantity,
        unit_cost,
        total_value,
        valuation_method
      ) VALUES (
        po_item.product_id,
        po_item.received_quantity,
        po_item.unit_cost,
        po_item.received_quantity * po_item.unit_cost,
        'weighted_average'
      );
    END LOOP;
    
    -- Generate stock alerts after inventory update
    PERFORM generate_stock_alerts();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for purchase order completion
DROP TRIGGER IF EXISTS update_inventory_on_po_completion ON public.purchase_orders;
CREATE TRIGGER update_inventory_on_po_completion
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_po_completion();

-- 6. Create installation status sync trigger
CREATE OR REPLACE FUNCTION public.sync_installation_status_to_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update sale fulfillment status based on installation status
  IF NEW.status != OLD.status THEN
    UPDATE public.sales 
    SET 
      fulfillment_status = CASE 
        WHEN NEW.status = 'completed' THEN 'delivered'
        WHEN NEW.status = 'in_progress' THEN 'processing'
        WHEN NEW.status = 'scheduled' THEN 'pending'
        ELSE fulfillment_status
      END,
      actual_delivery_date = CASE 
        WHEN NEW.status = 'completed' THEN NEW.completion_date
        ELSE actual_delivery_date
      END,
      updated_at = now()
    WHERE id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for installation status sync
DROP TRIGGER IF EXISTS sync_installation_status_to_sale ON public.installations;
CREATE TRIGGER sync_installation_status_to_sale
  AFTER UPDATE ON public.installations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_installation_status_to_sale();

-- 7. Enhanced automation rule execution function
CREATE OR REPLACE FUNCTION public.execute_automation_rule(rule_id uuid, trigger_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rule_record RECORD;
  execution_id uuid;
  action_result jsonb := '{}';
  start_time timestamp with time zone := now();
BEGIN
  -- Get the automation rule
  SELECT * INTO rule_record 
  FROM public.automation_rules 
  WHERE id = rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Automation rule not found or inactive: %', rule_id;
  END IF;
  
  -- Create execution record
  INSERT INTO public.automation_executions (
    automation_rule_id,
    trigger_data,
    started_at,
    status
  ) VALUES (
    rule_id,
    trigger_data,
    start_time,
    'running'
  ) RETURNING id INTO execution_id;
  
  -- Execute based on action type
  CASE rule_record.action_type
    WHEN 'send_notification' THEN
      -- Log notification action (implement actual notification logic in app)
      action_result := jsonb_build_object(
        'action', 'notification_logged',
        'message', rule_record.action_config->>'message'
      );
    
    WHEN 'update_stock_alert' THEN
      -- Generate stock alerts
      PERFORM generate_stock_alerts();
      action_result := jsonb_build_object('action', 'stock_alerts_generated');
    
    WHEN 'create_purchase_order' THEN
      -- Log PO creation request (implement actual PO creation in app)
      action_result := jsonb_build_object(
        'action', 'po_creation_requested',
        'products', rule_record.action_config->'products'
      );
    
    ELSE
      action_result := jsonb_build_object('action', 'unknown_action_type');
  END CASE;
  
  -- Update execution record
  UPDATE public.automation_executions 
  SET 
    status = 'completed',
    completed_at = now(),
    execution_duration_ms = EXTRACT(EPOCH FROM (now() - start_time)) * 1000,
    execution_result = action_result
  WHERE id = execution_id;
  
  -- Update rule execution stats
  UPDATE public.automation_rules 
  SET 
    last_executed_at = now(),
    execution_count = execution_count + 1
  WHERE id = rule_id;
  
  RETURN execution_id;
END;
$$;

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('company_name', '"GridLoad Energy Solutions"', 'string', 'Company name displayed throughout the application', true),
('company_email', '"info@gridload.com"', 'string', 'Primary company email address', true),
('company_phone', '"+1-555-0123"', 'string', 'Primary company phone number', true),
('company_address', '"123 Energy Street, Solar City, SC 12345"', 'string', 'Company physical address', true),
('default_tax_rate', '8.5', 'number', 'Default tax rate percentage', false),
('default_warranty_months', '12', 'number', 'Default warranty period in months', false),
('auto_create_installations', 'true', 'boolean', 'Automatically create installation records from sales', false),
('stock_alert_threshold', '20', 'number', 'Default stock alert threshold', false),
('mfa_required_roles', '["admin", "accountant"]', 'array', 'Roles that require MFA', false),
('session_timeout_minutes', '480', 'number', 'Session timeout in minutes', false)
ON CONFLICT (setting_key) DO NOTHING;