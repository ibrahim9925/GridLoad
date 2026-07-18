
-- Sales missing columns
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;

-- Commission targets missing columns
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS bonus_threshold numeric DEFAULT 0;
ALTER TABLE public.commission_targets ADD COLUMN IF NOT EXISTS bonus_rate numeric DEFAULT 0;

-- Container variances missing columns
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS severity text DEFAULT 'low';
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS reported_by uuid REFERENCES auth.users(id);
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS reported_at timestamptz DEFAULT now();
ALTER TABLE public.container_variances ADD COLUMN IF NOT EXISTS resolution_notes text;

-- Order fulfillment missing columns
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'pending';
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.order_fulfillment ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Stock alerts missing columns
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium';
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS threshold_quantity integer DEFAULT 0;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS current_quantity integer DEFAULT 0;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS auto_reorder_suggested boolean DEFAULT false;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES auth.users(id);
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS is_acknowledged boolean DEFAULT false;
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS reorder_quantity integer DEFAULT 0;

-- Inventory valuations missing columns
ALTER TABLE public.inventory_valuations ADD COLUMN IF NOT EXISTS valuation_method text DEFAULT 'weighted_average';
ALTER TABLE public.inventory_valuations ADD COLUMN IF NOT EXISTS market_price numeric DEFAULT 0;
ALTER TABLE public.inventory_valuations ADD COLUMN IF NOT EXISTS last_purchase_price numeric DEFAULT 0;

-- Stock movements missing columns
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS previous_stock integer DEFAULT 0;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS new_stock integer DEFAULT 0;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS location text;

-- Picking lists missing columns
ALTER TABLE public.picking_lists ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.picking_lists ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.picking_lists ADD COLUMN IF NOT EXISTS picking_number text;

-- Packing slips missing columns
ALTER TABLE public.packing_slips ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.packing_slips ADD COLUMN IF NOT EXISTS total_weight numeric DEFAULT 0;
ALTER TABLE public.packing_slips ADD COLUMN IF NOT EXISTS dimensions text;
ALTER TABLE public.packing_slips ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.packing_slips ADD COLUMN IF NOT EXISTS tracking_number text;

-- Delivery schedules missing columns
ALTER TABLE public.delivery_schedules ADD COLUMN IF NOT EXISTS driver text;
ALTER TABLE public.delivery_schedules ADD COLUMN IF NOT EXISTS vehicle text;
ALTER TABLE public.delivery_schedules ADD COLUMN IF NOT EXISTS delivery_time text;
ALTER TABLE public.delivery_schedules ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.delivery_schedules ADD COLUMN IF NOT EXISTS signature_url text;

-- Deposit batches missing columns
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS deposit_reference text;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- Leads missing columns
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS probability numeric DEFAULT 0;

-- Installations missing columns
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.installations ADD COLUMN IF NOT EXISTS contact_name text;

-- Quotation items missing columns
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS description text;

-- Purchase order items missing columns
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Capital injections missing columns
ALTER TABLE public.capital_injections ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.capital_injections ADD COLUMN IF NOT EXISTS investor_name text;

-- Bank ledger missing columns
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;

-- Sale items missing columns
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS serial_number text;

-- Security audit logs missing columns
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info';
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS resource_type text;
ALTER TABLE public.security_audit_logs ADD COLUMN IF NOT EXISTS resource_id text;

-- Automation rules missing columns
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS last_executed_at timestamptz;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS execution_count integer DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS description text;
