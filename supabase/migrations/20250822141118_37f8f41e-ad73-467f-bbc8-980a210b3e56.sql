-- Phase 1: Add missing container cost field and fix any missing constraints
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- Ensure container products have proper total cost calculation trigger
CREATE OR REPLACE FUNCTION public.update_container_cost_on_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Update container total cost when products are added/updated/removed
  UPDATE public.containers 
  SET total_cost = (
    SELECT COALESCE(SUM(total_cost), 0) 
    FROM public.container_products 
    WHERE container_id = COALESCE(NEW.container_id, OLD.container_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.container_id, OLD.container_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;