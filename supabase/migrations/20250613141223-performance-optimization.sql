
-- Phase 2B: Database Optimization - Critical Indexes and Constraints
-- Note: Using regular CREATE INDEX instead of CONCURRENTLY to avoid transaction block issues

-- Performance Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_customers_search 
ON public.customers USING gin(to_tsvector('english', 
  COALESCE(company_name, '') || ' ' || 
  COALESCE(contact_person, '') || ' ' || 
  COALESCE(email, '') || ' ' || 
  COALESCE(phone, '')
));

CREATE INDEX IF NOT EXISTS idx_customers_email 
ON public.customers (email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON public.customers (phone) WHERE phone IS NOT NULL;

-- Products search and lookup indexes
CREATE INDEX IF NOT EXISTS idx_products_search 
ON public.products USING gin(to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(category, '') || ' ' || 
  COALESCE(sku, '') || ' ' || 
  COALESCE(description, '')
));

CREATE INDEX IF NOT EXISTS idx_products_sku 
ON public.products (sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category 
ON public.products (category) WHERE category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_status 
ON public.products (status, is_active);

CREATE INDEX IF NOT EXISTS idx_products_stock_alerts 
ON public.products (current_stock, low_stock_threshold) 
WHERE is_active = true AND current_stock <= low_stock_threshold;

-- Sales and payment tracking indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer_date 
ON public.sales (customer_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_rep_date 
ON public.sales (sales_rep_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_payment_status 
ON public.sales (payment_status, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_total_amount 
ON public.sales (total_amount DESC, sale_date DESC);

-- Payment tracking indexes
CREATE INDEX IF NOT EXISTS idx_payments_sale_date 
ON public.payments (sale_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_method_date 
ON public.payments (payment_method, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date 
ON public.payment_schedules (due_date, status) 
WHERE status = 'pending';

-- Leads tracking indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_status 
ON public.leads (assigned_to, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_follow_up 
ON public.leads (next_follow_up) 
WHERE next_follow_up IS NOT NULL AND status NOT IN ('converted', 'lost');

-- Installation tracking indexes
CREATE INDEX IF NOT EXISTS idx_installations_engineer_date 
ON public.installations (assigned_engineer, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_installations_status_date 
ON public.installations (status, scheduled_date);

-- Stock movement tracking
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date 
ON public.stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference 
ON public.stock_movements (reference_type, reference_id);

-- Staff and commission indexes
CREATE INDEX IF NOT EXISTS idx_staff_role_active 
ON public.staff (role, is_active);

CREATE INDEX IF NOT EXISTS idx_commission_payments_rep_period 
ON public.commission_payments (sales_rep_id, period_start, period_end);

-- Expense tracking
CREATE INDEX IF NOT EXISTS idx_expenses_assigned_date 
ON public.expenses (assigned_to, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category_date 
ON public.expenses (category, expense_date DESC);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_sales_comprehensive 
ON public.sales (sales_rep_id, payment_status, sale_date DESC, total_amount DESC);

CREATE INDEX IF NOT EXISTS idx_products_inventory_management 
ON public.products (is_active, current_stock, low_stock_threshold, category);

CREATE INDEX IF NOT EXISTS idx_leads_management 
ON public.leads (assigned_to, status, next_follow_up, estimated_value DESC);

-- Data Integrity Constraints
-- Ensure positive values where appropriate
DO $$ 
BEGIN
  -- Add constraints with error handling
  BEGIN
    ALTER TABLE public.products ADD CONSTRAINT check_products_positive_stock CHECK (current_stock >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.products ADD CONSTRAINT check_products_positive_thresholds CHECK (low_stock_threshold >= 0 AND max_stock_level > 0 AND reorder_point >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.sales ADD CONSTRAINT check_sales_positive_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0 AND total_paid >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.payments ADD CONSTRAINT check_payments_positive_amount CHECK (amount > 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.payment_schedules ADD CONSTRAINT check_payment_schedules_positive_amount CHECK (amount > 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Logical relationship constraints
  BEGIN
    ALTER TABLE public.sales ADD CONSTRAINT check_sales_balance_logic CHECK (balance_due = total_amount - total_paid);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.sales ADD CONSTRAINT check_sales_total_paid_not_exceed CHECK (total_paid <= total_amount);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Date constraints
  BEGIN
    ALTER TABLE public.installations ADD CONSTRAINT check_installations_completion_after_scheduled CHECK (completion_date IS NULL OR completion_date >= scheduled_date);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.warranties ADD CONSTRAINT check_warranties_end_after_start CHECK (warranty_end_date > warranty_start_date);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.payment_schedules ADD CONSTRAINT check_payment_schedules_future_due_date CHECK (due_date >= CURRENT_DATE - INTERVAL '30 days');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Business logic constraints
  BEGIN
    ALTER TABLE public.staff ADD CONSTRAINT check_staff_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.commission_targets ADD CONSTRAINT check_commission_targets_positive_amounts CHECK (target_amount >= 0 AND bonus_threshold > 0 AND bonus_rate >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Unique constraints for business logic
  BEGIN
    ALTER TABLE public.products ADD CONSTRAINT unique_products_sku UNIQUE (sku) DEFERRABLE INITIALLY DEFERRED;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.warranties ADD CONSTRAINT unique_warranties_serial_number UNIQUE (serial_number);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
