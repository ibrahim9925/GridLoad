-- FULFILLMENT SYSTEM AUTOMATION - Create triggers and functions for end-to-end workflow

-- Function to create order fulfillment record when sale is created
CREATE OR REPLACE FUNCTION public.create_order_fulfillment_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create order fulfillment record for new sales
  INSERT INTO public.order_fulfillment (
    sale_id,
    fulfillment_status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'pending',
    now(),
    now()
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic order fulfillment creation
DROP TRIGGER IF EXISTS trigger_create_order_fulfillment ON public.sales;
CREATE TRIGGER trigger_create_order_fulfillment
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_fulfillment_on_sale();

-- Function to auto-create delivery schedule for orders requiring delivery
CREATE OR REPLACE FUNCTION public.auto_create_delivery_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create delivery schedule for orders that require delivery (not pickup)
  IF NEW.delivery_preference != 'pickup' AND NEW.fulfillment_status = 'packed' THEN
    INSERT INTO public.delivery_schedules (
      sale_id,
      customer_id,
      scheduled_date,
      time_slot,
      delivery_type,
      status,
      created_at
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      COALESCE(NEW.estimated_delivery_date, CURRENT_DATE + INTERVAL '1 day'),
      '09:00-12:00', -- Default time slot
      COALESCE(NEW.delivery_preference, 'standard'),
      'scheduled',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for automatic delivery schedule creation
DROP TRIGGER IF EXISTS trigger_auto_create_delivery ON public.sales;
CREATE TRIGGER trigger_auto_create_delivery
  AFTER UPDATE ON public.sales
  FOR EACH ROW
  WHEN (NEW.fulfillment_status = 'packed' AND OLD.fulfillment_status != 'packed')
  EXECUTE FUNCTION public.auto_create_delivery_schedule();

-- Function to sync order fulfillment status changes to sales
CREATE OR REPLACE FUNCTION public.sync_fulfillment_status_to_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update sales table fulfillment status when order_fulfillment changes
  UPDATE public.sales 
  SET 
    fulfillment_status = NEW.fulfillment_status,
    updated_at = now()
  WHERE id = NEW.sale_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for syncing fulfillment status
DROP TRIGGER IF EXISTS trigger_sync_fulfillment_status ON public.order_fulfillment;
CREATE TRIGGER trigger_sync_fulfillment_status
  AFTER UPDATE ON public.order_fulfillment
  FOR EACH ROW
  WHEN (NEW.fulfillment_status != OLD.fulfillment_status)
  EXECUTE FUNCTION public.sync_fulfillment_status_to_sales();

-- Function to generate stock alerts when inventory levels are low
CREATE OR REPLACE FUNCTION public.trigger_stock_alerts_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_item RECORD;
BEGIN
  -- Check stock levels for all items in the sale and generate alerts if needed
  FOR sale_item IN 
    SELECT si.product_id, si.quantity, p.current_stock, p.reorder_point, p.name
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = NEW.id
  LOOP
    -- Check if stock will be below reorder point after this sale
    IF (sale_item.current_stock - sale_item.quantity) <= COALESCE(sale_item.reorder_point, 20) THEN
      -- Generate stock alert
      INSERT INTO public.stock_alerts (
        product_id,
        alert_type,
        threshold_quantity,
        current_quantity,
        severity,
        auto_reorder_suggested,
        suggested_order_quantity
      ) VALUES (
        sale_item.product_id,
        'reorder_point',
        COALESCE(sale_item.reorder_point, 20),
        (sale_item.current_stock - sale_item.quantity),
        CASE 
          WHEN (sale_item.current_stock - sale_item.quantity) <= 0 THEN 'critical'
          WHEN (sale_item.current_stock - sale_item.quantity) <= 5 THEN 'high'
          ELSE 'medium'
        END,
        true,
        50
      )
      ON CONFLICT (product_id, alert_type) 
      DO UPDATE SET
        current_quantity = EXCLUDED.current_quantity,
        severity = EXCLUDED.severity,
        is_acknowledged = false,
        created_at = now();
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for stock alerts on sales
DROP TRIGGER IF EXISTS trigger_stock_alerts_on_sale ON public.sales;
CREATE TRIGGER trigger_stock_alerts_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_stock_alerts_on_sale();

-- Function to update delivery status and sync to sales
CREATE OR REPLACE FUNCTION public.update_sales_on_delivery_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update sales table when delivery is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.sales 
    SET 
      fulfillment_status = 'delivered',
      actual_delivery_date = NEW.completed_at::date,
      updated_at = now()
    WHERE id = NEW.sale_id;
    
    -- Update order fulfillment status
    UPDATE public.order_fulfillment
    SET 
      fulfillment_status = 'delivered',
      delivered_at = NEW.completed_at,
      updated_at = now()
    WHERE sale_id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for delivery completion sync
DROP TRIGGER IF EXISTS trigger_delivery_completion_sync ON public.delivery_schedules;
CREATE TRIGGER trigger_delivery_completion_sync
  AFTER UPDATE ON public.delivery_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sales_on_delivery_completion();

-- Create indexes for better performance on fulfillment queries
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_status ON public.order_fulfillment(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_sale_id ON public.order_fulfillment(sale_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_status ON public.delivery_schedules(status);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_scheduled_date ON public.delivery_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_picking_lists_status ON public.picking_lists(status);
CREATE INDEX IF NOT EXISTS idx_picking_lists_assigned_to ON public.picking_lists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_acknowledged ON public.stock_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_sales_fulfillment_status ON public.sales(fulfillment_status);