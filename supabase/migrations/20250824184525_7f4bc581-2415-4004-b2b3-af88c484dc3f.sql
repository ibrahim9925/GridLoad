-- Fix security warnings: Set immutable search_path for functions that don't have it

-- Fix functions that are missing SET search_path
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.update_order_fulfillment_status() SET search_path TO 'public';
ALTER FUNCTION public.update_stock_on_sale() SET search_path TO 'public';
ALTER FUNCTION public.check_warranty_expiry() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path TO 'public';