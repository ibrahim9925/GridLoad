
-- =========================================================
-- 1. DROP duplicate crm_* tables (unused shadow schema)
-- =========================================================
DROP TABLE IF EXISTS public.crm_customers CASCADE;
DROP TABLE IF EXISTS public.crm_products CASCADE;
DROP TABLE IF EXISTS public.crm_sales CASCADE;
DROP TABLE IF EXISTS public.crm_sales_headers CASCADE;
DROP TABLE IF EXISTS public.crm_payments_in CASCADE;
DROP TABLE IF EXISTS public.crm_payments_out CASCADE;
DROP TABLE IF EXISTS public.crm_bank_ledger CASCADE;
DROP TABLE IF EXISTS public.crm_deposit_bundles CASCADE;
DROP TABLE IF EXISTS public.crm_exchange_rates CASCADE;
DROP TABLE IF EXISTS public.crm_shipments CASCADE;

-- =========================================================
-- 2. DROP legacy social/marketplace tables (unused)
-- =========================================================
DROP TABLE IF EXISTS public.comment_likes CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.post_media CASCADE;
DROP TABLE IF EXISTS public.saved_posts CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.content_reports CASCADE;
DROP TABLE IF EXISTS public.listing_media CASCADE;
DROP TABLE IF EXISTS public.listing_price_tiers CASCADE;
DROP TABLE IF EXISTS public.saved_listings CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.company_members CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;

-- =========================================================
-- 3. Tighten RLS on CRM tables: drop existing policies, add admin-only
-- =========================================================
DO $$
DECLARE
  t text;
  p record;
  crm_tables text[] := ARRAY[
    'auth_rate_limits','automation_executions','automation_rules',
    'bank_accounts','bank_ledger','capital_injections',
    'commission_payments','commission_targets',
    'container_analytics','container_products','container_status_history',
    'container_variances','containers',
    'currency_rates','customers',
    'delivery_schedules','deposit_batches','expenses',
    'installation_reports','installation_sale_items','installations',
    'inventory_valuations','leads',
    'mfa_enrollment_sessions','notifications',
    'order_fulfillment','packing_slips',
    'payment_schedules','payments','picking_lists',
    'po_payments_out','product_serial_numbers','product_suppliers','products',
    'purchase_order_items','purchase_orders',
    'quotation_items','quotations',
    'rate_limits','receipts',
    'sale_items','sales',
    'security_alerts','security_audit_logs','security_incidents',
    'staff','stock_alerts','stock_movements','suppliers',
    'test_executions','test_metrics','test_results',
    'user_mfa_settings','user_sessions',
    'warranties','warranty_claims','warranty_fault_log'
  ];
BEGIN
  FOREACH t IN ARRAY crm_tables LOOP
    -- only act if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      -- drop every existing policy on the table
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      END LOOP;
      -- ensure RLS is on
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- single admin-only ALL policy
      EXECUTE format(
        'CREATE POLICY "Admins full access" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        t
      );
      -- ensure grants exist for authenticated + service_role
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
      -- revoke anon
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END$$;
