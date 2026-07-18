-- CRITICAL SECURITY FIX #1: Fix database functions missing search_path parameter
-- This prevents SQL injection and ensures functions use proper schema isolation

-- Fix function search path for all existing functions
CREATE OR REPLACE FUNCTION public.update_inventory_on_po_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  po_item RECORD;
BEGIN
  -- Only process when status changes to 'completed' or 'received'
  IF NEW.status IN ('completed', 'received') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_installation_status_to_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.execute_automation_rule(rule_id uuid, trigger_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- CRITICAL SECURITY FIX #2: Harden Customer Data RLS Policies
-- Restrict customer data access to only admins, accountants, and sales reps who have worked with those customers

-- Drop existing customer policies and create more restrictive ones
DROP POLICY IF EXISTS "Sales reps can view own customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can update own customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can create customers" ON public.customers;
DROP POLICY IF EXISTS "Admin can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and sales can manage customers" ON public.customers;

-- Create new secure customer policies
CREATE POLICY "Admins can manage all customers" ON public.customers
FOR ALL USING (is_admin());

CREATE POLICY "Accountants can view all customers" ON public.customers  
FOR SELECT USING (is_accountant());

CREATE POLICY "Sales reps can only view customers they have sales with" ON public.customers
FOR SELECT USING (
  is_sales_rep() AND (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.customer_id = customers.id 
      AND s.sales_rep_id = auth.uid()
    )
  )
);

CREATE POLICY "Sales reps can only update customers they have sales with" ON public.customers
FOR UPDATE USING (
  is_sales_rep() AND (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.customer_id = customers.id 
      AND s.sales_rep_id = auth.uid()
    )
  )
);

CREATE POLICY "Sales reps can create customers" ON public.customers
FOR INSERT WITH CHECK (is_sales_rep() OR is_admin());

-- CRITICAL SECURITY FIX #3: Harden Staff Data RLS Policies  
-- Restrict staff data access to admin-only and self-access

-- Check if staff table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Staff can view their own profile" ON public.staff;
    DROP POLICY IF EXISTS "Admin can manage all staff" ON public.staff;
    DROP POLICY IF EXISTS "Staff can update own profile" ON public.staff;
    
    -- Create secure staff policies
    CREATE POLICY "Admin can manage all staff" ON public.staff
    FOR ALL USING (is_admin());
    
    CREATE POLICY "Staff can view own profile only" ON public.staff
    FOR SELECT USING (auth.uid() = id OR is_admin());
    
    CREATE POLICY "Staff can update own profile only" ON public.staff
    FOR UPDATE USING (auth.uid() = id OR is_admin());
  END IF;
END
$$;

-- CRITICAL SECURITY FIX #4: Secure MFA Data Access
-- Ensure only account owners can access their MFA data

CREATE POLICY "Strict MFA enrollment access" ON public.mfa_enrollment_sessions
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CRITICAL SECURITY FIX #5: Secure User Session Data
-- Ensure session data is only accessible by the user and admins

-- Check if user_sessions table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
    
    -- Create secure session policies
    CREATE POLICY "Users can view own sessions only" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id OR is_admin());
    
    CREATE POLICY "Users can manage own sessions only" ON public.user_sessions
    FOR ALL USING (auth.uid() = user_id OR is_admin())
    WITH CHECK (auth.uid() = user_id OR is_admin());
  END IF;
END
$$;

-- CRITICAL SECURITY FIX #6: Secure Supplier Data Access
-- Restrict supplier access to warehouse staff and admins only

CREATE POLICY "Restricted supplier access" ON public.suppliers
FOR SELECT USING (is_admin() OR is_warehouse());

CREATE POLICY "Warehouse and admin can manage suppliers" ON public.suppliers
FOR ALL USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());