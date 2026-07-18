-- Link warranties to inventory serial rows (idempotent if 20250829195023 already ran)
ALTER TABLE public.warranties
  ADD COLUMN IF NOT EXISTS product_serial_number_id UUID
  REFERENCES public.product_serial_numbers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_warranties_product_serial_number_id
  ON public.warranties(product_serial_number_id);

UPDATE public.warranties w
SET product_serial_number_id = psn.id
FROM public.product_serial_numbers psn
WHERE w.product_serial_number_id IS NULL
  AND psn.serial_number = w.serial_number
  AND w.sale_id IS NOT NULL
  AND psn.sale_id IS NOT NULL
  AND psn.sale_id = w.sale_id;

-- Fault log: link to sold device even when no warranty row exists
ALTER TABLE public.warranty_fault_log
  ADD COLUMN IF NOT EXISTS product_serial_number_id UUID
  REFERENCES public.product_serial_numbers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fault_date date DEFAULT CURRENT_DATE;

ALTER TABLE public.warranty_fault_log
  ALTER COLUMN warranty_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warranty_fault_log_serial
  ON public.warranty_fault_log(product_serial_number_id);
