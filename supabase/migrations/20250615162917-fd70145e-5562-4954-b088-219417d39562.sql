
-- Phase 1: Add missing fields/tables for critical sales and payment features

-- Add tax and delivery charges to sales
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_charges numeric DEFAULT 0;

-- Add receipt URL to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- Create a public "receipts" storage bucket for payment images (if doesn't exist)
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', true)
on conflict (id) do nothing;
