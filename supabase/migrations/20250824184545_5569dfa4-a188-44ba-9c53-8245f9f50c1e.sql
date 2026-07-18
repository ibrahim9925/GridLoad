-- Fix remaining functions with mutable search_path
ALTER FUNCTION public.update_container_product_total() SET search_path TO 'public';
ALTER FUNCTION public.update_container_total() SET search_path TO 'public';
ALTER FUNCTION public.update_container_cost_on_products() SET search_path TO 'public';
ALTER FUNCTION public.log_admin_action() SET search_path TO 'public';