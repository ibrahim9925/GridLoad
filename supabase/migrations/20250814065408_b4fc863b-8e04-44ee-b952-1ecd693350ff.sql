-- Fix security warnings by updating the function with proper search path
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Update the product stock
  UPDATE public.products 
  SET current_stock = current_stock - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Create stock movement record
  INSERT INTO public.stock_movements (
    product_id, 
    movement_type, 
    quantity, 
    reference_type, 
    reference_id
  ) VALUES (
    NEW.product_id,
    'out',
    NEW.quantity,
    'sale',
    NEW.sale_id
  );
  
  RETURN NEW;
END;
$$;

-- Fix other function security issue  
CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update product stock
    UPDATE public.products 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
    
    -- Create stock movement record
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by)
    VALUES (NEW.product_id, 'out', NEW.quantity, 'sale', NEW.sale_id, auth.uid());
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;