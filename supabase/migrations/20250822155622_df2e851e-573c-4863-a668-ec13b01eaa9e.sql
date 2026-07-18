-- Fix workflow automation triggers that aren't working properly

-- 1. Ensure we have a comprehensive trigger for sales that creates installations and warranties
DROP TRIGGER IF EXISTS comprehensive_sales_automation_trigger ON public.sales;

CREATE TRIGGER comprehensive_sales_automation_trigger
    AFTER INSERT ON public.sales
    FOR EACH ROW 
    EXECUTE FUNCTION public.comprehensive_sales_automation();

-- 2. Ensure we have triggers to create installations and warranties when sale items are added
DROP TRIGGER IF EXISTS trigger_stock_alerts_on_sale_creation ON public.sales;

CREATE TRIGGER trigger_stock_alerts_on_sale_creation
    AFTER INSERT ON public.sales
    FOR EACH ROW 
    EXECUTE FUNCTION public.trigger_stock_alerts_on_sale();

-- 3. Update existing sales to trigger workflows for testing
-- First, let's create missing installations for existing sales that require them
INSERT INTO public.installations (sale_id, customer_id, status, site_address, installation_notes)
SELECT 
    s.id,
    s.customer_id,
    'scheduled',
    COALESCE(s.shipping_address, 'Address from customer profile'),
    'Auto-created installation for sale #' || COALESCE(s.invoice_number, s.id::text)
FROM public.sales s
WHERE s.requires_installation = true
  AND NOT EXISTS (SELECT 1 FROM public.installations i WHERE i.sale_id = s.id);

-- 4. Create missing warranties for existing sales
-- Get product info for existing sales to create proper warranties
WITH sale_product_info AS (
    SELECT 
        s.id as sale_id,
        s.customer_id,
        si.product_id,
        p.warranty_months,
        s.sale_date,
        s.invoice_number
    FROM public.sales s
    JOIN public.sale_items si ON si.sale_id = s.id
    JOIN public.products p ON p.id = si.product_id
    WHERE s.requires_warranty = true
      AND p.warranty_months > 0
      AND NOT EXISTS (SELECT 1 FROM public.warranties w WHERE w.sale_id = s.id AND w.product_id = si.product_id)
)
INSERT INTO public.warranties (
    sale_id, product_id, customer_id, warranty_period_months,
    warranty_start_date, warranty_end_date, warranty_type, 
    serial_number, registered_by, notes
)
SELECT 
    spi.sale_id,
    spi.product_id,
    spi.customer_id,
    spi.warranty_months,
    spi.sale_date,
    spi.sale_date + (spi.warranty_months || ' months')::interval,
    'standard',
    'AUTO-' || spi.sale_id::text || '-' || spi.product_id::text,
    auth.uid(),
    'Auto-generated warranty for sale #' || COALESCE(spi.invoice_number, spi.sale_id::text)
FROM sale_product_info spi;