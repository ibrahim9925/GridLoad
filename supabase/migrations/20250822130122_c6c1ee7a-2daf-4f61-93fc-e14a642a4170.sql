-- Fix products table: Add missing pricing fields and improve schema
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS min_selling_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS standard_selling_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_selling_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS requires_installation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS on_hand_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_restock_date DATE;

-- Update the existing cost_price column to be nullable for better data handling
ALTER TABLE public.products ALTER COLUMN cost_price DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN cost_price SET DEFAULT 0;

-- Create containers table for bulk purchasing workflow
CREATE TABLE IF NOT EXISTS public.containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number TEXT NOT NULL UNIQUE,
  container_type TEXT NOT NULL CHECK (container_type IN ('20ft', '40ft')),
  supplier_id UUID REFERENCES public.suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_arrival_date DATE,
  actual_arrival_date DATE,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'shipped', 'arrived', 'processing', 'completed')),
  total_cost NUMERIC DEFAULT 0,
  customs_cleared BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create container_products junction table
CREATE TABLE IF NOT EXISTS public.container_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL, -- For new products not yet in catalog
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  warranty_start_serial TEXT, -- Starting serial number for warranty
  warranty_end_serial TEXT,   -- Ending serial number for warranty
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for containers
CREATE POLICY "Warehouse and admin can manage containers" 
ON public.containers FOR ALL 
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

CREATE POLICY "Staff can view containers" 
ON public.containers FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_accountant());

-- RLS policies for container_products
CREATE POLICY "Warehouse and admin can manage container products" 
ON public.container_products FOR ALL 
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

CREATE POLICY "Staff can view container products" 
ON public.container_products FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_accountant());

-- Add trigger to update container products total cost
CREATE OR REPLACE FUNCTION update_container_product_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_cost = NEW.quantity * NEW.unit_cost;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_container_product_total_trigger
  BEFORE INSERT OR UPDATE ON public.container_products
  FOR EACH ROW EXECUTE FUNCTION update_container_product_total();

-- Add trigger to update container total cost
CREATE OR REPLACE FUNCTION update_container_total()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_container_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.container_products
  FOR EACH ROW EXECUTE FUNCTION update_container_total();