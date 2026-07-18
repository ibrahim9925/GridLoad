ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS contact_person text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lead_time_days integer DEFAULT 14,
ADD COLUMN IF NOT EXISTS quality_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_order_amount numeric DEFAULT 0;