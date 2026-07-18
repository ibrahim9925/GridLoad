-- Fix the last function with mutable search_path
ALTER FUNCTION public.is_staff_admin() SET search_path TO 'public';