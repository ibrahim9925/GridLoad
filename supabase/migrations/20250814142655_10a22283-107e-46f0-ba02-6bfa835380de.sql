-- Phase 1: Critical Database Schema and Security Fixes

-- 1. Add missing columns to products table for inventory management
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_hand_qty numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point numeric DEFAULT 20;
ALTER TABLE products ADD COLUMN IF NOT EXISTS abc_class text DEFAULT 'C';
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_installation boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT 0;

-- 2. Create comprehensive stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  reason text NOT NULL,
  reference_table text,
  reference_id uuid,
  unit_cost numeric,
  total_cost numeric,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  notes text
);

-- 3. Create installations table with proper structure
CREATE TABLE IF NOT EXISTS installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date date,
  completion_date date,
  assigned_engineer uuid,
  site_address text,
  installation_notes text,
  client_signature_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create comprehensive warranties table
CREATE TABLE IF NOT EXISTS warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  sale_item_id uuid REFERENCES sale_items(id),
  product_id uuid REFERENCES products(id),
  customer_id uuid REFERENCES customers(id),
  serial_number text NOT NULL,
  warranty_start_date date DEFAULT CURRENT_DATE,
  warranty_end_date date NOT NULL,
  warranty_period_months integer DEFAULT 12,
  warranty_type text DEFAULT 'manufacturer' CHECK (warranty_type IN ('manufacturer', 'extended', 'dealer')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'voided')),
  registration_date timestamptz DEFAULT now(),
  registered_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create site_settings table for backend configuration
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

-- 6. Insert default settings
INSERT INTO site_settings (key, value) VALUES 
  ('company_profile', '{"name": "GridLoad", "address": "", "phone": "", "email": ""}'),
  ('taxation', '{"default_rate": 0.1, "inclusive": false}'),
  ('valuation_method', '"weighted_average"'),
  ('otp_ttl', '300'),
  ('session_max_age', '28800'),
  ('password_policy', '{"min_length": 12, "require_special": true, "require_numbers": true}')
ON CONFLICT (key) DO NOTHING;

-- 7. Enable RLS on all tables
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create secure functions with proper search_path

-- Function to handle stock reduction on sale
CREATE OR REPLACE FUNCTION handle_sale_inventory_reduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update product stock
  UPDATE products 
  SET on_hand_qty = on_hand_qty - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    product_id, quantity, movement_type, reason, reference_table, reference_id, created_by
  ) VALUES (
    NEW.product_id, NEW.quantity, 'out', 'sale', 'sale_items', NEW.id, auth.uid()
  );
  
  -- Check for low stock and create alert
  INSERT INTO stock_alerts (product_id, alert_type, threshold_quantity, current_quantity, severity)
  SELECT NEW.product_id, 'low_stock', p.reorder_point, p.on_hand_qty, 
         CASE WHEN p.on_hand_qty <= 0 THEN 'critical' 
              WHEN p.on_hand_qty <= p.reorder_point * 0.5 THEN 'high' 
              ELSE 'medium' END
  FROM products p 
  WHERE p.id = NEW.product_id AND p.on_hand_qty <= p.reorder_point
  ON CONFLICT (product_id, alert_type) DO UPDATE SET
    current_quantity = EXCLUDED.current_quantity,
    severity = EXCLUDED.severity,
    is_acknowledged = false;
  
  RETURN NEW;
END;
$$;

-- Function to auto-create installations
CREATE OR REPLACE FUNCTION create_installation_from_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if sale contains items requiring installation
  IF EXISTS (
    SELECT 1 FROM sale_items si 
    JOIN products p ON p.id = si.product_id 
    WHERE si.sale_id = NEW.id AND p.requires_installation = true
  ) THEN
    INSERT INTO installations (
      sale_id, customer_id, status, site_address, installation_notes
    ) VALUES (
      NEW.id, NEW.customer_id, 'scheduled', NEW.shipping_address,
      'Auto-created from sale #' || COALESCE(NEW.invoice_number, NEW.id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto-create warranties
CREATE OR REPLACE FUNCTION create_warranty_from_sale_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product_warranty_months integer;
  sale_customer_id uuid;
BEGIN
  -- Get product warranty period and sale customer
  SELECT p.warranty_months, s.customer_id 
  INTO product_warranty_months, sale_customer_id
  FROM products p, sales s
  WHERE p.id = NEW.product_id AND s.id = NEW.sale_id;
  
  -- Create warranty if product has warranty coverage
  IF product_warranty_months > 0 THEN
    INSERT INTO warranties (
      sale_id, sale_item_id, product_id, customer_id,
      serial_number, warranty_period_months, warranty_end_date, registered_by
    ) VALUES (
      NEW.sale_id, NEW.id, NEW.product_id, sale_customer_id,
      'AUTO-' || NEW.id::text, product_warranty_months,
      CURRENT_DATE + (product_warranty_months || ' months')::interval,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to handle PO receiving and inventory updates
CREATE OR REPLACE FUNCTION handle_po_receive()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  po_item RECORD;
BEGIN
  -- Only process when status changes to received
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Update inventory for each PO item
    FOR po_item IN 
      SELECT poi.product_id, poi.received_quantity, poi.unit_cost
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = NEW.id
    LOOP
      -- Update product stock and weighted average cost
      UPDATE products 
      SET 
        on_hand_qty = on_hand_qty + po_item.received_quantity,
        updated_at = now()
      WHERE id = po_item.product_id;
      
      -- Create stock movement
      INSERT INTO stock_movements (
        product_id, quantity, movement_type, reason, reference_table, reference_id, 
        unit_cost, total_cost, created_by
      ) VALUES (
        po_item.product_id, po_item.received_quantity, 'in', 'purchase_order', 
        'purchase_orders', NEW.id, po_item.unit_cost, 
        po_item.received_quantity * po_item.unit_cost, auth.uid()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 9. Create triggers for automated workflows
DROP TRIGGER IF EXISTS trigger_sale_inventory_reduction ON sale_items;
CREATE TRIGGER trigger_sale_inventory_reduction
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION handle_sale_inventory_reduction();

DROP TRIGGER IF EXISTS trigger_installation_from_sale ON sales;
CREATE TRIGGER trigger_installation_from_sale
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION create_installation_from_sale();

DROP TRIGGER IF EXISTS trigger_warranty_from_sale_item ON sale_items;
CREATE TRIGGER trigger_warranty_from_sale_item
  AFTER INSERT ON sale_items
  FOR EACH ROW EXECUTE FUNCTION create_warranty_from_sale_item();

DROP TRIGGER IF EXISTS trigger_po_receive ON purchase_orders;
CREATE TRIGGER trigger_po_receive
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION handle_po_receive();

-- 10. Create comprehensive RLS policies

-- Stock movements policies
CREATE POLICY stock_movements_admin_all ON stock_movements
  FOR ALL USING (is_admin() OR is_warehouse());

CREATE POLICY stock_movements_staff_read ON stock_movements
  FOR SELECT USING (is_admin() OR is_warehouse() OR is_sales_rep());

-- Installations policies  
CREATE POLICY installations_admin_all ON installations
  FOR ALL USING (is_admin() OR is_installer() OR is_warehouse());

CREATE POLICY installations_staff_read ON installations
  FOR SELECT USING (is_admin() OR is_installer() OR is_warehouse() OR is_sales_rep());

-- Warranties policies
CREATE POLICY warranties_admin_all ON warranties
  FOR ALL USING (is_admin() OR is_warehouse());

CREATE POLICY warranties_staff_read ON warranties
  FOR SELECT USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY warranties_customer_read ON warranties
  FOR SELECT USING (customer_id = auth.uid());

-- Site settings policies
CREATE POLICY site_settings_admin_all ON site_settings
  FOR ALL USING (is_admin());

CREATE POLICY site_settings_staff_read ON site_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_sale_inventory_reduction() TO authenticated;
GRANT EXECUTE ON FUNCTION create_installation_from_sale() TO authenticated;
GRANT EXECUTE ON FUNCTION create_warranty_from_sale_item() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_po_receive() TO authenticated;