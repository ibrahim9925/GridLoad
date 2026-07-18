-- Fix the comprehensive_sales_automation function to resolve column ambiguity

CREATE OR REPLACE FUNCTION public.comprehensive_sales_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_item RECORD;
  requires_install boolean := false;
  requires_warranty_flag boolean := false;
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
      requires_warranty_flag := true;
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
  
  -- Update sale flags using qualified column names
  UPDATE public.sales 
  SET 
    requires_installation = requires_install,
    requires_warranty = requires_warranty_flag
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$function$;