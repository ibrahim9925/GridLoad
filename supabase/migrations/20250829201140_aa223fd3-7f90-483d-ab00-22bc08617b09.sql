-- Add delivery company payment flow support
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_company_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expected_payment_date DATE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_company_settled BOOLEAN DEFAULT FALSE;

-- Update payment_status enum to include delivery company status
DO $$ 
BEGIN
    -- Check if the new values already exist in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'delivered_pending_payment' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    ) THEN
        ALTER TYPE payment_status ADD VALUE 'delivered_pending_payment';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'delivery_company_owed' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_status')
    ) THEN
        ALTER TYPE payment_status ADD VALUE 'delivery_company_owed';
    END IF;
END $$;