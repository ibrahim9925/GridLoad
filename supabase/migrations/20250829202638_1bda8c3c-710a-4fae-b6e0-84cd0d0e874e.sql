-- Fix critical RLS issues for products table
-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "products_admin_full_access" ON public.products;
DROP POLICY IF EXISTS "products_all_staff_read" ON public.products;
DROP POLICY IF EXISTS "products_staff_access" ON public.products;
DROP POLICY IF EXISTS "Staff can view products" ON public.products;
DROP POLICY IF EXISTS "Warehouse staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Sales rep can view products" ON public.products;
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;

-- Create single comprehensive policy for products
CREATE POLICY "products_comprehensive_access" ON public.products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep', 'warehouse', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'warehouse')
  )
);

-- Fix purchase orders RLS - ensure proper access
DROP POLICY IF EXISTS "Staff can view purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Warehouse staff can manage purchase orders" ON public.purchase_orders;

CREATE POLICY "purchase_orders_staff_access" ON public.purchase_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'warehouse', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'warehouse')
  )
);

-- Add missing columns for enhanced purchase order workflow
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS customs_cost numeric DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS port_charges numeric DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS transportation_cost numeric DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS container_id uuid REFERENCES public.containers(id);
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS arrival_confirmed boolean DEFAULT false;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS quantity_verified boolean DEFAULT false;

-- Create quotations table for customer price offers
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  customer_email text,
  customer_phone text,
  sales_rep_id uuid REFERENCES public.staff(id),
  quote_date date DEFAULT CURRENT_DATE,
  valid_until date,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_percentage numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  terms_conditions text,
  notes text,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quotation items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  description text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  line_total numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotations_staff_access" ON public.quotations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep')
  )
);

CREATE POLICY "quotation_items_staff_access" ON public.quotation_items  
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep')
  )
);

-- Add triggers for updated_at
CREATE OR REPLACE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate quote numbers
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text AS $$
DECLARE
  next_number integer;
  formatted_number text;
BEGIN
  -- Get next number from sequence
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'QT-(\d+)') AS integer)), 0) + 1
  INTO next_number
  FROM public.quotations
  WHERE quote_number ~ '^QT-\d+$';
  
  -- Format as QT-00001
  formatted_number := 'QT-' || LPAD(next_number::text, 5, '0');
  
  RETURN formatted_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;