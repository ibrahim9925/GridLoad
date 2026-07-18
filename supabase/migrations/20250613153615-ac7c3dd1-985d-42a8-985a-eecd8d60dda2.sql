
-- Phase 1: Critical Security Implementation - Add Missing Foreign Key Constraints and RLS Policies (Fixed)

-- First, add missing foreign key constraints only if they don't exist
DO $$ 
BEGIN
    -- Check and add foreign key constraints only if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_purchase_orders_supplier_id') THEN
        ALTER TABLE public.purchase_orders ADD CONSTRAINT fk_purchase_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_purchase_orders_created_by') THEN
        ALTER TABLE public.purchase_orders ADD CONSTRAINT fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_sale_items_product_id') THEN
        ALTER TABLE public.sale_items ADD CONSTRAINT fk_sale_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_expenses_assigned_to') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_expenses_installation_id') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_installation_id FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_expenses_created_by') THEN
        ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_product_suppliers_product_id') THEN
        ALTER TABLE public.product_suppliers ADD CONSTRAINT fk_product_suppliers_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_product_suppliers_supplier_id') THEN
        ALTER TABLE public.product_suppliers ADD CONSTRAINT fk_product_suppliers_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leads_customer_id') THEN
        ALTER TABLE public.leads ADD CONSTRAINT fk_leads_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_leads_assigned_to') THEN
        ALTER TABLE public.leads ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_stock_alerts_product_id') THEN
        ALTER TABLE public.stock_alerts ADD CONSTRAINT fk_stock_alerts_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_stock_alerts_acknowledged_by') THEN
        ALTER TABLE public.stock_alerts ADD CONSTRAINT fk_stock_alerts_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_payments_payment_schedule_id') THEN
        ALTER TABLE public.payments ADD CONSTRAINT fk_payments_payment_schedule_id FOREIGN KEY (payment_schedule_id) REFERENCES public.payment_schedules(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_payments_recorded_by') THEN
        ALTER TABLE public.payments ADD CONSTRAINT fk_payments_recorded_by FOREIGN KEY (recorded_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_installation_reports_installation_id') THEN
        ALTER TABLE public.installation_reports ADD CONSTRAINT fk_installation_reports_installation_id FOREIGN KEY (installation_id) REFERENCES public.installations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_installation_reports_uploaded_by') THEN
        ALTER TABLE public.installation_reports ADD CONSTRAINT fk_installation_reports_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_installations_sale_id') THEN
        ALTER TABLE public.installations ADD CONSTRAINT fk_installations_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_installations_customer_id') THEN
        ALTER TABLE public.installations ADD CONSTRAINT fk_installations_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_installations_assigned_engineer') THEN
        ALTER TABLE public.installations ADD CONSTRAINT fk_installations_assigned_engineer FOREIGN KEY (assigned_engineer) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_purchase_order_items_purchase_order_id') THEN
        ALTER TABLE public.purchase_order_items ADD CONSTRAINT fk_purchase_order_items_purchase_order_id FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_purchase_order_items_product_id') THEN
        ALTER TABLE public.purchase_order_items ADD CONSTRAINT fk_purchase_order_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_commission_payments_sales_rep_id') THEN
        ALTER TABLE public.commission_payments ADD CONSTRAINT fk_commission_payments_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES public.staff(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_stock_movements_product_id') THEN
        ALTER TABLE public.stock_movements ADD CONSTRAINT fk_stock_movements_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_stock_movements_created_by') THEN
        ALTER TABLE public.stock_movements ADD CONSTRAINT fk_stock_movements_created_by FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_inventory_valuations_product_id') THEN
        ALTER TABLE public.inventory_valuations ADD CONSTRAINT fk_inventory_valuations_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranty_claims_warranty_id') THEN
        ALTER TABLE public.warranty_claims ADD CONSTRAINT fk_warranty_claims_warranty_id FOREIGN KEY (warranty_id) REFERENCES public.warranties(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranty_claims_processed_by') THEN
        ALTER TABLE public.warranty_claims ADD CONSTRAINT fk_warranty_claims_processed_by FOREIGN KEY (processed_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_sales_lead_id') THEN
        ALTER TABLE public.sales ADD CONSTRAINT fk_sales_lead_id FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_sales_customer_id') THEN
        ALTER TABLE public.sales ADD CONSTRAINT fk_sales_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_sales_sales_rep_id') THEN
        ALTER TABLE public.sales ADD CONSTRAINT fk_sales_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranties_sale_id') THEN
        ALTER TABLE public.warranties ADD CONSTRAINT fk_warranties_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranties_product_id') THEN
        ALTER TABLE public.warranties ADD CONSTRAINT fk_warranties_product_id FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranties_customer_id') THEN
        ALTER TABLE public.warranties ADD CONSTRAINT fk_warranties_customer_id FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warranties_registered_by') THEN
        ALTER TABLE public.warranties ADD CONSTRAINT fk_warranties_registered_by FOREIGN KEY (registered_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_products_supplier_id') THEN
        ALTER TABLE public.products ADD CONSTRAINT fk_products_supplier_id FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_commission_adjustments_sales_rep_id') THEN
        ALTER TABLE public.commission_adjustments ADD CONSTRAINT fk_commission_adjustments_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES public.staff(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_commission_adjustments_applied_by') THEN
        ALTER TABLE public.commission_adjustments ADD CONSTRAINT fk_commission_adjustments_applied_by FOREIGN KEY (applied_by) REFERENCES public.staff(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_commission_adjustments_sale_id') THEN
        ALTER TABLE public.commission_adjustments ADD CONSTRAINT fk_commission_adjustments_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_commission_targets_sales_rep_id') THEN
        ALTER TABLE public.commission_targets ADD CONSTRAINT fk_commission_targets_sales_rep_id FOREIGN KEY (sales_rep_id) REFERENCES public.staff(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_payment_schedules_sale_id') THEN
        ALTER TABLE public.payment_schedules ADD CONSTRAINT fk_payment_schedules_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_staff_id') THEN
        ALTER TABLE public.staff ADD CONSTRAINT fk_staff_id FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comprehensive RLS policies (only if they don't exist)
DO $$
BEGIN
    -- Drop existing policies first to avoid conflicts
    DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
    DROP POLICY IF EXISTS "Sales staff can create customers" ON public.customers;
    DROP POLICY IF EXISTS "Sales staff can update customers" ON public.customers;
    DROP POLICY IF EXISTS "Admin can delete customers" ON public.customers;
    DROP POLICY IF EXISTS "Staff can view relevant leads" ON public.leads;
    DROP POLICY IF EXISTS "Sales staff can create leads" ON public.leads;
    DROP POLICY IF EXISTS "Staff can view relevant sales" ON public.sales;
    DROP POLICY IF EXISTS "Sales staff can create sales" ON public.sales;
    DROP POLICY IF EXISTS "Sales staff can update their sales" ON public.sales;
    DROP POLICY IF EXISTS "Staff can view sale items" ON public.sale_items;
    DROP POLICY IF EXISTS "Sales staff can manage sale items" ON public.sale_items;
    DROP POLICY IF EXISTS "Staff can view products" ON public.products;
    DROP POLICY IF EXISTS "Warehouse and admin can manage products" ON public.products;
    
    -- Create new RLS policies
    CREATE POLICY "Staff can view customers" ON public.customers
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR 
        public.is_sales_rep() OR 
        public.is_accountant()
      );

    CREATE POLICY "Sales staff can create customers" ON public.customers
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin() OR public.is_sales_rep());

    CREATE POLICY "Sales staff can update customers" ON public.customers
      FOR UPDATE TO authenticated
      USING (public.is_admin() OR public.is_sales_rep());

    CREATE POLICY "Admin can delete customers" ON public.customers
      FOR DELETE TO authenticated
      USING (public.is_admin());

    CREATE POLICY "Staff can view relevant leads" ON public.leads
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR 
        (public.is_sales_rep() AND (assigned_to = auth.uid() OR assigned_to IS NULL))
      );

    CREATE POLICY "Sales staff can create leads" ON public.leads
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin() OR public.is_sales_rep());

    CREATE POLICY "Staff can view relevant sales" ON public.sales
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR 
        public.is_accountant() OR
        (public.is_sales_rep() AND sales_rep_id = auth.uid())
      );

    CREATE POLICY "Sales staff can create sales" ON public.sales
      FOR INSERT TO authenticated
      WITH CHECK (
        (public.is_admin() OR public.is_sales_rep()) AND
        (sales_rep_id = auth.uid() OR public.is_admin())
      );

    CREATE POLICY "Sales staff can update their sales" ON public.sales
      FOR UPDATE TO authenticated
      USING (
        public.is_admin() OR 
        public.is_accountant() OR
        (public.is_sales_rep() AND sales_rep_id = auth.uid())
      );

    CREATE POLICY "Staff can view sale items" ON public.sale_items
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR 
        public.is_accountant() OR
        EXISTS (
          SELECT 1 FROM public.sales s 
          WHERE s.id = sale_id AND (
            public.is_admin() OR 
            (public.is_sales_rep() AND s.sales_rep_id = auth.uid())
          )
        )
      );

    CREATE POLICY "Sales staff can manage sale items" ON public.sale_items
      FOR ALL TO authenticated
      USING (
        public.is_admin() OR 
        EXISTS (
          SELECT 1 FROM public.sales s 
          WHERE s.id = sale_id AND (
            public.is_admin() OR 
            (public.is_sales_rep() AND s.sales_rep_id = auth.uid())
          )
        )
      );

    CREATE POLICY "Staff can view products" ON public.products
      FOR SELECT TO authenticated
      USING (
        public.is_admin() OR 
        public.is_warehouse() OR 
        public.is_sales_rep()
      );

    CREATE POLICY "Warehouse and admin can manage products" ON public.products
      FOR ALL TO authenticated
      USING (public.is_admin() OR public.is_warehouse());
END $$;

-- Add performance indexes for RLS queries
CREATE INDEX IF NOT EXISTS idx_sales_sales_rep_id ON public.sales(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff(role);
CREATE INDEX IF NOT EXISTS idx_expenses_assigned_to ON public.expenses(assigned_to);
CREATE INDEX IF NOT EXISTS idx_installations_assigned_engineer ON public.installations(assigned_engineer);

-- Add data validation constraints (only if they don't exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.customers 
        ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.staff 
        ADD CONSTRAINT check_staff_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.sales 
        ADD CONSTRAINT check_positive_amounts CHECK (
          total_amount >= 0 AND 
          subtotal >= 0 AND 
          tax_amount >= 0 AND
          total_paid >= 0 AND
          balance_due >= -total_amount
        );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.products 
        ADD CONSTRAINT check_positive_stock CHECK (current_stock >= 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.payments 
        ADD CONSTRAINT check_positive_payment_amount CHECK (amount > 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
