-- Fix function search path security warning
ALTER FUNCTION public.generate_quote_number() SET search_path TO 'public';

-- Fix foreign key constraint issue for product deletion
-- Allow products to be deleted by setting foreign key to SET NULL or CASCADE as appropriate
ALTER TABLE public.purchase_order_items 
DROP CONSTRAINT IF EXISTS fk_purchase_order_items_product_id;

ALTER TABLE public.purchase_order_items 
ADD CONSTRAINT fk_purchase_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- Also fix other potential foreign key issues with products
ALTER TABLE public.sale_items 
DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

ALTER TABLE public.sale_items 
ADD CONSTRAINT sale_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.product_serial_numbers 
DROP CONSTRAINT IF EXISTS product_serial_numbers_product_id_fkey;

ALTER TABLE public.product_serial_numbers 
ADD CONSTRAINT product_serial_numbers_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.stock_movements 
DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey;

ALTER TABLE public.stock_movements 
ADD CONSTRAINT stock_movements_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

ALTER TABLE public.warranties 
DROP CONSTRAINT IF EXISTS warranties_product_id_fkey;

ALTER TABLE public.warranties 
ADD CONSTRAINT warranties_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;