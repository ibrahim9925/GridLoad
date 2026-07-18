
-- =========================================================
-- STORAGE: lock down buckets, drop public policies
-- =========================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname='storage' AND tablename='objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

-- Admin full access on all locked buckets
CREATE POLICY "Admins manage locked buckets"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id IN ('documents','crm-receipts','crm-pdf-exports','avatars','company-logos','listing-media','post-media','message-attachments')
  AND public.is_admin()
)
WITH CHECK (
  bucket_id IN ('documents','crm-receipts','crm-pdf-exports','avatars','company-logos','listing-media','post-media','message-attachments')
  AND public.is_admin()
);

-- Authenticated staff can read CRM operational files (documents, receipts, pdf exports)
CREATE POLICY "Staff read CRM files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('documents','crm-receipts','crm-pdf-exports'));

-- Authenticated staff can upload CRM files
CREATE POLICY "Staff upload CRM files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('documents','crm-receipts','crm-pdf-exports'));

-- Users manage their own avatar (path begins with their uid)
CREATE POLICY "Users manage own avatar"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can read avatars + company logos (still requires auth, no anon)
CREATE POLICY "Authenticated read avatars and logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','company-logos'));

-- =========================================================
-- RBAC helpers: convenience role checks
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_any_role(_roles app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = ANY(_roles)
  );
$$;

-- =========================================================
-- TIGHTEN RLS ON CRM TABLES
-- Drop existing admin-only / allow_all policies, replace with role-aware policies
-- =========================================================

-- Helper: drop all policies on a given public table
DO $$
DECLARE
  t text;
  pol record;
  tables text[] := ARRAY[
    'customers','sales','sale_items','payments','bank_ledger',
    'expenses','purchase_orders','purchase_order_items',
    'products','stock_movements','installations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END$$;

-- ----- CUSTOMERS: admin full; sales_rep r/w; installer read -----
CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "customers_sales_rw" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales_rep'))
  WITH CHECK (public.has_role(auth.uid(), 'sales_rep'));
CREATE POLICY "customers_accountant_read" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "customers_installer_read" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'installer'));

-- ----- SALES: admin full; sales_rep r/w; accountant read -----
CREATE POLICY "sales_admin_all" ON public.sales
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sales_sales_rw" ON public.sales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales_rep'))
  WITH CHECK (public.has_role(auth.uid(), 'sales_rep'));
CREATE POLICY "sales_accountant_read" ON public.sales
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));

-- ----- SALE_ITEMS: mirrors sales -----
CREATE POLICY "sale_items_admin_all" ON public.sale_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sale_items_sales_rw" ON public.sale_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'sales_rep'))
  WITH CHECK (public.has_role(auth.uid(), 'sales_rep'));
CREATE POLICY "sale_items_accountant_read" ON public.sale_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));

-- ----- PAYMENTS: admin full; accountant r/w; sales_rep read -----
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "payments_accountant_rw" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'))
  WITH CHECK (public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "payments_sales_read" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales_rep'));

-- ----- BANK_LEDGER: admin full; accountant read -----
CREATE POLICY "bank_ledger_admin_all" ON public.bank_ledger
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "bank_ledger_accountant_read" ON public.bank_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));

-- ----- EXPENSES: admin full; accountant r/w -----
CREATE POLICY "expenses_admin_all" ON public.expenses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "expenses_accountant_rw" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'))
  WITH CHECK (public.has_role(auth.uid(), 'accountant'));

-- ----- PURCHASE_ORDERS: admin full; accountant read; warehouse read -----
CREATE POLICY "po_admin_all" ON public.purchase_orders
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "po_accountant_read" ON public.purchase_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "po_warehouse_read" ON public.purchase_orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'warehouse'));

CREATE POLICY "poi_admin_all" ON public.purchase_order_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "poi_accountant_read" ON public.purchase_order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "poi_warehouse_read" ON public.purchase_order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'warehouse'));

-- ----- PRODUCTS: admin full; warehouse r/w; sales_rep read; installer read -----
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "products_warehouse_rw" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'warehouse'))
  WITH CHECK (public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "products_staff_read" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['sales_rep','accountant','installer']::app_role[]));

-- ----- STOCK_MOVEMENTS: admin full; warehouse r/w -----
CREATE POLICY "stock_admin_all" ON public.stock_movements
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "stock_warehouse_rw" ON public.stock_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'warehouse'))
  WITH CHECK (public.has_role(auth.uid(), 'warehouse'));

-- ----- INSTALLATIONS: admin full; installer read -----
CREATE POLICY "installations_admin_all" ON public.installations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "installations_installer_read" ON public.installations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'installer'));
