-- PHASE 1: CRITICAL SECURITY HARDENING - CONTINUED
-- Fix the staff table issue and create comprehensive security framework

-- Ensure the staff table exists and is properly configured
DO $$
BEGIN
    -- Check if the staff table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff') THEN
        CREATE TABLE public.staff (
            id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            email text NOT NULL UNIQUE,
            role user_role NOT NULL DEFAULT 'sales_rep'::user_role,
            is_active boolean NOT NULL DEFAULT true,
            full_name text,
            phone text,
            commission_rate numeric DEFAULT 5.00,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
        
        -- Enable RLS on staff table
        ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;

-- Insert a test admin user only if it doesn't exist (avoid the auth.users dependency issue)
INSERT INTO public.staff (id, email, role, is_active, full_name)
SELECT 
    gen_random_uuid(),
    'admin@gridload.com',
    'admin'::user_role,
    true,
    'System Administrator'
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff WHERE email = 'admin@gridload.com'
);

-- PHASE 2: DATABASE INTEGRITY & CONSTRAINT FIXES
-- Fix all enum constraint violations in testers

-- Add comprehensive validation functions
CREATE OR REPLACE FUNCTION public.validate_enum_value(enum_type text, enum_value text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT enum_value = ANY(enum_range(NULL::user_role)::text[])
  WHERE enum_type = 'user_role'
  UNION
  SELECT enum_value = ANY(enum_range(NULL::lead_status)::text[])
  WHERE enum_type = 'lead_status'
  UNION
  SELECT enum_value = ANY(enum_range(NULL::fulfillment_status)::text[])
  WHERE enum_type = 'fulfillment_status'
  UNION
  SELECT enum_value = ANY(enum_range(NULL::installation_status)::text[])
  WHERE enum_type = 'installation_status'
  UNION
  SELECT enum_value = ANY(enum_range(NULL::carrier)::text[])
  WHERE enum_type = 'carrier'
  UNION
  SELECT enum_value = ANY(enum_range(NULL::expense_category)::text[])
  WHERE enum_type = 'expense_category'
  UNION
  SELECT false; -- Default case
$$;

-- Fix purchase order status validation
UPDATE public.purchase_orders 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'pending', 'ordered', 'received', 'completed', 'cancelled');

-- Add proper constraints for purchase orders
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('draft', 'pending', 'ordered', 'received', 'completed', 'cancelled'));

-- Add comprehensive error handling function for system tests
CREATE OR REPLACE FUNCTION public.safe_test_operation(
    operation_type text,
    test_data jsonb,
    cleanup_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{"success": false, "error": "Unknown error"}'::jsonb;
    cleanup_id uuid;
BEGIN
    CASE operation_type
        WHEN 'create_test_customer' THEN
            INSERT INTO public.customers (contact_person, email, phone, notes)
            VALUES (
                COALESCE(test_data->>'contact_person', 'Test Customer'),
                COALESCE(test_data->>'email', 'test@example.com'),
                COALESCE(test_data->>'phone', '555-0123'),
                'Created by system test'
            )
            RETURNING jsonb_build_object('success', true, 'id', id) INTO result;
            
        WHEN 'create_test_supplier' THEN
            INSERT INTO public.suppliers (name, contact_person, email, phone, is_active)
            VALUES (
                COALESCE(test_data->>'name', 'Test Supplier'),
                COALESCE(test_data->>'contact_person', 'Test Contact'),
                COALESCE(test_data->>'email', 'supplier@example.com'),
                COALESCE(test_data->>'phone', '555-0124'),
                true
            )
            RETURNING jsonb_build_object('success', true, 'id', id) INTO result;
            
        WHEN 'cleanup_test_data' THEN
            -- Clean up test data
            FOREACH cleanup_id IN ARRAY cleanup_ids
            LOOP
                DELETE FROM public.customers WHERE id = cleanup_id AND contact_person LIKE 'Test%';
                DELETE FROM public.suppliers WHERE id = cleanup_id AND name LIKE 'Test%';
                DELETE FROM public.products WHERE id = cleanup_id AND name LIKE 'Test%';
            END LOOP;
            result := '{"success": true, "cleaned": ' || array_length(cleanup_ids, 1) || '}'::jsonb;
            
        ELSE
            result := '{"success": false, "error": "Unknown operation type"}'::jsonb;
    END CASE;
    
    RETURN result;
    
EXCEPTION WHEN others THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$;