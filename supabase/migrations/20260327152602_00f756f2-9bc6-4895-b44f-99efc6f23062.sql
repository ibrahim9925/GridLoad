
-- Sales missing columns
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_company_name text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_company_settled boolean DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expected_payment_date timestamptz;

-- Container products missing columns
ALTER TABLE public.container_products ADD COLUMN IF NOT EXISTS product_name text;

-- Stock alerts missing columns  
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS suggested_order_quantity integer DEFAULT 0;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS last_order_date timestamptz;

-- Products missing columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS moq integer DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Containers missing columns
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS order_date timestamptz;
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS delivered_date timestamptz;

-- Staff add user_id FK to stock_movements
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id);

-- Inventory valuations missing columns
ALTER TABLE public.inventory_valuations ADD COLUMN IF NOT EXISTS average_cost numeric DEFAULT 0;
ALTER TABLE public.inventory_valuations ADD COLUMN IF NOT EXISTS replacement_cost numeric DEFAULT 0;

-- Commission payments missing columns  
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
