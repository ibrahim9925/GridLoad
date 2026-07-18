-- Phase 3A: Enhanced Container Status Tracking & Timeline

-- Expand container status enum to include all lifecycle stages
DROP TYPE IF EXISTS container_status_enum CASCADE;
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

-- Add new date fields to containers table for enhanced tracking
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

-- Update status column to use new enum
ALTER TABLE public.containers 
ALTER COLUMN status TYPE container_status_enum USING status::container_status_enum;

-- Create container status history table
CREATE TABLE IF NOT EXISTS public.container_status_history (
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

-- Create container performance analytics table
CREATE TABLE IF NOT EXISTS public.container_analytics (
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

-- Create container variances table for quality control
CREATE TABLE IF NOT EXISTS public.container_variances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_id uuid NOT NULL REFERENCES public.containers(id) ON DELETE CASCADE,
  container_product_id uuid REFERENCES public.container_products(id),
  variance_type text NOT NULL, -- 'shortage', 'overage', 'damage', 'quality'
  expected_quantity integer,
  actual_quantity integer,
  variance_quantity integer,
  variance_value numeric DEFAULT 0,
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status text DEFAULT 'pending', -- 'pending', 'resolved', 'disputed'
  reported_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  reported_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  notes text,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.container_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_variances ENABLE ROW LEVEL SECURITY;

-- RLS policies for container_status_history
CREATE POLICY "Staff can view container status history" 
ON public.container_status_history FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_accountant());

CREATE POLICY "Staff can manage container status history" 
ON public.container_status_history FOR ALL
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

-- RLS policies for container_analytics  
CREATE POLICY "Staff can view container analytics" 
ON public.container_analytics FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_accountant());

CREATE POLICY "System can manage container analytics" 
ON public.container_analytics FOR ALL
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

-- RLS policies for container_variances
CREATE POLICY "Staff can view container variances" 
ON public.container_variances FOR SELECT 
USING (is_admin() OR is_warehouse() OR is_accountant());

CREATE POLICY "Staff can manage container variances" 
ON public.container_variances FOR ALL
USING (is_admin() OR is_warehouse())
WITH CHECK (is_admin() OR is_warehouse());

-- Function to automatically update container status history
CREATE OR REPLACE FUNCTION public.track_container_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert status change record
  INSERT INTO public.container_status_history (
    container_id,
    status,
    changed_by,
    changed_at,
    previous_status,
    automatic_change,
    notes
  ) VALUES (
    NEW.id,
    NEW.status,
    auth.uid(),
    now(),
    OLD.status,
    false,
    CASE 
      WHEN NEW.status != OLD.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      ELSE NULL
    END
  );

  -- Auto-update relevant date fields based on status
  CASE NEW.status
    WHEN 'confirmed' THEN NEW.confirmed_date := COALESCE(NEW.confirmed_date, CURRENT_DATE);
    WHEN 'shipped' THEN NEW.shipped_date := COALESCE(NEW.shipped_date, CURRENT_DATE);
    WHEN 'in_transit' THEN NEW.in_transit_date := COALESCE(NEW.in_transit_date, CURRENT_DATE);
    WHEN 'port_arrival' THEN NEW.port_arrival_date := COALESCE(NEW.port_arrival_date, CURRENT_DATE);
    WHEN 'customs_processing' THEN NEW.customs_start_date := COALESCE(NEW.customs_start_date, CURRENT_DATE);
    WHEN 'customs_cleared' THEN NEW.customs_completion_date := COALESCE(NEW.customs_completion_date, CURRENT_DATE);
    WHEN 'local_transit' THEN NEW.local_transit_start_date := COALESCE(NEW.local_transit_start_date, CURRENT_DATE);
    WHEN 'out_for_delivery' THEN NEW.out_for_delivery_date := COALESCE(NEW.out_for_delivery_date, CURRENT_DATE);
    WHEN 'delivered' THEN NEW.delivered_date := COALESCE(NEW.delivered_date, CURRENT_DATE);
    WHEN 'completed' THEN NEW.completed_date := COALESCE(NEW.completed_date, CURRENT_DATE);
    ELSE NULL;
  END CASE;

  -- Update analytics when container is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.container_analytics (
      container_id,
      supplier_id,
      total_transit_days,
      customs_processing_days,
      port_processing_days,
      on_time_delivery,
      delivery_variance_days
    ) VALUES (
      NEW.id,
      NEW.supplier_id,
      COALESCE(NEW.completed_date - NEW.order_date, 0),
      COALESCE(NEW.customs_completion_date - NEW.customs_start_date, 0),
      COALESCE(NEW.port_arrival_date - NEW.shipped_date, 0),
      NEW.completed_date <= COALESCE(NEW.estimated_delivery_date, NEW.expected_arrival_date),
      COALESCE(NEW.completed_date - COALESCE(NEW.estimated_delivery_date, NEW.expected_arrival_date), 0)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for container status tracking
DROP TRIGGER IF EXISTS container_status_tracking_trigger ON public.containers;
CREATE TRIGGER container_status_tracking_trigger
  BEFORE UPDATE ON public.containers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.updated_at IS DISTINCT FROM NEW.updated_at)
  EXECUTE FUNCTION public.track_container_status_change();

-- Function to calculate supplier performance metrics
CREATE OR REPLACE FUNCTION public.calculate_supplier_performance(supplier_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  total_containers integer;
  on_time_count integer;
  avg_delivery_days numeric;
  avg_variance_days numeric;
  quality_score numeric;
BEGIN
  -- Get basic metrics
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN on_time_delivery THEN 1 END) as on_time,
    AVG(total_transit_days) as avg_days,
    AVG(ABS(delivery_variance_days)) as avg_variance,
    AVG(quality_score) as quality
  INTO 
    total_containers, on_time_count, avg_delivery_days, avg_variance_days, quality_score
  FROM public.container_analytics 
  WHERE supplier_id = supplier_id_param;

  result := jsonb_build_object(
    'total_containers', COALESCE(total_containers, 0),
    'on_time_delivery_rate', CASE 
      WHEN total_containers > 0 THEN ROUND((on_time_count::numeric / total_containers) * 100, 2)
      ELSE 0 
    END,
    'average_delivery_days', COALESCE(ROUND(avg_delivery_days, 1), 0),
    'average_variance_days', COALESCE(ROUND(avg_variance_days, 1), 0),
    'quality_score', COALESCE(ROUND(quality_score, 2), 5.0),
    'performance_grade', CASE 
      WHEN quality_score >= 4.5 AND (on_time_count::numeric / GREATEST(total_containers, 1)) >= 0.9 THEN 'A'
      WHEN quality_score >= 4.0 AND (on_time_count::numeric / GREATEST(total_containers, 1)) >= 0.8 THEN 'B'
      WHEN quality_score >= 3.5 AND (on_time_count::numeric / GREATEST(total_containers, 1)) >= 0.7 THEN 'C'
      WHEN quality_score >= 3.0 AND (on_time_count::numeric / GREATEST(total_containers, 1)) >= 0.6 THEN 'D'
      ELSE 'F'
    END
  );

  RETURN result;
END;
$function$;