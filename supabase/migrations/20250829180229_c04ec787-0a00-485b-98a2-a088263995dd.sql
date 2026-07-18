-- Fix RLS policies for sale_items table
-- First, let's check and fix the sale_items RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "sale_items_full_access" ON public.sale_items;

-- Create new comprehensive policies for sale_items
CREATE POLICY "sale_items_select_policy" 
ON public.sale_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep', 'warehouse', 'accountant')
    AND is_active = true
  )
);

CREATE POLICY "sale_items_insert_policy" 
ON public.sale_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep')
    AND is_active = true
  )
);

CREATE POLICY "sale_items_update_policy" 
ON public.sale_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep')
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep')
    AND is_active = true
  )
);

CREATE POLICY "sale_items_delete_policy" 
ON public.sale_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'sales_rep')
    AND is_active = true
  )
);

-- Also fix any issues with security functions that might be causing problems
-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sales_rep() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;