
-- Customers missing columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'regular';

-- Products missing columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT 12;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'unit';

-- Staff missing columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS position text;

-- Sales missing columns
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_date timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0;

-- Commission targets missing columns
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS sales_rep_id uuid REFERENCES public.staff(id);
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS target_period_start timestamptz;
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS target_period_end timestamptz;
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'monthly';
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS actual_sales numeric DEFAULT 0;
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS actual_commission numeric DEFAULT 0;
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Commission payments missing columns
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.commission_payments ADD COLUMN IF NOT EXISTS payment_reference text;

-- Containers missing columns
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS estimated_delivery_date timestamptz;
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS customs_status text;
ALTER TABLE public.containers ADD COLUMN IF NOT EXISTS insurance_value numeric DEFAULT 0;

-- Container variances missing columns
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS container_product_id uuid REFERENCES public.container_products(id);
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS actual_quantity integer DEFAULT 0;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS variance_quantity integer DEFAULT 0;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS variance_value numeric DEFAULT 0;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS resolution text;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Container analytics missing columns
ALTER TABLE public.container_analytics ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
ALTER TABLE public.container_analytics ADD COLUMN IF NOT EXISTS total_transit_days integer;
ALTER TABLE public.container_analytics ADD COLUMN IF NOT EXISTS on_time_delivery boolean;
ALTER TABLE public.container_analytics ADD COLUMN IF NOT EXISTS delivery_variance_days integer;
ALTER TABLE public.container_analytics ADD COLUMN IF NOT EXISTS quality_score numeric;

-- Container products missing columns
ALTER TABLE public.container_products ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
ALTER TABLE public.container_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Purchase orders missing columns
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS received_date timestamptz;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- Quotations missing columns
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS terms text;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS converted_to_sale_id uuid REFERENCES public.sales(id);

-- Warranties missing columns
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS warranty_type text DEFAULT 'standard';
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS coverage_details text;
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS purchase_date timestamptz;

-- Warranty claims missing columns
ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS claim_date timestamptz DEFAULT now();
ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
ALTER TABLE public.warranty_claims ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Leads missing columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contact_date timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS converted_to_customer_id uuid REFERENCES public.customers(id);

-- Installations missing columns
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS warranty_id uuid REFERENCES public.warranties(id);
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS signature_url text;

-- Expenses missing columns
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vendor text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Payment schedules missing columns
ALTER TABLE public.payment_schedules ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id);

-- Bank accounts missing columns
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS swift_code text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0;

-- Receipts missing columns
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS receipt_type text DEFAULT 'payment';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

-- Stock movements missing columns
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS total_value numeric DEFAULT 0;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS batch_number text;
