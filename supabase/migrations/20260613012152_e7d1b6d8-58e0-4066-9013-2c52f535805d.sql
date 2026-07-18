-- Reset bank balances and clear test ledger entries.
-- All bank accounts will start at zero until real transactions are entered.
DELETE FROM public.bank_ledger;
UPDATE public.bank_accounts SET current_balance = 0, opening_balance = 0, updated_at = now();