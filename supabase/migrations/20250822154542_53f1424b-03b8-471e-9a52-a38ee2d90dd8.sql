-- Update existing inverter products to require warranties
UPDATE products 
SET requires_installation = true,
    warranty_months = 24
WHERE name ILIKE '%inverter%' AND warranty_months > 0;

-- Insert some sample inverter products that require warranties and installations
INSERT INTO products (name, sku, category, selling_price, cost_price, current_stock, warranty_months, requires_installation, is_active) VALUES
('3000W Solar Inverter with MPPT', 'INV-3000W-MPPT', 'Inverters', 899.00, 650.00, 15, 60, true, true),
('5000W Hybrid Solar Inverter', 'INV-5000W-HYB', 'Inverters', 1299.00, 950.00, 8, 60, true, true),
('10KW Commercial Solar Inverter', 'INV-10KW-COM', 'Inverters', 2499.00, 1800.00, 5, 120, true, true)
ON CONFLICT (sku) DO UPDATE SET
  warranty_months = EXCLUDED.warranty_months,
  requires_installation = EXCLUDED.requires_installation;

-- Fix existing sales to properly trigger workflows
UPDATE sales 
SET requires_warranty = true,
    requires_installation = false
WHERE id IN (
  SELECT DISTINCT s.id 
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
  JOIN products p ON p.id = si.product_id
  WHERE p.warranty_months > 0
);

UPDATE sales 
SET requires_installation = true
WHERE id IN (
  SELECT DISTINCT s.id 
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
  JOIN products p ON p.id = si.product_id
  WHERE p.requires_installation = true
);