-- Phase 1: Create missing payment_schedules table for installment sales
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view payment schedules" 
ON public.payment_schedules FOR SELECT 
USING (is_admin() OR is_accountant() OR is_sales_rep());

CREATE POLICY "Financial staff can manage payment schedules"
ON public.payment_schedules FOR ALL
USING (is_admin() OR is_accountant())
WITH CHECK (is_admin() OR is_accountant());

-- Phase 2: Fix product constraints - make SKU nullable and add soft delete
ALTER TABLE public.products 
ALTER COLUMN sku DROP NOT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create unique constraint only for non-null SKUs
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx 
ON public.products (sku) WHERE sku IS NOT NULL AND is_active = true;

-- Phase 3: Enhanced workflow automation trigger
CREATE OR REPLACE FUNCTION public.enhanced_sales_workflow_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_item RECORD;
  requires_install boolean := false;
  requires_warranty_flag boolean := false;
  current_user_id uuid;
BEGIN
  current_user_id := COALESCE(auth.uid(), NEW.sales_rep_id);
  
  -- Process each sale item
  FOR sale_item IN 
    SELECT si.*, p.requires_installation, p.warranty_months, p.name as product_name
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = NEW.id
  LOOP
    -- Update product stock safely
    UPDATE public.products 
    SET current_stock = GREATEST(current_stock - sale_item.quantity, 0)
    WHERE id = sale_item.product_id;
    
    -- Create stock movement
    INSERT INTO public.stock_movements (
      product_id, movement_type, quantity, reference_type, reference_id, 
      created_by, notes, unit_cost, total_cost
    ) VALUES (
      sale_item.product_id, 'out', sale_item.quantity, 'sale', NEW.id,
      current_user_id, 
      'Stock deduction from sale #' || COALESCE(NEW.invoice_number, NEW.id::text),
      sale_item.unit_price, sale_item.line_total
    );
    
    -- Check requirements
    IF sale_item.requires_installation THEN
      requires_install := true;
    END IF;
    
    IF sale_item.warranty_months > 0 THEN
      requires_warranty_flag := true;
      
      -- Auto-create warranty
      INSERT INTO public.warranties (
        sale_id, product_id, customer_id, warranty_period_months,
        warranty_start_date, warranty_end_date, warranty_type, 
        serial_number, registered_by, notes, status
      ) VALUES (
        NEW.id, sale_item.product_id, NEW.customer_id, sale_item.warranty_months,
        NEW.sale_date, NEW.sale_date + (sale_item.warranty_months || ' months')::interval,
        'standard', 'AUTO-' || NEW.id::text || '-' || sale_item.product_id::text,
        current_user_id,
        'Auto-generated warranty for sale #' || COALESCE(NEW.invoice_number, NEW.id::text),
        'active'
      );
    END IF;
  END LOOP;
  
  -- Auto-create installation if needed
  IF requires_install THEN
    INSERT INTO public.installations (
      sale_id, customer_id, status, site_address, installation_notes
    ) VALUES (
      NEW.id, NEW.customer_id, 'scheduled', 
      COALESCE(NEW.shipping_address, 'Address from customer profile'),
      'Auto-created installation for sale #' || COALESCE(NEW.invoice_number, NEW.id::text)
    );
  END IF;
  
  -- Create payment schedules for installment sales
  IF NEW.is_installment AND NEW.installment_plan_type IS NOT NULL THEN
    -- Create payment schedule based on plan type
    INSERT INTO public.payment_schedules (sale_id, installment_number, amount, due_date)
    SELECT 
      NEW.id,
      installment_data.installment_number,
      installment_data.amount,
      installment_data.due_date::date
    FROM (
      SELECT 
        1 as installment_number, 
        NEW.total_amount * 0.3 as amount,
        NEW.sale_date as due_date
      WHERE NEW.installment_plan_type = '30-70'
      UNION ALL
      SELECT 
        2 as installment_number,
        NEW.total_amount * 0.7 as amount, 
        NEW.sale_date + INTERVAL '30 days' as due_date
      WHERE NEW.installment_plan_type = '30-70'
    ) installment_data;
  END IF;
  
  -- Update sale flags
  UPDATE public.sales 
  SET 
    requires_installation = requires_install,
    requires_warranty = requires_warranty_flag
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Sales automation error: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS comprehensive_sales_automation_trigger ON public.sales;
CREATE TRIGGER enhanced_sales_workflow_trigger
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_sales_workflow_automation();

-- Phase 4: Add updated_at trigger for payment_schedules
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();