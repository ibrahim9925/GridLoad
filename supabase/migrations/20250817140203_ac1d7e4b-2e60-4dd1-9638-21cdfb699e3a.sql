-- Fix the staff table RLS policy without TG_OP reference
DROP POLICY IF EXISTS "Staff table access" ON public.staff;

-- Create separate policies for different operations
CREATE POLICY "Staff can view own record" 
ON public.staff 
FOR SELECT 
USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Staff can update own record" 
ON public.staff 
FOR UPDATE 
USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Allow signup inserts" 
ON public.staff 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can delete staff" 
ON public.staff 
FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid() AND role = 'admin'));