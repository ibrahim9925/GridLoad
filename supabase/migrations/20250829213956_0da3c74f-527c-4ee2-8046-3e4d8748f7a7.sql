-- Phase 3A: Enhanced Container Status Tracking & Timeline (Step by Step)

-- Step 1: Add new date columns for enhanced tracking
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS confirmed_date date,
ADD COLUMN IF NOT EXISTS shipped_date date,
ADD COLUMN IF NOT EXISTS in_transit_date date,
ADD COLUMN IF NOT EXISTS port_arrival_date date,
ADD COLUMN IF NOT EXISTS customs_start_date date,
ADD COLUMN IF NOT EXISTS customs_completion_date date,
ADD COLUMN IF NOT EXISTS local_transit_start_date date,
ADD COLUMN IF NOT EXISTS out_for_delivery_date date,
ADD COLUMN IF NOT EXISTS delivered_date date,
ADD COLUMN IF NOT EXISTS completed_date date,
ADD COLUMN IF NOT EXISTS estimated_delivery_date date,
ADD COLUMN IF NOT EXISTS tracking_number text,
ADD COLUMN IF NOT EXISTS carrier text,
ADD COLUMN IF NOT EXISTS port_of_departure text,
ADD COLUMN IF NOT EXISTS port_of_arrival text;

-- Step 2: Create the new enum type
CREATE TYPE container_status_enum AS ENUM (
  'ordered',
  'confirmed', 
  'shipped',
  'in_transit',
  'port_arrival',
  'customs_processing',
  'customs_cleared',
  'local_transit',
  'out_for_delivery',
  'delivered',
  'completed'
);

-- Step 3: Add a temporary column with the new enum type
ALTER TABLE public.containers ADD COLUMN status_new container_status_enum;

-- Step 4: Map existing text status values to new enum values
UPDATE public.containers SET status_new = 
  CASE 
    WHEN status = 'ordered' THEN 'ordered'::container_status_enum
    WHEN status = 'shipped' THEN 'shipped'::container_status_enum
    WHEN status = 'arrived' THEN 'port_arrival'::container_status_enum
    WHEN status = 'processing' THEN 'customs_processing'::container_status_enum
    WHEN status = 'completed' THEN 'completed'::container_status_enum
    ELSE 'ordered'::container_status_enum
  END;

-- Step 5: Drop old column and rename new column
ALTER TABLE public.containers DROP COLUMN status;
ALTER TABLE public.containers RENAME COLUMN status_new TO status;
ALTER TABLE public.containers ALTER COLUMN status SET DEFAULT 'ordered'::container_status_enum;
ALTER TABLE public.containers ALTER COLUMN status SET NOT NULL;

-- Step 6: Create container status history table
CREATE TABLE public.container_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  status container_status_enum NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  automatic_change boolean DEFAULT false,
  previous_status container_status_enum,
  created_at timestamp with time zone DEFAULT now()
);

-- Step 7: Create container performance analytics table
CREATE TABLE public.container_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  total_transit_days integer,
  customs_processing_days integer,
  port_processing_days integer,
  local_delivery_days integer,
  on_time_delivery boolean,
  delivery_variance_days integer,
  quality_score numeric(3,2) DEFAULT 5.0,
  variance_count integer DEFAULT 0,
  discrepancy_value numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Step 8: Create container variances table
CREATE TABLE public.container_variances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  container_product_id uuid REFERENCES public.container_products(id),
  variance_type text NOT NULL,
  expected_quantity integer,
  actual_quantity integer,
  variance_quantity integer,
  variance_value numeric DEFAULT 0,
  severity text DEFAULT 'medium',
  status text DEFAULT 'pending',
  reported_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  reported_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  notes text,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.container_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_variances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view container status history" ON public.container_status_history FOR SELECT USING (is_admin() OR is_warehouse() OR is_accountant());
CREATE POLICY "Staff can manage container status history" ON public.container_status_history FOR ALL USING (is_admin() OR is_warehouse()) WITH CHECK (is_admin() OR is_warehouse());
CREATE POLICY "Staff can view container analytics" ON public.container_analytics FOR SELECT USING (is_admin() OR is_warehouse() OR is_accountant());
CREATE POLICY "System can manage container analytics" ON public.container_analytics FOR ALL USING (is_admin() OR is_warehouse()) WITH CHECK (is_admin() OR is_warehouse());
CREATE POLICY "Staff can view container variances" ON public.container_variances FOR SELECT USING (is_admin() OR is_warehouse() OR is_accountant());
CREATE POLICY "Staff can manage container variances" ON public.container_variances FOR ALL USING (is_admin() OR is_warehouse()) WITH CHECK (is_admin() OR is_warehouse());