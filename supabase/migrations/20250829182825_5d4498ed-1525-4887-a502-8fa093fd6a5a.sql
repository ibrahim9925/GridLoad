-- Fix duplicate foreign key constraints for sales and sale_items relationship
-- Drop the duplicate constraint that's causing the embedding issue
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS fk_sale_items_sale_id;

-- Ensure we have the standard foreign key constraint (this should already exist)
-- Only add if it doesn't exist to avoid errors
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_sale_id_fkey' 
        AND table_name = 'sale_items'
    ) THEN
        ALTER TABLE public.sale_items 
        ADD CONSTRAINT sale_items_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    END IF;
END $$;