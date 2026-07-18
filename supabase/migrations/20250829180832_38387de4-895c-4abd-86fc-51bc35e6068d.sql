-- Re-enable RLS and create proper policies
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "sale_items_authenticated_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_authenticated_insert" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_authenticated_update" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_authenticated_delete" ON public.sale_items;

-- Create proper RLS policies using direct staff table lookup
CREATE POLICY "sale_items_staff_access" ON public.sale_items
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep', 'warehouse', 'accountant')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.id = auth.uid() 
    AND staff.is_active = true
    AND staff.role IN ('admin', 'sales_rep')
  )
);