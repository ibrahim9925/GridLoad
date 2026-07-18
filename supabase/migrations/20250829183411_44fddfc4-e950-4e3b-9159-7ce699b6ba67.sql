-- Remove duplicate foreign key constraint that's causing embedding issues
ALTER TABLE public.sale_items DROP CONSTRAINT IF EXISTS fk_sale_items_product_id;

-- Ensure we have the standard foreign key constraint (this should already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_product_id_fkey' 
        AND table_name = 'sale_items'
    ) THEN
        ALTER TABLE public.sale_items 
        ADD CONSTRAINT sale_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
END $$;

-- First, remove any existing test products to avoid duplicates
DELETE FROM public.products WHERE name LIKE 'TEST_%High_Stock';
DELETE FROM public.customers WHERE email = 'test.workflow@example.com';
DELETE FROM public.staff WHERE email IN ('test.sales@example.com', 'test.installer@example.com');

-- Add test products with high stock levels for workflow testing
INSERT INTO public.products (
    name, 
    category, 
    cost_price, 
    current_stock, 
    reorder_point, 
    reorder_quantity,
    requires_installation,
    warranty_months,
    is_active
) VALUES 
('TEST_Solar_Panel_High_Stock', 'Solar Panels', 400.00, 150, 20, 50, true, 24, true),
('TEST_Inverter_High_Stock', 'Inverters', 800.00, 100, 10, 25, true, 36, true),
('TEST_Battery_High_Stock', 'Batteries', 1200.00, 80, 15, 30, false, 12, true),
('TEST_Cable_High_Stock', 'Cables', 80.00, 200, 50, 100, false, 0, true),
('TEST_Mounting_High_Stock', 'Mounting Systems', 250.00, 120, 20, 40, true, 12, true);

-- Add test customers for workflow testing
INSERT INTO public.customers (
    contact_person,
    company_name,
    email,
    phone,
    address,
    credit_limit,
    payment_terms,
    is_active
) VALUES 
('TEST_Customer_Workflow', 'TEST_Company_Workflow', 'test.workflow@example.com', '+1234567890', '123 Test St, Test City', 50000, 'net_30', true);

-- Add test staff members for workflow testing
INSERT INTO public.staff (
    full_name,
    email,
    role,
    commission_rate,
    is_active
) VALUES 
('TEST_Sales_Rep_Workflow', 'test.sales@example.com', 'sales_rep', 5.00, true),
('TEST_Installer_Workflow', 'test.installer@example.com', 'installer', 0.00, true);