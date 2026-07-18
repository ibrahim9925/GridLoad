-- Fix foreign key constraints to allow proper product deletion handling
-- Update constraints to CASCADE for reference tables or SET NULL where appropriate

-- Handle purchase_order_items - SET NULL when product is deleted (preserve PO history)
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey;

ALTER TABLE purchase_order_items 
ADD CONSTRAINT purchase_order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Handle quotation_items - SET NULL when product is deleted (preserve quotation history)  
ALTER TABLE quotation_items
DROP CONSTRAINT IF EXISTS quotation_items_product_id_fkey;

ALTER TABLE quotation_items
ADD CONSTRAINT quotation_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Handle container_products - CASCADE delete when product is deleted
ALTER TABLE container_products
DROP CONSTRAINT IF EXISTS container_products_product_id_fkey;

ALTER TABLE container_products
ADD CONSTRAINT container_products_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Handle product_suppliers - CASCADE delete when product is deleted
ALTER TABLE product_suppliers
DROP CONSTRAINT IF EXISTS product_suppliers_product_id_fkey;

ALTER TABLE product_suppliers
ADD CONSTRAINT product_suppliers_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Handle product_serial_numbers - CASCADE delete when product is deleted
ALTER TABLE product_serial_numbers
DROP CONSTRAINT IF EXISTS product_serial_numbers_product_id_fkey;

ALTER TABLE product_serial_numbers
ADD CONSTRAINT product_serial_numbers_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Handle stock_alerts - CASCADE delete when product is deleted
ALTER TABLE stock_alerts
DROP CONSTRAINT IF EXISTS stock_alerts_product_id_fkey;

ALTER TABLE stock_alerts
ADD CONSTRAINT stock_alerts_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Handle inventory_valuations - CASCADE delete when product is deleted
ALTER TABLE inventory_valuations
DROP CONSTRAINT IF EXISTS inventory_valuations_product_id_fkey;

ALTER TABLE inventory_valuations
ADD CONSTRAINT inventory_valuations_product_id_fkey
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;