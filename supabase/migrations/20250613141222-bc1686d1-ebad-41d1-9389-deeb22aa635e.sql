
-- Phase 2A: Implement Row Level Security (RLS) for all database tables

-- First, create security definer functions to avoid recursive policy issues
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.staff WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'sales_rep'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'accountant'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'warehouse'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_installer()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() AND role = 'installer'
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_valuations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CUSTOMERS table
-- Admins and sales reps can see all customers, accountants can see customers with sales
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

-- RLS Policies for LEADS table
-- Sales reps can only see their assigned leads, admins see all
CREATE POLICY "Staff can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    (public.is_sales_rep() AND assigned_to = auth.uid())
  );

CREATE POLICY "Sales staff can create leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_sales_rep());

CREATE POLICY "Sales staff can update their leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR 
    (public.is_sales_rep() AND assigned_to = auth.uid())
  );

-- RLS Policies for SALES table
-- Sales reps can see their sales, accountants see all for financial purposes
CREATE POLICY "Staff can view sales" ON public.sales
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    (public.is_sales_rep() AND sales_rep_id = auth.uid())
  );

CREATE POLICY "Sales staff can create sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR 
    (public.is_sales_rep() AND sales_rep_id = auth.uid())
  );

CREATE POLICY "Sales staff can update their sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (
    public.is_admin() OR 
    (public.is_sales_rep() AND sales_rep_id = auth.uid()) OR
    public.is_accountant()
  );

-- RLS Policies for SALE_ITEMS table
CREATE POLICY "Staff can view sale items" ON public.sale_items
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    public.is_sales_rep()
  );

CREATE POLICY "Sales staff can manage sale items" ON public.sale_items
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_sales_rep());

-- RLS Policies for PRODUCTS table
-- Warehouse staff and sales reps need access, admins see all
CREATE POLICY "Staff can view products" ON public.products
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_sales_rep()
  );

CREATE POLICY "Warehouse staff can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for STOCK_MOVEMENTS table
CREATE POLICY "Staff can view stock movements" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_sales_rep()
  );

CREATE POLICY "Warehouse staff can manage stock movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for PAYMENTS table
-- Accountants and admins manage payments, sales reps can view their sales payments
CREATE POLICY "Staff can view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_id AND s.sales_rep_id = auth.uid() AND public.is_sales_rep()
    )
  );

CREATE POLICY "Financial staff can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant());

-- RLS Policies for PAYMENT_SCHEDULES table
CREATE POLICY "Staff can view payment schedules" ON public.payment_schedules
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_id AND s.sales_rep_id = auth.uid() AND public.is_sales_rep()
    )
  );

CREATE POLICY "Financial staff can manage payment schedules" ON public.payment_schedules
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant());

-- RLS Policies for INSTALLATIONS table
-- Installers see their assignments, warehouse staff see all for logistics
CREATE POLICY "Staff can view installations" ON public.installations
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR
    (public.is_installer() AND assigned_engineer = auth.uid())
  );

CREATE POLICY "Installation staff can manage installations" ON public.installations
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR
    (public.is_installer() AND assigned_engineer = auth.uid())
  );

-- RLS Policies for INSTALLATION_REPORTS table
CREATE POLICY "Staff can view installation reports" ON public.installation_reports
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR
    (public.is_installer() AND uploaded_by = auth.uid())
  );

CREATE POLICY "Installers can manage their reports" ON public.installation_reports
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    (public.is_installer() AND uploaded_by = auth.uid())
  );

-- RLS Policies for EXPENSES table
-- Accountants manage expenses, other staff can view expenses assigned to them
CREATE POLICY "Staff can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    assigned_to = auth.uid()
  );

CREATE POLICY "Financial staff can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant());

-- RLS Policies for WARRANTIES table
CREATE POLICY "Staff can view warranties" ON public.warranties
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_sales_rep() OR 
    public.is_warehouse()
  );

CREATE POLICY "Sales and warehouse staff can manage warranties" ON public.warranties
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    public.is_sales_rep() OR 
    public.is_warehouse()
  );

-- RLS Policies for WARRANTY_CLAIMS table
CREATE POLICY "Staff can view warranty claims" ON public.warranty_claims
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_sales_rep() OR 
    public.is_warehouse()
  );

CREATE POLICY "Sales and warehouse staff can manage warranty claims" ON public.warranty_claims
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR 
    public.is_sales_rep() OR 
    public.is_warehouse()
  );

-- RLS Policies for COMMISSION tables (sales rep specific)
CREATE POLICY "Staff can view commission targets" ON public.commission_targets
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    (public.is_sales_rep() AND sales_rep_id = auth.uid())
  );

CREATE POLICY "Admin can manage commission targets" ON public.commission_targets
  FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY "Staff can view commission payments" ON public.commission_payments
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    (public.is_sales_rep() AND sales_rep_id = auth.uid())
  );

CREATE POLICY "Financial staff can manage commission payments" ON public.commission_payments
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant());

CREATE POLICY "Staff can view commission adjustments" ON public.commission_adjustments
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_accountant() OR
    (public.is_sales_rep() AND sales_rep_id = auth.uid())
  );

CREATE POLICY "Admin can manage commission adjustments" ON public.commission_adjustments
  FOR ALL TO authenticated
  USING (public.is_admin());

-- RLS Policies for SUPPLIERS table
CREATE POLICY "Staff can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_accountant()
  );

CREATE POLICY "Warehouse staff can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for PRODUCT_SUPPLIERS table
CREATE POLICY "Staff can view product suppliers" ON public.product_suppliers
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_accountant()
  );

CREATE POLICY "Warehouse staff can manage product suppliers" ON public.product_suppliers
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for STOCK_ALERTS table
CREATE POLICY "Staff can view stock alerts" ON public.stock_alerts
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_sales_rep()
  );

CREATE POLICY "Warehouse staff can manage stock alerts" ON public.stock_alerts
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for PURCHASE_ORDERS table
CREATE POLICY "Staff can view purchase orders" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_accountant()
  );

CREATE POLICY "Warehouse staff can manage purchase orders" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for PURCHASE_ORDER_ITEMS table
CREATE POLICY "Staff can view purchase order items" ON public.purchase_order_items
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_accountant()
  );

CREATE POLICY "Warehouse staff can manage purchase order items" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_warehouse());

-- RLS Policies for INVENTORY_VALUATIONS table
CREATE POLICY "Staff can view inventory valuations" ON public.inventory_valuations
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    public.is_warehouse() OR 
    public.is_accountant()
  );

CREATE POLICY "Financial staff can manage inventory valuations" ON public.inventory_valuations
  FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_accountant());

-- Update staff table policies to be more secure
DROP POLICY IF EXISTS "Staff can view all staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can create staff" ON public.staff;
DROP POLICY IF EXISTS "Staff can update staff" ON public.staff;

CREATE POLICY "Staff can view staff" ON public.staff
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    id = auth.uid()
  );

CREATE POLICY "Admin can manage staff" ON public.staff
  FOR ALL TO authenticated
  USING (public.is_admin());
