-- PHASE 1: COMPREHENSIVE DATABASE & SECURITY FIXES
-- Add missing columns for enhanced functionality
ALTER TABLE products ADD COLUMN IF NOT EXISTS requires_installation boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT 12;
ALTER TABLE products ADD COLUMN IF NOT EXISTS on_hand_qty integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_qty integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_qty integer GENERATED ALWAYS AS (current_stock - COALESCE(reserved_qty, 0)) STORED;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS requires_warranty boolean DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS requires_installation boolean DEFAULT false;

-- Enhanced security for existing functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'warehouse'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'accountant'
  );
$$;

-- Enhanced comprehensive sales automation trigger
CREATE OR REPLACE FUNCTION public.comprehensive_sales_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sale_item RECORD;
  requires_install boolean := false;
  requires_warranty boolean := false;
BEGIN
  -- Process each sale item for automation
  FOR sale_item IN 
    SELECT si.*, p.requires_installation, p.warranty_months, p.name as product_name
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = NEW.id
  LOOP
    -- Update product stock and create stock movement
    UPDATE public.products 
    SET current_stock = current_stock - sale_item.quantity,
        reserved_qty = COALESCE(reserved_qty, 0) - sale_item.quantity
    WHERE id = sale_item.product_id;
    
    INSERT INTO public.stock_movements (
      product_id, movement_type, quantity, reference_type, reference_id, 
      created_by, notes, unit_cost, total_cost
    ) VALUES (
      sale_item.product_id, 'out', sale_item.quantity, 'sale', NEW.id,
      auth.uid(), 'Stock deduction from sale #' || COALESCE(NEW.invoice_number, NEW.id::text),
      sale_item.unit_price, sale_item.line_total
    );
    
    -- Check if installation required
    IF sale_item.requires_installation THEN
      requires_install := true;
    END IF;
    
    -- Check if warranty required
    IF sale_item.warranty_months > 0 THEN
      requires_warranty := true;
    END IF;
    
    -- Auto-create warranty for each item with warranty
    IF sale_item.warranty_months > 0 THEN
      INSERT INTO public.warranties (
        sale_id, product_id, customer_id, warranty_period_months,
        warranty_start_date, warranty_end_date, warranty_type, 
        serial_number, registered_by, notes
      ) VALUES (
        NEW.id, sale_item.product_id, NEW.customer_id, sale_item.warranty_months,
        NEW.sale_date, NEW.sale_date + (sale_item.warranty_months || ' months')::interval,
        'standard', 'AUTO-' || NEW.id::text || '-' || sale_item.product_id::text,
        auth.uid(), 'Auto-generated warranty for sale #' || COALESCE(NEW.invoice_number, NEW.id::text)
      );
    END IF;
  END LOOP;
  
  -- Auto-create installation if any item requires it
  IF requires_install THEN
    INSERT INTO public.installations (
      sale_id, customer_id, status, site_address, installation_notes
    ) VALUES (
      NEW.id, NEW.customer_id, 'scheduled', 
      COALESCE(NEW.shipping_address, 'Address from customer profile'),
      'Auto-created installation for sale #' || COALESCE(NEW.invoice_number, NEW.id::text)
    );
  END IF;
  
  -- Update sale flags
  UPDATE public.sales 
  SET 
    requires_installation = requires_install,
    requires_warranty = requires_warranty
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comprehensive sales automation
DROP TRIGGER IF EXISTS comprehensive_sales_automation_trigger ON public.sales;
CREATE TRIGGER comprehensive_sales_automation_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.comprehensive_sales_automation();

-- Enhanced Purchase Order completion automation
CREATE OR REPLACE FUNCTION public.enhanced_po_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  po_item RECORD;
  valuation_cost numeric;
BEGIN
  IF NEW.status IN ('completed', 'received') AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'received')) THEN
    FOR po_item IN 
      SELECT poi.*, p.name as product_name
      FROM public.purchase_order_items poi
      JOIN public.products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = NEW.id
    LOOP
      -- Calculate weighted average cost
      SELECT 
        CASE 
          WHEN p.current_stock = 0 THEN po_item.unit_cost
          ELSE ((p.current_stock * COALESCE(iv.unit_cost, po_item.unit_cost)) + (po_item.received_quantity * po_item.unit_cost)) / (p.current_stock + po_item.received_quantity)
        END INTO valuation_cost
      FROM public.products p
      LEFT JOIN public.inventory_valuations iv ON iv.product_id = p.id AND iv.valuation_date = CURRENT_DATE
      WHERE p.id = po_item.product_id;
      
      -- Update product stock
      UPDATE public.products 
      SET 
        current_stock = current_stock + po_item.received_quantity,
        on_hand_qty = on_hand_qty + po_item.received_quantity,
        last_restock_date = COALESCE(NEW.actual_delivery_date, CURRENT_DATE),
        updated_at = now()
      WHERE id = po_item.product_id;
      
      -- Create stock movement
      INSERT INTO public.stock_movements (
        product_id, movement_type, quantity, unit_cost, total_cost,
        reference_type, reference_id, created_by, notes
      ) VALUES (
        po_item.product_id, 'in', po_item.received_quantity,
        po_item.unit_cost, po_item.received_quantity * po_item.unit_cost,
        'purchase_order', NEW.id, auth.uid(),
        'Inventory received from PO #' || NEW.order_number
      );
      
      -- Create inventory valuation
      INSERT INTO public.inventory_valuations (
        product_id, quantity, unit_cost, total_value, valuation_method
      ) VALUES (
        po_item.product_id, po_item.received_quantity, 
        valuation_cost, po_item.received_quantity * valuation_cost, 'weighted_average'
      )
      ON CONFLICT (product_id, valuation_date) 
      DO UPDATE SET
        quantity = inventory_valuations.quantity + EXCLUDED.quantity,
        total_value = inventory_valuations.total_value + EXCLUDED.total_value,
        unit_cost = (inventory_valuations.total_value + EXCLUDED.total_value) / (inventory_valuations.quantity + EXCLUDED.quantity);
    END LOOP;
    
    -- Generate stock alerts after inventory update
    PERFORM generate_stock_alerts();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger for enhanced PO completion
DROP TRIGGER IF EXISTS update_inventory_on_po_completion ON public.purchase_orders;
CREATE TRIGGER update_inventory_on_po_completion
  AFTER UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_po_completion();

-- ABC Analysis calculation function
CREATE OR REPLACE FUNCTION public.calculate_abc_analysis()
RETURNS TABLE(
  product_id uuid,
  product_name text,
  annual_consumption_value numeric,
  abc_category text,
  percentage_of_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_value numeric;
  cumulative_percentage numeric := 0;
  current_percentage numeric;
BEGIN
  -- Calculate total annual consumption value
  SELECT SUM(annual_value) INTO total_value
  FROM (
    SELECT 
      p.id,
      COALESCE(SUM(si.quantity * si.unit_price), 0) as annual_value
    FROM public.products p
    LEFT JOIN public.sale_items si ON si.product_id = p.id
    LEFT JOIN public.sales s ON s.id = si.sale_id
    WHERE s.sale_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY p.id
  ) consumption;
  
  -- Return ABC analysis results
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
      *,
      (annual_consumption_value / NULLIF(total_value, 0) * 100) as percentage_of_total,
      SUM(annual_consumption_value / NULLIF(total_value, 0) * 100) OVER (ORDER BY annual_consumption_value DESC) as cumulative_percentage
    FROM consumption_data
  )
  SELECT 
    product_id,
    product_name,
    annual_consumption_value,
    CASE 
      WHEN cumulative_percentage <= 80 THEN 'A'
      WHEN cumulative_percentage <= 95 THEN 'B'
      ELSE 'C'
    END as abc_category,
    percentage_of_total
  FROM with_percentages;
END;
$$;