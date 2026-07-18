-- Create a test installment sale with payment schedules for testing

-- First, get a random customer and product
DO $$
DECLARE 
    test_customer_id uuid;
    test_product_id uuid;
    test_sale_id uuid;
    sale_amount numeric := 2500.00;
    down_payment numeric := 750.00; -- 30% down payment
    remaining_balance numeric := 1750.00; -- 70% remaining
BEGIN
    -- Get a customer
    SELECT id INTO test_customer_id FROM public.customers LIMIT 1;
    
    -- Get a product that requires warranty/installation
    SELECT id INTO test_product_id FROM public.products 
    WHERE warranty_months > 0 OR requires_installation = true 
    LIMIT 1;
    
    -- Create the installment sale
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
        test_customer_id,
        sale_amount,
        sale_amount,
        0,
        true,
        'partial_paid',
        down_payment,
        remaining_balance,
        'INV-INSTALL-' || extract(epoch from now())::text,
        true,
        true,
        CURRENT_DATE
    ) RETURNING id INTO test_sale_id;
    
    -- Create sale item
    INSERT INTO public.sale_items (
        sale_id,
        product_id,
        quantity,
        unit_price,
        line_total
    ) VALUES (
        test_sale_id,
        test_product_id,
        1,
        sale_amount,
        sale_amount
    );
    
    -- Create payment schedules (2 installments)
    INSERT INTO public.payment_schedules (
        sale_id,
        customer_id,
        amount,
        due_date,
        installment_number,
        status
    ) VALUES 
    (
        test_sale_id,
        test_customer_id,
        remaining_balance / 2, -- First installment
        CURRENT_DATE + INTERVAL '30 days',
        1,
        'pending'
    ),
    (
        test_sale_id,
        test_customer_id,
        remaining_balance / 2, -- Second installment
        CURRENT_DATE + INTERVAL '60 days',
        2,
        'pending'
    );
    
    RAISE NOTICE 'Created installment sale with ID: %', test_sale_id;
END $$;