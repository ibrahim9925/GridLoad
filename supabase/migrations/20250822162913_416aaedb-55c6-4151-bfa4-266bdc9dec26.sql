-- Create a test installment sale with payment schedules
INSERT INTO public.sales (
    customer_id,
    total_amount,
    subtotal,
    tax_amount,
    is_installment,
    payment_status,
    total_paid,
    balance_due,
    invoice_number,
    requires_warranty,
    requires_installation,
    sale_date
) VALUES (
    '25bfce90-589b-4c0b-aa59-9d3d9ac8d7ef', -- From previous query
    2500.00,
    2500.00,
    0,
    true,
    'partial_paid',
    750.00, -- 30% down payment
    1750.00, -- 70% remaining
    'INV-INSTALL-TEST-001',
    true,
    true,
    CURRENT_DATE
);

-- Get the sale ID we just created
-- Create sale item for the installment sale
INSERT INTO public.sale_items (
    sale_id,
    product_id,
    quantity,
    unit_price,
    line_total
) VALUES (
    (SELECT id FROM public.sales WHERE invoice_number = 'INV-INSTALL-TEST-001'),
    '213cee67-a957-4573-bdd0-481ae80bc418', -- Product ID from previous query
    1,
    2500.00,
    2500.00
);

-- Create payment schedules for the installment sale
INSERT INTO public.payment_schedules (
    sale_id,
    customer_id,
    amount,
    due_date,
    installment_number,
    status
) VALUES 
(
    (SELECT id FROM public.sales WHERE invoice_number = 'INV-INSTALL-TEST-001'),
    '25bfce90-589b-4c0b-aa59-9d3d9ac8d7ef',
    875.00, -- First installment
    CURRENT_DATE + INTERVAL '30 days',
    1,
    'pending'
),
(
    (SELECT id FROM public.sales WHERE invoice_number = 'INV-INSTALL-TEST-001'),
    '25bfce90-589b-4c0b-aa59-9d3d9ac8d7ef',
    875.00, -- Second installment  
    CURRENT_DATE + INTERVAL '60 days',
    2,
    'pending'
);