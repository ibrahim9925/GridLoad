
-- Add missing columns to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS default_discount_percentage numeric DEFAULT 0;

-- Add missing columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_stock_level integer DEFAULT 1000;

-- Add missing columns to staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0;

-- Add missing columns to commission_payments
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.staff(id);
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS total_commission numeric DEFAULT 0;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS base_commission numeric DEFAULT 0;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS bonus_commission numeric DEFAULT 0;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS period_start timestamptz;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS period_end timestamptz;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS payment_date timestamptz;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS total_sales numeric DEFAULT 0;

-- Add missing columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.staff(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add missing columns to quotations
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;

-- Add missing columns to purchase_orders
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;

-- Add missing columns to containers
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS origin_port text;
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS destination_port text;

-- Add missing columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Add missing columns to installations
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS type text DEFAULT 'standard';
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS duration_hours numeric;
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS rating integer;
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS feedback text;

-- Add missing columns to bank_accounts
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'checking';
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS routing_number text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS iban text;

-- Add missing columns to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_date timestamptz;

-- Add missing columns to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);
