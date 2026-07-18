-- Create a function to safely increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(product_id UUID, quantity_to_add INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products 
  SET 
    current_stock = current_stock + quantity_to_add,
    on_hand_qty = COALESCE(on_hand_qty, 0) + quantity_to_add
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';