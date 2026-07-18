-- Add missing database function for stock update
CREATE OR REPLACE FUNCTION public.update_product_stock_on_sale()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update stock when sale items are created
CREATE TRIGGER update_stock_on_sale_item_creation
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock_on_sale();

-- Add foreign key constraint to ensure data integrity
DO $$
BEGIN
  -- Add foreign key for purchase orders to suppliers if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_orders 
    ADD CONSTRAINT purchase_orders_supplier_id_fkey 
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_installations_sale_id ON public.installations(sale_id);
CREATE INDEX IF NOT EXISTS idx_warranties_sale_id ON public.warranties(sale_id);