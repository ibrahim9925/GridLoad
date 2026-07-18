-- Create product_serial_numbers table for inventory tracking
CREATE TABLE public.product_serial_numbers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'defective')),
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    received_date DATE DEFAULT CURRENT_DATE,
    sold_date DATE,
    warranty_id UUID REFERENCES public.warranties(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(serial_number)
);

-- Enable RLS
ALTER TABLE public.product_serial_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies for product serial numbers
CREATE POLICY "Staff can view product serial numbers" 
ON public.product_serial_numbers 
FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY "Warehouse and admin can manage serial numbers" 
ON public.product_serial_numbers 
FOR ALL 
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

-- Create indexes for better performance
CREATE INDEX idx_product_serial_numbers_product_id ON public.product_serial_numbers(product_id);
CREATE INDEX idx_product_serial_numbers_status ON public.product_serial_numbers(status);
CREATE INDEX idx_product_serial_numbers_serial_number ON public.product_serial_numbers(serial_number);

-- Update warranties table to use actual serial numbers
ALTER TABLE public.warranties 
ADD COLUMN IF NOT EXISTS product_serial_number_id UUID REFERENCES public.product_serial_numbers(id) ON DELETE SET NULL;

-- Create trigger to update updated_at column
CREATE TRIGGER update_product_serial_numbers_updated_at
    BEFORE UPDATE ON public.product_serial_numbers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();