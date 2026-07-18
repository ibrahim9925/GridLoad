-- Phase 1: Financial Infrastructure Enhancement - Multi-Currency Foundation
-- Create currency rates table for daily FX rates
CREATE TABLE public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  from_currency TEXT NOT NULL CHECK (from_currency IN ('USD', 'NIS')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('USD', 'NIS')),
  rate NUMERIC(10,6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date, from_currency, to_currency)
);

-- Create bank accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'NIS')),
  account_number TEXT,
  bank_name TEXT,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bank ledger as canonical financial transaction log
CREATE TABLE public.bank_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'TRANSFER')),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'NIS')),
  exchange_rate NUMERIC(10,6),
  usd_value NUMERIC(15,2),
  nis_value NUMERIC(15,2),
  purpose TEXT,
  reference_number TEXT,
  linked_sale_id UUID REFERENCES public.sales(id),
  linked_payment_id UUID REFERENCES public.payments(id),
  linked_shipment_id UUID REFERENCES public.containers(id),
  linked_batch_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.staff(id)
);

-- Create deposit batches for aggregating sales deposits
CREATE TABLE public.deposit_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_sales_amount NUMERIC(15,2) DEFAULT 0,
  cash_spent NUMERIC(15,2) DEFAULT 0,
  deposited_amount NUMERIC(15,2) DEFAULT 0,
  remaining_to_deposit NUMERIC(15,2) GENERATED ALWAYS AS (total_sales_amount - cash_spent - deposited_amount) STORED,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'NIS')) DEFAULT 'NIS',
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'partial', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.staff(id)
);

-- Create FX gain/loss tracking
CREATE TABLE public.fx_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL, -- 'purchase', 'payment', 'sale', 'revaluation'
  original_amount NUMERIC(15,2) NOT NULL,
  original_currency TEXT NOT NULL CHECK (original_currency IN ('USD', 'NIS')),
  converted_amount NUMERIC(15,2) NOT NULL,
  converted_currency TEXT NOT NULL CHECK (converted_currency IN ('USD', 'NIS')),
  fx_rate_used NUMERIC(10,6) NOT NULL,
  fx_rate_current NUMERIC(10,6),
  fx_gain_loss NUMERIC(15,2),
  reference_table TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add multi-currency support to existing sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NIS' CHECK (currency IN ('USD', 'NIS')),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS total_amount_usd NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS total_amount_nis NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS deposit_batch_id UUID REFERENCES public.deposit_batches(id);

-- Add multi-currency support to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NIS' CHECK (currency IN ('USD', 'NIS')),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10,6),
ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(15,2),
Add COLUMN IF NOT EXISTS amount_nis NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS deposit_batch_id UUID REFERENCES public.deposit_batches(id),
ADD COLUMN IF NOT EXISTS bank_ledger_id UUID REFERENCES public.bank_ledger(id);

-- Add multi-currency support to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'NIS' CHECK (default_currency IN ('USD', 'NIS')),
ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS cost_nis NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS price_nis NUMERIC(10,2);

-- Create indexes for performance
CREATE INDEX idx_currency_rates_date ON public.currency_rates(date, from_currency, to_currency);
CREATE INDEX idx_bank_ledger_account_date ON public.bank_ledger(bank_account_id, date);
CREATE INDEX idx_bank_ledger_linked ON public.bank_ledger(linked_sale_id, linked_payment_id, linked_shipment_id);
CREATE INDEX idx_deposit_batches_dates ON public.deposit_batches(start_date, end_date);
CREATE INDEX idx_fx_transactions_date ON public.fx_transactions(date, transaction_type);

-- Enable RLS on new tables
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for currency_rates (read-only for most users)
CREATE POLICY "Staff can view currency rates" ON public.currency_rates
  FOR SELECT USING (is_admin() OR is_accountant() OR is_sales_rep() OR is_warehouse());

CREATE POLICY "Admins and accountants can manage currency rates" ON public.currency_rates
  FOR ALL USING (is_admin() OR is_accountant());

-- Create RLS policies for bank_accounts
CREATE POLICY "Financial staff can view bank accounts" ON public.bank_accounts
  FOR SELECT USING (is_admin() OR is_accountant());

CREATE POLICY "Admins and accountants can manage bank accounts" ON public.bank_accounts
  FOR ALL USING (is_admin() OR is_accountant());

-- Create RLS policies for bank_ledger
CREATE POLICY "Financial staff can view bank ledger" ON public.bank_ledger
  FOR SELECT USING (is_admin() OR is_accountant());

CREATE POLICY "Admins and accountants can manage bank ledger" ON public.bank_ledger
  FOR ALL USING (is_admin() OR is_accountant());

-- Create RLS policies for deposit_batches
CREATE POLICY "Financial staff can view deposit batches" ON public.deposit_batches
  FOR SELECT USING (is_admin() OR is_accountant() OR is_sales_rep());

CREATE POLICY "Admins and accountants can manage deposit batches" ON public.deposit_batches
  FOR ALL USING (is_admin() OR is_accountant());

-- Create RLS policies for fx_transactions
CREATE POLICY "Financial staff can view FX transactions" ON public.fx_transactions
  FOR SELECT USING (is_admin() OR is_accountant());

CREATE POLICY "System can manage FX transactions" ON public.fx_transactions
  FOR ALL USING (is_admin() OR is_accountant());

-- Create function to get current exchange rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rate NUMERIC;
BEGIN
  -- If same currency, return 1
  IF p_from_currency = p_to_currency THEN
    RETURN 1.0;
  END IF;
  
  -- Get rate from currency_rates table
  SELECT cr.rate INTO rate
  FROM public.currency_rates cr
  WHERE cr.from_currency = p_from_currency
    AND cr.to_currency = p_to_currency
    AND cr.date <= p_date
  ORDER BY cr.date DESC
  LIMIT 1;
  
  -- If no rate found, try reverse rate
  IF rate IS NULL THEN
    SELECT (1.0 / cr.rate) INTO rate
    FROM public.currency_rates cr
    WHERE cr.from_currency = p_to_currency
      AND cr.to_currency = p_from_currency
      AND cr.date <= p_date
    ORDER BY cr.date DESC
    LIMIT 1;
  END IF;
  
  -- Return rate or default if none found
  RETURN COALESCE(rate, 1.0);
END;
$$;

-- Create function to calculate FX amounts
CREATE OR REPLACE FUNCTION public.calculate_fx_amounts(
  p_amount NUMERIC,
  p_currency TEXT,
  p_exchange_rate NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  usd_rate NUMERIC;
  nis_rate NUMERIC;
BEGIN
  -- Use provided rate or get current rate
  IF p_exchange_rate IS NULL THEN
    IF p_currency = 'USD' THEN
      usd_rate := get_exchange_rate('USD', 'NIS');
      nis_rate := 1.0;
    ELSE
      usd_rate := 1.0;
      nis_rate := get_exchange_rate('NIS', 'USD');
    END IF;
  ELSE
    IF p_currency = 'USD' THEN
      usd_rate := p_exchange_rate;
      nis_rate := 1.0;
    ELSE
      usd_rate := 1.0;
      nis_rate := p_exchange_rate;
    END IF;
  END IF;
  
  -- Calculate amounts
  result := jsonb_build_object(
    'amount_usd', CASE WHEN p_currency = 'USD' THEN p_amount ELSE p_amount * nis_rate END,
    'amount_nis', CASE WHEN p_currency = 'NIS' THEN p_amount ELSE p_amount * usd_rate END,
    'exchange_rate', CASE WHEN p_currency = 'USD' THEN usd_rate ELSE nis_rate END
  );
  
  RETURN result;
END;
$$;

-- Insert default currency rates (user can update these)
INSERT INTO public.currency_rates (date, from_currency, to_currency, rate) VALUES
  (CURRENT_DATE, 'USD', 'NIS', 3.70),
  (CURRENT_DATE, 'NIS', 'USD', 0.27)
ON CONFLICT (date, from_currency, to_currency) DO NOTHING;