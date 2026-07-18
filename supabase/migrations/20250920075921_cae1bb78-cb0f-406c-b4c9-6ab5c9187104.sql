-- Add sample data and cleanup (Part 2)

-- 1. Clean up duplicate bank accounts
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY name, currency ORDER BY created_at) as rn
  FROM bank_accounts
)
DELETE FROM bank_accounts WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add comprehensive sample data for testing
-- Add realistic sales data for last 90 days
DO $$
DECLARE
  customer_id uuid;
  product_id uuid;
  sales_rep_id uuid;
  sale_id uuid;
  i integer;
BEGIN
  -- Get some reference IDs
  SELECT id INTO customer_id FROM customers LIMIT 1;
  SELECT id INTO sales_rep_id FROM staff WHERE role = 'sales_rep' LIMIT 1;
  
  IF customer_id IS NOT NULL AND sales_rep_id IS NOT NULL THEN
    -- Create sales data for the last 90 days
    FOR i IN 0..89 LOOP
      -- Create a sale every few days with varying amounts
      IF (i % 3 = 0) THEN
        INSERT INTO sales (
          customer_id, sales_rep_id, sale_date, subtotal, tax_amount, total_amount,
          payment_status, fulfillment_status
        ) VALUES (
          customer_id, sales_rep_id, 
          CURRENT_DATE - (i || ' days')::interval,
          500 + (RANDOM() * 2000)::numeric,
          (500 + (RANDOM() * 2000)::numeric) * 0.17,
          (500 + (RANDOM() * 2000)::numeric) * 1.17,
          CASE 
            WHEN RANDOM() > 0.7 THEN 'paid'
            WHEN RANDOM() > 0.4 THEN 'partial_paid'
            ELSE 'pending'
          END,
          CASE 
            WHEN RANDOM() > 0.6 THEN 'delivered'
            WHEN RANDOM() > 0.3 THEN 'processing'
            ELSE 'pending'
          END
        ) RETURNING id INTO sale_id;
        
        -- Add sale items for each sale
        FOR product_id IN (SELECT id FROM products WHERE is_active = true LIMIT 3) LOOP
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
          VALUES (
            sale_id, product_id, 
            (1 + RANDOM() * 5)::integer,
            100 + (RANDOM() * 500)::numeric,
            ((1 + RANDOM() * 5)::integer) * (100 + (RANDOM() * 500)::numeric)
          );
        END LOOP;
      END IF;
    END LOOP;
  END IF;
END $$;

-- 3. Add sample containers with various statuses
DO $$
DECLARE
  supplier_id uuid;
  container_id uuid;
  product_id uuid;
BEGIN
  SELECT id INTO supplier_id FROM suppliers LIMIT 1;
  
  IF supplier_id IS NOT NULL THEN
    -- Create containers in different states
    INSERT INTO containers (
      supplier_id, container_number, container_type, status, 
      order_date, expected_arrival_date, total_cost
    ) VALUES 
    (supplier_id, 'CONT-001', '40ft', 'in_transit', CURRENT_DATE - 30, CURRENT_DATE + 5, 85000),
    (supplier_id, 'CONT-002', '20ft', 'ordered', CURRENT_DATE - 10, CURRENT_DATE + 25, 45000),
    (supplier_id, 'CONT-003', '40ft', 'port_arrival', CURRENT_DATE - 5, CURRENT_DATE - 2, 92000),
    (supplier_id, 'CONT-004', '20ft', 'customs_processing', CURRENT_DATE - 3, CURRENT_DATE - 1, 38000)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Add sample purchase orders
DO $$
DECLARE
  supplier_id uuid;
  po_id uuid;
  product_id uuid;
BEGIN
  SELECT id INTO supplier_id FROM suppliers LIMIT 1;
  
  IF supplier_id IS NOT NULL THEN
    INSERT INTO purchase_orders (
      supplier_id, order_date, expected_delivery_date, 
      subtotal, total_amount, status, created_by
    ) VALUES 
    (supplier_id, CURRENT_DATE - 20, CURRENT_DATE + 10, 25000, 29250, 'pending', auth.uid()),
    (supplier_id, CURRENT_DATE - 45, CURRENT_DATE - 10, 15000, 17550, 'completed', auth.uid()),
    (supplier_id, CURRENT_DATE - 5, CURRENT_DATE + 30, 35000, 40950, 'draft', auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;