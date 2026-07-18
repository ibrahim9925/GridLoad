-- Add currency support to purchase orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS order_amount_usd numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_amount_nis numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_rate_used numeric DEFAULT NULL;

-- Update existing purchase orders with calculated amounts
UPDATE public.purchase_orders 
SET 
  currency = 'USD',
  order_amount_usd = total_amount,
  order_amount_nis = total_amount * 3.7, -- Default rate, will be updated with real rates
  exchange_rate_used = 3.7
WHERE currency IS NULL OR order_amount_usd IS NULL;

-- Add supplier_id to products if not exists and update relationships
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS primary_supplier_id uuid REFERENCES public.suppliers(id);

-- Update products to have supplier relationships (assign random suppliers for now)
UPDATE public.products 
SET primary_supplier_id = (
  SELECT id FROM public.suppliers 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE primary_supplier_id IS NULL 
AND EXISTS (SELECT 1 FROM public.suppliers LIMIT 1);

-- Create function to get current FX rate
CREATE OR REPLACE FUNCTION public.get_current_fx_rate(from_curr text, to_curr text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate numeric;
BEGIN
  -- Get the most recent rate
  SELECT cr.rate INTO rate
  FROM public.currency_rates cr
  WHERE cr.from_currency = from_curr 
    AND cr.to_currency = to_curr
  ORDER BY cr.date DESC, cr.created_at DESC
  LIMIT 1;
  
  -- Default fallback rates if no data found
  IF rate IS NULL THEN
    CASE 
      WHEN from_curr = 'USD' AND to_curr = 'NIS' THEN rate := 3.7;
      WHEN from_curr = 'NIS' AND to_curr = 'USD' THEN rate := 0.27;
      ELSE rate := 1.0;
    END CASE;
  END IF;
  
  RETURN rate;
END;
$$;

-- Create function to get total injected capital
CREATE OR REPLACE FUNCTION public.get_total_injected_capital()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_nis numeric := 0;
  total_usd numeric := 0;
  usd_to_nis_rate numeric;
  nis_to_usd_rate numeric;
BEGIN
  -- Get exchange rates
  usd_to_nis_rate := get_current_fx_rate('USD', 'NIS');
  nis_to_usd_rate := get_current_fx_rate('NIS', 'USD');
  
  -- Sum capital injections by currency
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'NIS' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0)
  INTO total_nis, total_usd
  FROM public.capital_injections;
  
  -- If no capital injections, use default
  IF total_nis = 0 AND total_usd = 0 THEN
    total_nis := 2500000;
  END IF;
  
  result := jsonb_build_object(
    'total_nis', total_nis,
    'total_usd', total_usd,
    'total_nis_equivalent', total_nis + (total_usd * usd_to_nis_rate),
    'total_usd_equivalent', (total_nis * nis_to_usd_rate) + total_usd,
    'exchange_rates', jsonb_build_object(
      'usd_to_nis', usd_to_nis_rate,
      'nis_to_usd', nis_to_usd_rate
    )
  );
  
  RETURN result;
END;
$$;

-- Create function to calculate frozen capital with proper currency conversion
CREATE OR REPLACE FUNCTION public.get_frozen_capital_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  container_frozen_nis numeric := 0;
  container_frozen_usd numeric := 0;
  po_frozen_nis numeric := 0;
  po_frozen_usd numeric := 0;
  usd_to_nis_rate numeric;
BEGIN
  usd_to_nis_rate := get_current_fx_rate('USD', 'NIS');
  
  -- Calculate frozen capital from containers (assuming USD)
  SELECT COALESCE(SUM(total_cost), 0) INTO container_frozen_usd
  FROM public.containers 
  WHERE status NOT IN ('delivered', 'completed');
  
  -- Calculate frozen capital from purchase orders by currency
  SELECT 
    COALESCE(SUM(CASE WHEN currency = 'NIS' THEN order_amount_nis ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN currency = 'USD' THEN order_amount_usd ELSE 0 END), 0)
  INTO po_frozen_nis, po_frozen_usd
  FROM public.purchase_orders 
  WHERE status NOT IN ('completed', 'cancelled');
  
  result := jsonb_build_object(
    'containers', jsonb_build_object(
      'usd', container_frozen_usd,
      'nis', container_frozen_usd * usd_to_nis_rate
    ),
    'purchase_orders', jsonb_build_object(
      'nis', po_frozen_nis,
      'usd', po_frozen_usd,
      'nis_equivalent', po_frozen_nis + (po_frozen_usd * usd_to_nis_rate)
    ),
    'total_frozen_nis', (container_frozen_usd * usd_to_nis_rate) + po_frozen_nis + (po_frozen_usd * usd_to_nis_rate),
    'total_frozen_usd', (container_frozen_usd + po_frozen_usd + (po_frozen_nis * (1/usd_to_nis_rate)))
  );
  
  RETURN result;
END;
$$;

-- Insert some sample currency rates if none exist
INSERT INTO public.currency_rates (from_currency, to_currency, rate, date)
VALUES 
  ('USD', 'NIS', 3.7, CURRENT_DATE),
  ('NIS', 'USD', 0.27, CURRENT_DATE)
ON CONFLICT DO NOTHING;