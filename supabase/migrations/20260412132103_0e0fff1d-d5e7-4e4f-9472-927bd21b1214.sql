
-- warranties: add missing date columns
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS warranty_start_date date;
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS warranty_end_date date;
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS warranty_period_months integer DEFAULT 12;

-- bank_ledger: add date column and document/linking columns
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS document_url text;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS usd_value numeric DEFAULT 0;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS nis_value numeric DEFAULT 0;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS linked_sale_id uuid;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS linked_payment_id uuid;
ALTER TABLE public.bank_ledger ADD COLUMN IF NOT EXISTS notes text;

-- bank_accounts: add name alias column
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS name text;

-- deposit_batches: add missing columns
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS start_date timestamptz;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS cash_spent numeric DEFAULT 0;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS deposited_amount numeric DEFAULT 0;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS remaining_to_deposit numeric DEFAULT 0;
ALTER TABLE public.deposit_batches ADD COLUMN IF NOT EXISTS total_sales_amount numeric DEFAULT 0;

-- expenses: add source linking
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS source_id uuid;

-- po_payments_out: add document_url
ALTER TABLE public.po_payments_out ADD COLUMN IF NOT EXISTS document_url text;

-- payments: add document_url
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS document_url text;

-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');
