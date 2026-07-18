
CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products
       SET current_stock = COALESCE(current_stock, 0) - NEW.quantity,
           updated_at = now()
     WHERE id = NEW.product_id;

    INSERT INTO public.stock_movements (
      product_id, movement_type, quantity, reference_type, reference_id, created_by, notes
    ) VALUES (
      NEW.product_id, 'out', -NEW.quantity, 'sale', NEW.sale_id, auth.uid(),
      'Auto stock decrement on sale'
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_stock_on_sale_item ON public.sale_items;
CREATE TRIGGER update_stock_on_sale_item
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_sale_item();
