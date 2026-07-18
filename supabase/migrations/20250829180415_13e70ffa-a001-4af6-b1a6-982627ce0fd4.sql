-- Create a temporary simple policy for testing sales creation
DROP POLICY IF EXISTS "sale_items_select_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_update_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete_policy" ON public.sale_items;

-- Simple policies that allow authenticated users
CREATE POLICY "sale_items_authenticated_select" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_items_authenticated_insert" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sale_items_authenticated_update" ON public.sale_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sale_items_authenticated_delete" ON public.sale_items FOR DELETE TO authenticated USING (true);