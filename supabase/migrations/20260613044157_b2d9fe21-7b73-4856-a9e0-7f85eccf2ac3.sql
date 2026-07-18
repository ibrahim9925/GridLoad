
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_point integer NOT NULL DEFAULT 5;
UPDATE public.products SET current_stock = 0 WHERE current_stock IS NULL;
ALTER TABLE public.products ALTER COLUMN current_stock SET DEFAULT 0;
ALTER TABLE public.products ALTER COLUMN current_stock SET NOT NULL;

CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stock integer;
  v_name text;
BEGIN
  SELECT current_stock, name INTO v_stock, v_name
  FROM public.products WHERE id = NEW.product_id FOR UPDATE;

  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found for sale item';
  END IF;

  IF v_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %', v_name, v_stock, NEW.quantity;
  END IF;

  UPDATE public.products
     SET current_stock = current_stock - NEW.quantity,
         updated_at = now()
   WHERE id = NEW.product_id;

  INSERT INTO public.stock_movements (
    product_id, movement_type, quantity, reference_type, reference_id, created_by, notes,
    previous_stock, new_stock
  ) VALUES (
    NEW.product_id, 'out', -NEW.quantity, 'sale', NEW.sale_id, auth.uid(),
    'Auto stock decrement on sale', v_stock, v_stock - NEW.quantity
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_sale_item();
