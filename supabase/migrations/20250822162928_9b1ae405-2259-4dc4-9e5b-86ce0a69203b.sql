-- Fix the create_installation_from_sale function to use correct enum values

CREATE OR REPLACE FUNCTION public.create_installation_from_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create installation for sales that require installation  
  IF NEW.fulfillment_status IN ('pending') THEN
    INSERT INTO public.installations (
      sale_id,
      customer_id,
      status,
      site_address,
      installation_notes
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      'scheduled',
      NEW.shipping_address,
      'Auto-created from sale #' || COALESCE(NEW.invoice_number, NEW.id::text)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;