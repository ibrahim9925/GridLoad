
-- Phase 2.1: Advanced Commission Tracking Tables

-- Commission targets table for setting goals per sales rep
CREATE TABLE public.commission_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  target_period_start DATE NOT NULL,
  target_period_end DATE NOT NULL,
  target_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  target_type TEXT NOT NULL DEFAULT 'monthly' CHECK (target_type IN ('monthly', 'quarterly', 'yearly')),
  bonus_threshold NUMERIC(5,2) DEFAULT 100.00, -- percentage above target for bonus
  bonus_rate NUMERIC(5,2) DEFAULT 0.00, -- additional commission rate for exceeding target
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commission payments tracking
CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_commission NUMERIC(10,2) DEFAULT 0,
  total_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commission adjustments for bonuses/penalties
CREATE TABLE public.commission_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'penalty', 'correction')),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  applied_by UUID REFERENCES public.staff(id),
  sale_id UUID REFERENCES public.sales(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase 2.2: Stock Movement Optimization Tables

-- Supplier information and performance tracking
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  lead_time_days INTEGER DEFAULT 7,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  payment_terms TEXT DEFAULT 'net_30',
  quality_rating NUMERIC(3,2) DEFAULT 5.00 CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating NUMERIC(3,2) DEFAULT 5.00 CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product supplier relationships with pricing
CREATE TABLE public.product_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_sku TEXT,
  cost_price NUMERIC(10,2) NOT NULL,
  minimum_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  is_preferred BOOLEAN DEFAULT false,
  last_order_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

-- Advanced stock alerts with dynamic thresholds
CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'reorder_point', 'overstock')),
  threshold_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.staff(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  auto_reorder_suggested BOOLEAN DEFAULT false,
  suggested_order_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase orders for automated reordering
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  order_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase order items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory valuation snapshots for reporting
CREATE TABLE public.inventory_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id),
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  total_value NUMERIC(10,2) NOT NULL,
  valuation_method TEXT NOT NULL DEFAULT 'weighted_average' CHECK (valuation_method IN ('fifo', 'lifo', 'weighted_average')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add supplier relationship to existing products table
ALTER TABLE public.products ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);
ALTER TABLE public.products ADD COLUMN reorder_point INTEGER DEFAULT 20;
ALTER TABLE public.products ADD COLUMN reorder_quantity INTEGER DEFAULT 50;
ALTER TABLE public.products ADD COLUMN abc_classification TEXT DEFAULT 'C' CHECK (abc_classification IN ('A', 'B', 'C'));
ALTER TABLE public.products ADD COLUMN seasonal_factor NUMERIC(3,2) DEFAULT 1.00;

-- Update existing stock_movements table to include cost tracking
ALTER TABLE public.stock_movements ADD COLUMN unit_cost NUMERIC(10,2);
ALTER TABLE public.stock_movements ADD COLUMN total_cost NUMERIC(10,2);

-- Create indexes for performance
CREATE INDEX idx_commission_targets_sales_rep ON public.commission_targets(sales_rep_id);
CREATE INDEX idx_commission_payments_sales_rep ON public.commission_payments(sales_rep_id);
CREATE INDEX idx_commission_payments_period ON public.commission_payments(period_start, period_end);
CREATE INDEX idx_stock_alerts_product ON public.stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_severity ON public.stock_alerts(severity, is_acknowledged);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_inventory_valuations_product_date ON public.inventory_valuations(product_id, valuation_date);

-- Functions for automated stock management
CREATE OR REPLACE FUNCTION public.calculate_reorder_point(
  product_id_param UUID,
  lead_time_days INTEGER DEFAULT 7,
  safety_stock_days INTEGER DEFAULT 3
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  avg_daily_sales NUMERIC;
  calculated_reorder_point INTEGER;
BEGIN
  -- Calculate average daily sales over last 30 days
  SELECT COALESCE(AVG(daily_sales), 0) INTO avg_daily_sales
  FROM (
    SELECT DATE(si.created_at) as sale_date, SUM(si.quantity) as daily_sales
    FROM sale_items si
    WHERE si.product_id = product_id_param
      AND si.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(si.created_at)
  ) daily_totals;
  
  -- Calculate reorder point: (lead time + safety stock) * average daily sales
  calculated_reorder_point := CEIL(avg_daily_sales * (lead_time_days + safety_stock_days));
  
  -- Minimum reorder point of 5
  RETURN GREATEST(calculated_reorder_point, 5);
END;
$$;

-- Function to generate automatic stock alerts
CREATE OR REPLACE FUNCTION public.generate_stock_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  product_record RECORD;
  alert_count INTEGER := 0;
BEGIN
  -- Clear existing unacknowledged alerts
  DELETE FROM public.stock_alerts WHERE is_acknowledged = false;
  
  -- Generate new alerts for all products
  FOR product_record IN 
    SELECT p.*, COALESCE(p.reorder_point, 20) as calculated_reorder_point
    FROM public.products p 
    WHERE p.is_active = true
  LOOP
    -- Out of stock alert
    IF product_record.current_stock = 0 THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity, 
        severity, auto_reorder_suggested, suggested_order_quantity
      ) VALUES (
        product_record.id, 'out_of_stock', 0, product_record.current_stock,
        'critical', true, COALESCE(product_record.reorder_quantity, 50)
      );
      alert_count := alert_count + 1;
      
    -- Low stock alert (at or below reorder point)
    ELSIF product_record.current_stock <= product_record.calculated_reorder_point THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity,
        severity, auto_reorder_suggested, suggested_order_quantity
      ) VALUES (
        product_record.id, 'reorder_point', product_record.calculated_reorder_point, product_record.current_stock,
        CASE 
          WHEN product_record.current_stock <= (product_record.calculated_reorder_point * 0.5) THEN 'high'
          ELSE 'medium'
        END,
        true, COALESCE(product_record.reorder_quantity, 50)
      );
      alert_count := alert_count + 1;
      
    -- Overstock alert (above max stock level)
    ELSIF product_record.current_stock > COALESCE(product_record.max_stock_level, 1000) THEN
      INSERT INTO public.stock_alerts (
        product_id, alert_type, threshold_quantity, current_quantity, severity
      ) VALUES (
        product_record.id, 'overstock', product_record.max_stock_level, product_record.current_stock, 'low'
      );
      alert_count := alert_count + 1;
    END IF;
  END LOOP;
  
  RETURN alert_count;
END;
$$;

-- Trigger to update commission amount when sales are created/updated
CREATE OR REPLACE FUNCTION public.update_commission_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  commission_rate NUMERIC;
BEGIN
  -- Get the sales rep's commission rate
  SELECT COALESCE(s.commission_rate, 0) INTO commission_rate
  FROM public.staff s
  WHERE s.id = NEW.sales_rep_id;
  
  -- Calculate and update commission amount
  NEW.commission_amount := NEW.total_amount * (commission_rate / 100);
  
  RETURN NEW;
END;
$$;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS trigger_update_commission ON public.sales;
CREATE TRIGGER trigger_update_commission
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commission_on_sale();
