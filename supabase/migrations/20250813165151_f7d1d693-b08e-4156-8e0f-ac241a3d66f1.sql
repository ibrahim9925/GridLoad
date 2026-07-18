-- Create fulfillment status enum
CREATE TYPE fulfillment_status AS ENUM (
  'pending',
  'picking',
  'packed', 
  'shipped',
  'delivered',
  'cancelled'
);

-- Create shipping carrier enum
CREATE TYPE shipping_carrier AS ENUM (
  'fedex',
  'ups', 
  'dhl',
  'usps',
  'local_delivery'
);

-- Add fulfillment fields to sales table
ALTER TABLE public.sales 
ADD COLUMN fulfillment_status fulfillment_status DEFAULT 'pending',
ADD COLUMN shipping_address text,
ADD COLUMN delivery_instructions text,
ADD COLUMN delivery_preference text,
ADD COLUMN estimated_delivery_date date,
ADD COLUMN actual_delivery_date date,
ADD COLUMN tracking_number text,
ADD COLUMN carrier shipping_carrier;

-- Create warehouse_locations table
CREATE TABLE public.warehouse_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_name text NOT NULL,
  bin_number text NOT NULL,
  shelf_location text,
  capacity integer DEFAULT 100,
  current_stock integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(zone_name, bin_number)
);

-- Create order_fulfillment table
CREATE TABLE public.order_fulfillment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'pending',
  warehouse_location_id uuid REFERENCES public.warehouse_locations(id),
  assigned_to uuid REFERENCES public.staff(id),
  picking_started_at timestamp with time zone,
  packed_at timestamp with time zone,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  tracking_number text,
  carrier shipping_carrier,
  estimated_delivery timestamp with time zone,
  actual_delivery timestamp with time zone,
  shipping_cost numeric DEFAULT 0,
  package_weight numeric,
  package_dimensions text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create picking_lists table
CREATE TABLE public.picking_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.staff(id),
  assigned_to uuid REFERENCES public.staff(id),
  status text NOT NULL DEFAULT 'pending',
  priority integer DEFAULT 3,
  picking_started_at timestamp with time zone,
  completed_at timestamp with time zone,
  items_json jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create packing_slips table
CREATE TABLE public.packing_slips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  packed_by uuid NOT NULL REFERENCES public.staff(id),
  package_weight numeric,
  package_dimensions text,
  shipping_cost numeric DEFAULT 0,
  carrier_service text,
  tracking_number text,
  shipping_label_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create shipping_rates table for carrier pricing
CREATE TABLE public.shipping_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier shipping_carrier NOT NULL,
  service_type text NOT NULL,
  weight_min numeric NOT NULL,
  weight_max numeric NOT NULL,
  zone text NOT NULL,
  base_rate numeric NOT NULL,
  per_kg_rate numeric DEFAULT 0,
  delivery_days integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create delivery_schedules table
CREATE TABLE public.delivery_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  scheduled_date date NOT NULL,
  time_slot text NOT NULL,
  delivery_type text DEFAULT 'standard',
  special_instructions text,
  status text DEFAULT 'scheduled',
  driver_id uuid REFERENCES public.staff(id),
  confirmed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for warehouse_locations
CREATE POLICY "Staff can view warehouse locations" 
ON public.warehouse_locations FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY "Warehouse staff can manage locations" 
ON public.warehouse_locations FOR ALL 
USING (is_admin() OR is_warehouse());

-- Create RLS policies for order_fulfillment
CREATE POLICY "Staff can view order fulfillment" 
ON public.order_fulfillment FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY "Warehouse staff can manage fulfillment" 
ON public.order_fulfillment FOR ALL 
USING (is_admin() OR is_warehouse());

-- Create RLS policies for picking_lists
CREATE POLICY "Staff can view picking lists" 
ON public.picking_lists FOR SELECT 
USING (is_admin() OR is_warehouse() OR (assigned_to = auth.uid()));

CREATE POLICY "Warehouse staff can manage picking lists" 
ON public.picking_lists FOR ALL 
USING (is_admin() OR is_warehouse());

-- Create RLS policies for packing_slips
CREATE POLICY "Staff can view packing slips" 
ON public.packing_slips FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY "Warehouse staff can manage packing slips" 
ON public.packing_slips FOR ALL 
USING (is_admin() OR is_warehouse());

-- Create RLS policies for shipping_rates
CREATE POLICY "Staff can view shipping rates" 
ON public.shipping_rates FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

CREATE POLICY "Admin can manage shipping rates" 
ON public.shipping_rates FOR ALL 
USING (is_admin());

-- Create RLS policies for delivery_schedules
CREATE POLICY "Staff can view delivery schedules" 
ON public.delivery_schedules FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_sales_rep() OR (driver_id = auth.uid()));

CREATE POLICY "Staff can manage delivery schedules" 
ON public.delivery_schedules FOR ALL 
USING (is_admin() OR is_warehouse() OR is_sales_rep());

-- Insert sample warehouse locations
INSERT INTO public.warehouse_locations (zone_name, bin_number, shelf_location, capacity) VALUES
('A', '001', 'A1-01', 100),
('A', '002', 'A1-02', 100),
('A', '003', 'A1-03', 100),
('B', '001', 'B1-01', 150),
('B', '002', 'B1-02', 150),
('C', '001', 'C1-01', 200),
('C', '002', 'C1-02', 200);

-- Insert sample shipping rates
INSERT INTO public.shipping_rates (carrier, service_type, weight_min, weight_max, zone, base_rate, per_kg_rate, delivery_days) VALUES
('fedex', 'standard', 0, 10, 'local', 15.00, 2.50, 2),
('fedex', 'express', 0, 10, 'local', 25.00, 3.50, 1),
('ups', 'ground', 0, 20, 'local', 12.00, 2.00, 3),
('ups', 'express', 0, 20, 'local', 22.00, 3.00, 1),
('dhl', 'standard', 0, 15, 'local', 18.00, 2.75, 2),
('local_delivery', 'same_day', 0, 50, 'local', 35.00, 1.00, 0);

-- Create trigger to update order fulfillment status when sales fulfillment_status changes
CREATE OR REPLACE FUNCTION update_order_fulfillment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create order_fulfillment record
  INSERT INTO public.order_fulfillment (sale_id, fulfillment_status)
  VALUES (NEW.id, NEW.fulfillment_status)
  ON CONFLICT (sale_id) DO UPDATE SET
    fulfillment_status = NEW.fulfillment_status,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fulfillment_on_sale_change
  AFTER UPDATE OF fulfillment_status ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_order_fulfillment_status();