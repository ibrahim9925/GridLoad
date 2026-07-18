-- Drop all existing staff policies to start clean
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;
DROP POLICY IF EXISTS "Staff can update own record" ON public.staff;
DROP POLICY IF EXISTS "Allow signup inserts" ON public.staff;
DROP POLICY IF EXISTS "Admin can delete staff" ON public.staff;
DROP POLICY IF EXISTS "Users can view own staff record" ON public.staff;
DROP POLICY IF EXISTS "System can create staff records" ON public.staff;
DROP POLICY IF EXISTS "Users can update own staff record" ON public.staff;

-- Create simple, working policies
CREATE POLICY "Enable all access for authenticated users" 
ON public.staff 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Also allow system to create records during signup
CREATE POLICY "Allow system signup" 
ON public.staff 
FOR INSERT 
WITH CHECK (true);