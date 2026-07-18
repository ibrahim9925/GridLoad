-- Add sample data for tests to work properly

-- Add sample staff members (sales reps, admins, etc.)
INSERT INTO public.staff (id, email, full_name, role, is_active, commission_rate)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@gridload.com', 'Test Admin', 'admin', true, 0),
  ('22222222-2222-2222-2222-222222222222', 'sales@gridload.com', 'Test Sales Rep', 'sales_rep', true, 5.0),
  ('33333333-3333-3333-3333-333333333333', 'warehouse@gridload.com', 'Test Warehouse Manager', 'warehouse', true, 0),
  ('44444444-4444-4444-4444-444444444444', 'accountant@gridload.com', 'Test Accountant', 'accountant', true, 0)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  commission_rate = EXCLUDED.commission_rate;

-- Add sample customers for testing
INSERT INTO public.customers (id, contact_person, company_name, email, phone, address, is_active)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'John Doe', 'Test Customer Co.', 'john@testcustomer.com', '+1234567890', '123 Test Street', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Jane Smith', 'Sample Business Ltd.', 'jane@samplebiz.com', '+0987654321', '456 Sample Ave', true)
ON CONFLICT (id) DO UPDATE SET
  contact_person = EXCLUDED.contact_person,
  company_name = EXCLUDED.company_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Add sample suppliers
INSERT INTO public.suppliers (id, name, contact_person, email, phone, address, is_active)
VALUES 
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Supplier Inc.', 'Bob Johnson', 'bob@testsupplier.com', '+1122334455', '789 Supplier St', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  contact_person = EXCLUDED.contact_person,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  is_active = EXCLUDED.is_active;

-- Add sample products with stock
INSERT INTO public.products (id, name, category, cost_price, selling_price, current_stock, reorder_point, is_active)
VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Test Solar Panel 300W', 'solar_panels', 150.00, 250.00, 100, 20, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Test Inverter 5kW', 'inverters', 800.00, 1200.00, 50, 10, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Test Battery 10kWh', 'batteries', 2000.00, 3000.00, 25, 5, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price,
  current_stock = EXCLUDED.current_stock,
  reorder_point = EXCLUDED.reorder_point,
  is_active = EXCLUDED.is_active;