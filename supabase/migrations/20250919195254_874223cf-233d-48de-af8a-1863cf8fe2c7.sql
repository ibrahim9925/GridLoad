-- Add sample capital injections and bank accounts
INSERT INTO capital_injections (amount, injection_date, description, currency) VALUES
(1000000, '2024-01-15', 'Initial capital injection', 'NIS'),
(500000, '2024-06-01', 'Additional funding for expansion', 'NIS'),
(250000, '2024-09-15', 'Working capital boost', 'NIS')
ON CONFLICT DO NOTHING;

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

-- Add sample supplier performance data where suppliers exist
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
WHERE is_active = true AND EXISTS (SELECT 1 FROM suppliers LIMIT 1);

-- Update products with better stock levels and reorder points where products exist
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
WHERE is_active = true AND EXISTS (SELECT 1 FROM products LIMIT 1);