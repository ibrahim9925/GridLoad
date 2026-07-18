
-- 1) Default currency to NIS for new sales
ALTER TABLE public.sales ALTER COLUMN currency SET DEFAULT 'NIS';

-- 2) Auto-populate sale_number on insert
CREATE OR REPLACE FUNCTION public.tr_sales_set_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := public.generate_sale_number();
  END IF;
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := NEW.sale_number;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_set_number ON public.sales;
CREATE TRIGGER sales_set_number
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.tr_sales_set_number();

-- 3) Backfill existing sales: assign sequential sale numbers and convert mistaken USD to NIS
WITH numbered AS (
  SELECT id,
         'SALE-' || TO_CHAR(COALESCE(sale_date, created_at, now()), 'YYYY') || '-' ||
         LPAD(ROW_NUMBER() OVER (
           PARTITION BY TO_CHAR(COALESCE(sale_date, created_at, now()), 'YYYY')
           ORDER BY COALESCE(sale_date, created_at)
         )::text, 3, '0') AS new_no
  FROM public.sales
  WHERE sale_number IS NULL OR sale_number = ''
)
UPDATE public.sales s
   SET sale_number = n.new_no,
       invoice_number = COALESCE(NULLIF(s.invoice_number,''), n.new_no)
  FROM numbered n
 WHERE s.id = n.id;

UPDATE public.sales SET currency = 'NIS' WHERE currency = 'USD';
