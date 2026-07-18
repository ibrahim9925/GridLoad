-- Create sample payment schedules for existing installment sales
-- Check if payment_schedules table exists and create payment schedules for installment sales

-- First, let's create payment schedules for any existing installment sales that don't have them
WITH installment_sales AS (
    SELECT 
        s.id as sale_id,
        s.customer_id,
        s.total_amount,
        s.total_paid,
        s.balance_due,
        s.sale_date
    FROM public.sales s
    WHERE s.is_installment = true
      AND NOT EXISTS (SELECT 1 FROM public.payment_schedules ps WHERE ps.sale_id = s.id)
)
INSERT INTO public.payment_schedules (
    sale_id,
    customer_id,
    amount,
    due_date,
    installment_number,
    status,
    created_at
)
SELECT 
    is.sale_id,
    is.customer_id,
    is.balance_due / 2, -- Split remaining balance into 2 installments
    is.sale_date + INTERVAL '30 days', -- First installment due in 30 days
    1,
    'pending',
    now()
FROM installment_sales is
UNION ALL
SELECT 
    is.sale_id,
    is.customer_id,
    is.balance_due / 2, -- Second half
    is.sale_date + INTERVAL '60 days', -- Second installment due in 60 days
    2,
    'pending',
    now()
FROM installment_sales is;