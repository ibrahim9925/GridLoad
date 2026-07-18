-- Phase D: Add critical missing triggers for sales workflow automation

-- 1. Payment trigger to update sale payment status
CREATE OR REPLACE FUNCTION public.update_sale_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update total_paid and balance_due for the sale
  UPDATE public.sales 
  SET 
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.payments 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    balance_due = total_amount - (
      SELECT COALESCE(SUM(amount), 0) 
      FROM public.payments 
      WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    payment_status = CASE 
      WHEN (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.payments 
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
      ) >= total_amount THEN 'paid'
      WHEN (
        SELECT COALESCE(SUM(amount), 0) 
        FROM public.payments 
        WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
      ) > 0 THEN 'partial_paid'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the payment trigger
DROP TRIGGER IF EXISTS trg_payments_update_sale_status ON public.payments;
CREATE TRIGGER trg_payments_update_sale_status
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_sale_payment_status();

-- 2. Sale items stock deduction trigger
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update the product stock
    UPDATE public.products 
    SET current_stock = GREATEST(current_stock - NEW.quantity, 0)
    WHERE id = NEW.product_id;
    
    -- Create stock movement record
    INSERT INTO public.stock_movements (
      product_id, 
      movement_type, 
      quantity, 
      reference_type, 
      reference_id,
      created_by,
      notes
    ) VALUES (
      NEW.product_id,
      'out',
      NEW.quantity,
      'sale',
      NEW.sale_id,
      auth.uid(),
      'Stock deduction from sale item'
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create the sale items trigger
DROP TRIGGER IF EXISTS trg_sale_items_stock_deduction ON public.sale_items;
CREATE TRIGGER trg_sale_items_stock_deduction
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock_on_sale_item();

-- 3. Create order fulfillment when sale is created
DROP TRIGGER IF EXISTS trg_sales_create_fulfillment ON public.sales;
CREATE TRIGGER trg_sales_create_fulfillment
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.create_order_fulfillment_on_sale();