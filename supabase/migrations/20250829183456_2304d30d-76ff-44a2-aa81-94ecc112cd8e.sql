-- Remove duplicate foreign key constraint that's causing embedding issues
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS fk_sale_items_product_id;

-- Ensure we have the standard foreign key constraint (this should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_product_id_fkey' 
        AND table_name = 'sale_items'
    ) THEN
        ALTER TABLE public.sale_items 
        ADD CONSTRAINT sale_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;