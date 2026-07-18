-- Add sample capital injections and bank accounts
INSERT INTO capital_injections (amount, injection_date, description, currency) VALUES
(1000000, '2024-01-15', 'Initial capital injection', 'NIS'),
(500000, '2024-06-01', 'Additional funding for expansion', 'NIS'),
(250000, '2024-09-15', 'Working capital boost', 'NIS');

-- Update bank accounts with realistic balances
UPDATE bank_accounts SET 
  current_balance = CASE 
    WHEN currency = 'NIS' THEN 850000
    WHEN currency = 'USD' THEN 45000
    ELSE current_balance
  END,
  opening_balance = CASE 
    WHEN currency = 'NIS' THEN 1000000
    WHEN currency = 'USD' THEN 50000
    ELSE opening_balance
  END
WHERE is_active = true;

-- Add sample company settings for enhanced intelligence
INSERT INTO company_settings (setting_key, setting_value, description) VALUES
('liquidity_buffer_percentage', '30', 'Minimum liquidity buffer percentage')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

INSERT INTO company_settings (setting_key, setting_value, description) VALUES
('seasonal_coverage_targets', '{"winter": 2.0, "spring": 2.5, "summer": 3.0, "autumn": 2.5}', 'Target stock coverage by season')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Add sample supplier performance data
UPDATE suppliers SET 
  on_time_delivery_rate = CASE 
    WHEN name ILIKE '%china%' THEN 75.5
    WHEN name ILIKE '%local%' THEN 92.3
    WHEN name ILIKE '%europe%' THEN 88.7
    ELSE 80.0 + (RANDOM() * 15)
  END,
  delivery_rating = CASE 
    WHEN name ILIKE '%premium%' THEN 4.8
    WHEN name ILIKE '%budget%' THEN 3.2
    ELSE 3.5 + (RANDOM() * 1.5)
  END,
  reliability_score = CASE 
    WHEN name ILIKE '%reliable%' THEN 95.0
    WHEN name ILIKE '%new%' THEN 65.0
    ELSE 70.0 + (RANDOM() * 25)
  END
WHERE is_active = true;

-- Add sample containers with realistic statuses and costs
UPDATE containers SET 
  total_cost = CASE 
    WHEN status = 'in_transit' THEN 250000 + (RANDOM() * 200000)
    WHEN status = 'ordered' THEN 180000 + (RANDOM() * 150000)
    WHEN status = 'completed' THEN 220000 + (RANDOM() * 180000)
    ELSE total_cost
  END,
  expected_arrival_date = CASE 
    WHEN status = 'in_transit' THEN CURRENT_DATE + INTERVAL '15 days'
    WHEN status = 'ordered' THEN CURRENT_DATE + INTERVAL '45 days'
    ELSE expected_arrival_date
  END
WHERE id IS NOT NULL;

-- Add sample purchase orders with realistic amounts
UPDATE purchase_orders SET 
  total_amount = CASE 
    WHEN status NOT IN ('completed', 'received') THEN 80000 + (RANDOM() * 120000)
    ELSE total_amount
  END,
  expected_delivery_date = CASE 
    WHEN status = 'ordered' THEN CURRENT_DATE + INTERVAL '20 days'
    WHEN status = 'pending' THEN CURRENT_DATE + INTERVAL '30 days'
    ELSE expected_delivery_date
  END
WHERE id IS NOT NULL;

-- Update products with better stock levels and reorder points
UPDATE products SET 
  current_stock = CASE 
    WHEN name ILIKE '%solar%' AND EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN 4 AND 9 THEN 
      GREATEST(0, FLOOR(RANDOM() * 50)) -- Low stock in solar season
    WHEN name ILIKE '%battery%' THEN FLOOR(RANDOM() * 30) + 10
    WHEN name ILIKE '%inverter%' THEN FLOOR(RANDOM() * 25) + 5
    ELSE FLOOR(RANDOM() * 100) + 20
  END,
  reorder_point = CASE 
    WHEN name ILIKE '%critical%' THEN 50
    WHEN name ILIKE '%solar%' THEN 30
    ELSE 20
  END,
  reorder_quantity = CASE 
    WHEN name ILIKE '%bulk%' THEN 200
    WHEN name ILIKE '%specialty%' THEN 50
    ELSE 100
  END
WHERE is_active = true;

-- Add some recent sales data for velocity calculations
INSERT INTO sales (customer_id, sales_rep_id, sale_date, subtotal, total_amount, payment_status, fulfillment_status) 
SELECT 
  (SELECT id FROM customers ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM staff WHERE role = 'sales_rep' ORDER BY RANDOM() LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day' * FLOOR(RANDOM() * 90),
  1000 + (RANDOM() * 5000),
  1200 + (RANDOM() * 6000),
  CASE WHEN RANDOM() > 0.7 THEN 'paid' ELSE 'pending' END,
  CASE WHEN RANDOM() > 0.6 THEN 'delivered' ELSE 'pending' END
FROM generate_series(1, 50);

-- Add corresponding sale items for velocity calculation
WITH recent_sales AS (
  SELECT id, sale_date FROM sales WHERE sale_date >= CURRENT_DATE - INTERVAL '90 days'
),
random_products AS (
  SELECT id, name FROM products WHERE is_active = true
)
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
SELECT 
  rs.id,
  rp.id,
  CASE 
    WHEN rp.name ILIKE '%solar%' AND EXTRACT(MONTH FROM rs.sale_date) BETWEEN 4 AND 9 THEN 
      FLOOR(RANDOM() * 8) + 2 -- Higher sales in solar season
    ELSE FLOOR(RANDOM() * 4) + 1
  END as quantity,
  500 + (RANDOM() * 1000) as unit_price,
  (FLOOR(RANDOM() * 4) + 1) * (500 + (RANDOM() * 1000)) as line_total
FROM recent_sales rs
CROSS JOIN random_products rp
WHERE RANDOM() > 0.7 -- Only some products sold in each sale
ORDER BY RANDOM()
LIMIT 200;