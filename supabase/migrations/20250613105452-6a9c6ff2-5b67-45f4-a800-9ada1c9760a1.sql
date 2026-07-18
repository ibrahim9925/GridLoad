
-- Create warranty tracking system
CREATE TABLE public.warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL UNIQUE,
  warranty_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warranty_end_date DATE NOT NULL,
  warranty_period_months INTEGER NOT NULL DEFAULT 12,
  warranty_type TEXT NOT NULL DEFAULT 'manufacturer',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed', 'void')),
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  registered_by UUID REFERENCES public.staff(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty claims table
CREATE TABLE public.warranty_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID REFERENCES public.warranties(id) ON DELETE CASCADE NOT NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('repair', 'replacement', 'refund')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  resolution TEXT,
  claim_amount NUMERIC(10,2),
  processed_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add warranty-related columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS default_warranty_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS warranty_terms TEXT;

-- Expand user roles enum to include accountant and warehouse
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse';

-- Enable RLS on new tables
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for warranties
CREATE POLICY "Staff can view all warranties" 
  ON public.warranties 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create warranties" 
  ON public.warranties 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update warranties" 
  ON public.warranties 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Create RLS policies for warranty claims
CREATE POLICY "Staff can view all warranty claims" 
  ON public.warranty_claims 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create warranty claims" 
  ON public.warranty_claims 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update warranty claims" 
  ON public.warranty_claims 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Create function to automatically update warranty end date
CREATE OR REPLACE FUNCTION public.update_warranty_end_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.warranty_end_date = NEW.warranty_start_date + INTERVAL '1 month' * NEW.warranty_period_months;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for warranty end date calculation
CREATE TRIGGER update_warranty_end_date_trigger
  BEFORE INSERT OR UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_warranty_end_date();

-- Create function to check warranty expiry
CREATE OR REPLACE FUNCTION public.check_warranty_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warranty_end_date < CURRENT_DATE AND OLD.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for warranty expiry check
CREATE TRIGGER check_warranty_expiry_trigger
  BEFORE UPDATE ON public.warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.check_warranty_expiry();
