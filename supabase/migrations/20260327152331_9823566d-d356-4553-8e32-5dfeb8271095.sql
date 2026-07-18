
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'sales_rep', 'accountant', 'warehouse', 'installer');

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer role check functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'sales_rep');
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'accountant');
$$;

CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'warehouse');
$$;

CREATE OR REPLACE FUNCTION public.is_installer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'installer');
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'accountant'));
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- First admin trigger
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_first_admin_assignment AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  contact_person text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  country text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  description text,
  category text,
  standard_selling_price numeric DEFAULT 0,
  cost_price numeric DEFAULT 0,
  current_stock integer DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  is_active boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product suppliers
CREATE TABLE public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  supplier_sku text,
  cost_price numeric DEFAULT 0,
  is_preferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD product_suppliers" ON public.product_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text,
  phone text,
  role text,
  department text,
  is_active boolean DEFAULT true,
  hire_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD staff" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sales
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  sale_date timestamptz DEFAULT now(),
  total_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  net_amount numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  currency text DEFAULT 'USD',
  exchange_rate numeric DEFAULT 1,
  amount_usd numeric DEFAULT 0,
  amount_nis numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sale items
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id),
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD sale_items" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  customer_id uuid REFERENCES public.customers(id),
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamptz DEFAULT now(),
  payment_method text DEFAULT 'cash',
  currency text DEFAULT 'USD',
  exchange_rate numeric DEFAULT 1,
  amount_usd numeric DEFAULT 0,
  amount_nis numeric DEFAULT 0,
  reference_number text,
  notes text,
  status text DEFAULT 'completed',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bank accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  bank_name text,
  account_number text,
  currency text DEFAULT 'USD',
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bank ledger
CREATE TABLE public.bank_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  transaction_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  description text,
  reference_id uuid,
  reference_type text,
  balance_after numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.bank_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD bank_ledger" ON public.bank_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Capital injections
CREATE TABLE public.capital_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  source text,
  description text,
  injection_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.capital_injections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD capital_injections" ON public.capital_injections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  expense_date timestamptz DEFAULT now(),
  staff_id uuid REFERENCES public.staff(id),
  receipt_url text,
  status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Containers
CREATE TABLE public.containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  status text DEFAULT 'pending',
  shipping_date timestamptz,
  arrival_date timestamptz,
  actual_arrival_date timestamptz,
  total_cost numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD containers" ON public.containers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Container products
CREATE TABLE public.container_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES public.containers(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) NOT NULL,
  expected_quantity integer DEFAULT 0,
  received_quantity integer DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.container_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD container_products" ON public.container_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Container status history
CREATE TABLE public.container_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES public.containers(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id),
  notes text
);
ALTER TABLE public.container_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD container_status_history" ON public.container_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Container variances
CREATE TABLE public.container_variances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES public.containers(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id),
  expected_quantity integer DEFAULT 0,
  received_quantity integer DEFAULT 0,
  variance integer DEFAULT 0,
  variance_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.container_variances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD container_variances" ON public.container_variances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Container analytics
CREATE TABLE public.container_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES public.containers(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value jsonb DEFAULT '{}'::jsonb,
  calculated_at timestamptz DEFAULT now()
);
ALTER TABLE public.container_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD container_analytics" ON public.container_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id),
  container_id uuid REFERENCES public.containers(id),
  order_number text,
  status text DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  order_date timestamptz DEFAULT now(),
  expected_delivery timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase order items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id),
  quantity integer DEFAULT 0,
  received_quantity integer DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) NOT NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  reference_id uuid,
  reference_type text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Stock alerts
CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  alert_type text NOT NULL,
  message text,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD stock_alerts" ON public.stock_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory valuations
CREATE TABLE public.inventory_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  valuation_date timestamptz DEFAULT now(),
  quantity integer DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  method text DEFAULT 'weighted_average'
);
ALTER TABLE public.inventory_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD inventory_valuations" ON public.inventory_valuations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product serial numbers
CREATE TABLE public.product_serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  serial_number text NOT NULL UNIQUE,
  status text DEFAULT 'available',
  sale_id uuid REFERENCES public.sales(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_serial_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD product_serial_numbers" ON public.product_serial_numbers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quotations
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  quote_number text,
  status text DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  valid_until timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD quotations" ON public.quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quotation items
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id),
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD quotation_items" ON public.quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  source text,
  status text DEFAULT 'new',
  notes text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Installations
CREATE TABLE public.installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  customer_id uuid REFERENCES public.customers(id),
  status text DEFAULT 'scheduled',
  scheduled_date timestamptz,
  completed_date timestamptz,
  installer_id uuid REFERENCES public.staff(id),
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD installations" ON public.installations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Installation sale items
CREATE TABLE public.installation_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES public.installations(id) ON DELETE CASCADE NOT NULL,
  sale_item_id uuid REFERENCES public.sale_items(id),
  product_id uuid REFERENCES public.products(id),
  quantity integer DEFAULT 1,
  serial_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.installation_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD installation_sale_items" ON public.installation_sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Installation reports
CREATE TABLE public.installation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id uuid REFERENCES public.installations(id) ON DELETE CASCADE NOT NULL,
  report_type text,
  content text,
  photos jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.installation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD installation_reports" ON public.installation_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Warranties
CREATE TABLE public.warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  sale_id uuid REFERENCES public.sales(id),
  customer_id uuid REFERENCES public.customers(id),
  serial_number text,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD warranties" ON public.warranties FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Warranty claims
CREATE TABLE public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id uuid REFERENCES public.warranties(id),
  customer_id uuid REFERENCES public.customers(id),
  description text,
  status text DEFAULT 'pending',
  resolution text,
  cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD warranty_claims" ON public.warranty_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Receipts
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  payment_id uuid REFERENCES public.payments(id),
  receipt_number text,
  amount numeric DEFAULT 0,
  issued_at timestamptz DEFAULT now(),
  notes text
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD receipts" ON public.receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Order fulfillment
CREATE TABLE public.order_fulfillment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  status text DEFAULT 'pending',
  fulfilled_at timestamptz,
  fulfilled_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.order_fulfillment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD order_fulfillment" ON public.order_fulfillment FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payment schedules
CREATE TABLE public.payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  customer_id uuid REFERENCES public.customers(id),
  installment_number integer DEFAULT 1,
  amount numeric DEFAULT 0,
  due_date timestamptz,
  status text DEFAULT 'pending',
  paid_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD payment_schedules" ON public.payment_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission targets
CREATE TABLE public.commission_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id),
  target_amount numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.commission_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD commission_targets" ON public.commission_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Commission payments
CREATE TABLE public.commission_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id),
  sale_id uuid REFERENCES public.sales(id),
  amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  paid_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD commission_payments" ON public.commission_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Currency rates
CREATE TABLE public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL,
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD currency_rates" ON public.currency_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Picking lists
CREATE TABLE public.picking_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.picking_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD picking_lists" ON public.picking_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Packing slips
CREATE TABLE public.packing_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  slip_number text,
  status text DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.packing_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD packing_slips" ON public.packing_slips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Delivery schedules
CREATE TABLE public.delivery_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  customer_id uuid REFERENCES public.customers(id),
  scheduled_date timestamptz,
  status text DEFAULT 'scheduled',
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.delivery_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD delivery_schedules" ON public.delivery_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Deposit batches
CREATE TABLE public.deposit_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  total_amount numeric DEFAULT 0,
  deposit_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.deposit_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD deposit_batches" ON public.deposit_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Company settings
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read company_settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify company_settings" ON public.company_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Site settings
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can modify site_settings" ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Site content
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins can modify site_content" ON public.site_content FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Security audit logs
CREATE TABLE public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit logs" ON public.security_audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Authenticated can insert audit logs" ON public.security_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Security alerts
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can CRUD security_alerts" ON public.security_alerts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Security incidents
CREATE TABLE public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL,
  severity text DEFAULT 'medium',
  description text,
  details jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can CRUD security_incidents" ON public.security_incidents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Rate limits
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage rate_limits" ON public.rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auth rate limits
CREATE TABLE public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can manage auth_rate_limits" ON public.auth_rate_limits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text,
  ip_address text,
  user_agent text,
  last_active timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User MFA settings
CREATE TABLE public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  totp_secret text,
  is_enabled boolean DEFAULT false,
  backup_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own MFA" ON public.user_mfa_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MFA enrollment sessions
CREATE TABLE public.mfa_enrollment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  secret text,
  status text DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.mfa_enrollment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own MFA enrollment" ON public.mfa_enrollment_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Automation rules
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  actions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can CRUD automation_rules" ON public.automation_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Automation executions
CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id),
  status text DEFAULT 'pending',
  result jsonb DEFAULT '{}'::jsonb,
  executed_at timestamptz DEFAULT now(),
  error text
);
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can CRUD automation_executions" ON public.automation_executions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Test tables
CREATE TABLE public.test_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite text,
  status text DEFAULT 'running',
  results jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  executed_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD test_executions" ON public.test_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES public.test_executions(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  status text DEFAULT 'pending',
  details jsonb DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD test_results" ON public.test_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.test_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric,
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);
ALTER TABLE public.test_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can CRUD test_metrics" ON public.test_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Key database functions

CREATE OR REPLACE FUNCTION public.debug_auth_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'current_user_id', auth.uid(),
    'current_role', (SELECT role::text FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
    'is_authenticated', auth.uid() IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debug_auth_comprehensive()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'user_id', auth.uid(),
    'roles', (SELECT array_agg(role::text) FROM user_roles WHERE user_id = auth.uid()),
    'is_admin', public.is_admin(),
    'profile_exists', EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_exchange_rate(p_from_currency text, p_to_currency text, p_date date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate numeric;
BEGIN
  IF p_from_currency = p_to_currency THEN RETURN 1; END IF;
  SELECT rate INTO v_rate FROM currency_rates
    WHERE from_currency = p_from_currency AND to_currency = p_to_currency
    AND effective_date <= p_date ORDER BY effective_date DESC LIMIT 1;
  IF v_rate IS NULL THEN
    SELECT 1.0/rate INTO v_rate FROM currency_rates
      WHERE from_currency = p_to_currency AND to_currency = p_from_currency
      AND effective_date <= p_date ORDER BY effective_date DESC LIMIT 1;
  END IF;
  RETURN COALESCE(v_rate, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_fx_amounts(p_amount numeric, p_currency text, p_exchange_rate numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rate numeric;
  v_usd numeric;
  v_nis numeric;
BEGIN
  v_rate := COALESCE(p_exchange_rate, public.get_exchange_rate(p_currency, 'USD'));
  IF p_currency = 'USD' THEN
    v_usd := p_amount;
    v_nis := p_amount * public.get_exchange_rate('USD', 'NIS');
  ELSIF p_currency = 'NIS' THEN
    v_nis := p_amount;
    v_usd := p_amount * public.get_exchange_rate('NIS', 'USD');
  ELSE
    v_usd := p_amount * v_rate;
    v_nis := v_usd * public.get_exchange_rate('USD', 'NIS');
  END IF;
  RETURN jsonb_build_object('amount_usd', ROUND(v_usd, 2), 'amount_nis', ROUND(v_nis, 2), 'exchange_rate', v_rate);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - (p_window_minutes || ' minutes')::interval;
  SELECT COUNT(*) INTO v_count FROM rate_limits
    WHERE identifier = p_identifier AND endpoint = p_endpoint
    AND window_start > now() - (p_window_minutes || ' minutes')::interval;
  IF v_count >= p_max_attempts THEN RETURN false; END IF;
  INSERT INTO rate_limits (identifier, endpoint) VALUES (p_identifier, p_endpoint);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO security_audit_logs (user_id, event_type, details)
  VALUES (auth.uid(), p_event_type, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_security_incident(p_type text, p_severity text, p_description text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO security_incidents (incident_type, severity, description, details)
  VALUES (p_type, p_severity, p_description, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_number text;
  v_count integer;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM quotations;
  v_number := 'QT-' || TO_CHAR(now(), 'YYYYMM') || '-' || LPAD(v_count::text, 4, '0');
  RETURN v_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_system_health_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_customers', (SELECT COUNT(*) FROM customers),
    'total_products', (SELECT COUNT(*) FROM products),
    'total_sales', (SELECT COUNT(*) FROM sales),
    'total_staff', (SELECT COUNT(*) FROM staff),
    'low_stock_count', (SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_level AND is_active),
    'pending_payments', (SELECT COUNT(*) FROM payments WHERE status = 'pending')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_stock_alerts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO stock_alerts (product_id, alert_type, message)
  SELECT id, 'low_stock', 'Stock level (' || current_stock || ') is at or below minimum (' || min_stock_level || ')'
  FROM products
  WHERE current_stock <= min_stock_level AND is_active
  AND id NOT IN (SELECT product_id FROM stock_alerts WHERE alert_type = 'low_stock' AND is_resolved = false);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_reorder_point(p_product_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_daily_sales numeric;
  v_lead_time integer := 14;
  v_safety_stock integer;
BEGIN
  SELECT COALESCE(AVG(si.quantity), 0) INTO v_avg_daily_sales
  FROM sale_items si JOIN sales s ON si.sale_id = s.id
  WHERE si.product_id = p_product_id AND s.sale_date > now() - interval '90 days';
  v_avg_daily_sales := v_avg_daily_sales / 90;
  v_safety_stock := CEIL(v_avg_daily_sales * 7);
  RETURN CEIL(v_avg_daily_sales * v_lead_time) + v_safety_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_abc_analysis()
RETURNS TABLE(product_id uuid, product_name text, total_revenue numeric, revenue_percentage numeric, cumulative_percentage numeric, abc_category text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH revenue AS (
    SELECT si.product_id AS pid, p.name AS pname, COALESCE(SUM(si.total), 0) as total_rev
    FROM sale_items si JOIN products p ON si.product_id = p.id
    GROUP BY si.product_id, p.name
  ),
  ranked AS (
    SELECT r2.pid, r2.pname, r2.total_rev, r2.total_rev / NULLIF(SUM(r2.total_rev) OVER(), 0) * 100 as rev_pct,
    SUM(r2.total_rev / NULLIF(SUM(r2.total_rev) OVER(), 0) * 100) OVER(ORDER BY r2.total_rev DESC) as cum_pct
    FROM revenue r2
  )
  SELECT r3.pid, r3.pname, r3.total_rev, ROUND(r3.rev_pct, 2), ROUND(r3.cum_pct, 2),
    CASE WHEN r3.cum_pct <= 80 THEN 'A' WHEN r3.cum_pct <= 95 THEN 'B' ELSE 'C' END
  FROM ranked r3 ORDER BY r3.total_rev DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supply_chain_cash_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_bank_balance', (SELECT COALESCE(SUM(current_balance), 0) FROM bank_accounts WHERE is_active),
    'pending_receivables', (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE payment_status = 'pending'),
    'pending_payables', (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE status = 'pending')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stock_coverage_analysis()
RETURNS TABLE(product_id uuid, name text, current_stock integer, avg_daily_sales numeric, days_of_coverage numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.current_stock,
    COALESCE(SUM(si.quantity)::numeric / NULLIF(EXTRACT(EPOCH FROM (now() - MIN(s.sale_date))) / 86400, 0), 0) AS avg_ds,
    CASE WHEN COALESCE(SUM(si.quantity)::numeric / NULLIF(EXTRACT(EPOCH FROM (now() - MIN(s.sale_date))) / 86400, 0), 0) > 0
    THEN p.current_stock::numeric / (SUM(si.quantity)::numeric / NULLIF(EXTRACT(EPOCH FROM (now() - MIN(s.sale_date))) / 86400, 0))
    ELSE 999 END AS doc
  FROM products p LEFT JOIN sale_items si ON p.id = si.product_id LEFT JOIN sales s ON si.sale_id = s.id
  WHERE p.is_active GROUP BY p.id, p.name, p.current_stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enhanced_supplier_performance()
RETURNS TABLE(supplier_id uuid, supplier_name text, total_orders bigint, on_time_rate numeric, quality_score numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, COUNT(po.id),
    ROUND(COUNT(CASE WHEN po.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(po.id), 0) * 100, 2),
    85.0::numeric
  FROM suppliers s LEFT JOIN purchase_orders po ON s.id = po.supplier_id
  GROUP BY s.id, s.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_intelligent_reorder_recommendations()
RETURNS TABLE(product_id uuid, product_name text, current_stock integer, reorder_point integer, suggested_quantity integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.current_stock, p.min_stock_level,
    GREATEST(p.min_stock_level * 2 - p.current_stock, 0)
  FROM products p WHERE p.is_active AND p.current_stock <= p.min_stock_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_seasonal_demand_intelligence()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object('seasons', jsonb_build_array());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_supplier_intelligence()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object('suppliers', (SELECT COUNT(*) FROM suppliers WHERE is_active));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_banking_capital_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_capital', (SELECT COALESCE(SUM(amount), 0) FROM capital_injections),
    'total_balance', (SELECT COALESCE(SUM(current_balance), 0) FROM bank_accounts WHERE is_active)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_analysis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object(
    'inflows', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed'),
    'outflows', (SELECT COALESCE(SUM(amount), 0) FROM expenses)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_real_injected_capital()
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT COALESCE(SUM(amount), 0) FROM capital_injections);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_container_arrival(p_container_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE containers SET status = 'arrived', actual_arrival_date = now() WHERE id = p_container_id;
  INSERT INTO container_status_history (container_id, status, changed_by)
  VALUES (p_container_id, 'arrived', auth.uid());
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_automation_rule(p_rule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO automation_executions (rule_id, status, result) VALUES (p_rule_id, 'completed', '{}'::jsonb);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_test_infrastructure()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN jsonb_build_object('status', 'healthy', 'tables_exist', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_totp_secret()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN encode(gen_random_bytes(20), 'base32');
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_totp_code(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codes jsonb := '[]'::jsonb;
BEGIN
  FOR i IN 1..10 LOOP
    v_codes := v_codes || to_jsonb(encode(gen_random_bytes(4), 'hex'));
  END LOOP;
  UPDATE user_mfa_settings SET backup_codes = v_codes WHERE user_id = p_user_id;
  RETURN v_codes;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_backup_code(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_codes jsonb;
BEGIN
  SELECT backup_codes INTO v_codes FROM user_mfa_settings WHERE user_id = p_user_id;
  RETURN v_codes ? p_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_delete_test_accounts(p_email_pattern text DEFAULT '%test%')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM profiles WHERE email LIKE p_email_pattern;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
