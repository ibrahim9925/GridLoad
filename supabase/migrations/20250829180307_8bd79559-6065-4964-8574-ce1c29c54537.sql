-- Check current user's role and permissions
SELECT 
  s.id,
  s.email,
  s.role,
  s.is_active,
  auth.uid() as current_auth_uid
FROM public.staff s 
WHERE s.id = auth.uid();

-- Test if the user can actually access the staff table
SELECT 'staff_access_test' as test;