// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CurrencyRate {
  id: string;
  date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
}

export interface BankAccount {
  id: string;
  name: string;
  currency: string;
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

export interface BankLedgerEntry {
  id: string;
  date: string;
  bank_account_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  usd_value?: number;
  nis_value?: number;
  purpose?: string;
  reference_number?: string;
  linked_sale_id?: string;
  linked_payment_id?: string;
  notes?: string;
  bank_account?: any;
}

export interface DepositBatch {
  id: string;
  batch_number: string;
  start_date: string;
  end_date: string;
  total_sales_amount: number;
  cash_spent: number;
  deposited_amount: number;
  remaining_to_deposit: number;
  currency: string;
  status: string;
}

export const useMultiCurrencyFinancials = () => {
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankLedgerEntries, setBankLedgerEntries] = useState<BankLedgerEntry[]>([]);
  const [depositBatches, setDepositBatches] = useState<DepositBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch current exchange rate
  const fetchExchangeRate = useCallback(async (fromCurrency: string, toCurrency: string, date?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_exchange_rate', {
        p_from_currency: fromCurrency,
        p_to_currency: toCurrency,
        p_date: date || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      return data || 1.0;
    } catch (error: any) {
      console.error('Error fetching exchange rate:', error);
      toast({
        variant: "destructive",
        title: "Error fetching exchange rate",
        description: error.message
      });
      return 1.0;
    }
  }, [toast]);

  // Calculate FX amounts
  const calculateFxAmounts = useCallback(async (amount: number, currency: string, exchangeRate?: number) => {
    try {
      const { data, error } = await supabase.rpc('calculate_fx_amounts', {
        p_amount: amount,
        p_currency: currency,
        p_exchange_rate: exchangeRate
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error calculating FX amounts:', error);
      return {
        amount_usd: currency === 'USD' ? amount : amount * 0.27,
        amount_nis: currency === 'NIS' ? amount : amount * 3.70,
        exchange_rate: exchangeRate || (currency === 'USD' ? 3.70 : 0.27)
      };
    }
  }, []);

  // Fetch currency rates
  const fetchCurrencyRates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('currency_rates')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setCurrencyRates(data || []);
    } catch (error: any) {
      console.error('Error fetching currency rates:', error);
      toast({
        variant: "destructive",
        title: "Error fetching currency rates",
        description: error.message
      });
    }
  }, [toast]);

  // Fetch bank accounts
  const fetchBankAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      toast({
        variant: "destructive",
        title: "Error fetching bank accounts",
        description: error.message
      });
    }
  }, [toast]);

  // Fetch bank ledger entries
  const fetchBankLedgerEntries = useCallback(async (limit = 100) => {
    try {
      const { data, error } = await supabase
        .from('bank_ledger')
        .select(`
          *,
          bank_account:bank_accounts(*)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setBankLedgerEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching bank ledger entries:', error);
      toast({
        variant: "destructive",
        title: "Error fetching bank ledger",
        description: error.message
      });
    }
  }, [toast]);

  // Fetch deposit batches
  const fetchDepositBatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_batches')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setDepositBatches(data || []);
    } catch (error: any) {
      console.error('Error fetching deposit batches:', error);
      toast({
        variant: "destructive",
        title: "Error fetching deposit batches",
        description: error.message
      });
    }
  }, [toast]);

  // Create bank account
  const createBankAccount = useCallback(async (accountData: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert([accountData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Bank account created",
        description: `${accountData.name} has been created successfully`
      });

      await fetchBankAccounts();
      return data;
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      toast({
        variant: "destructive",
        title: "Error creating bank account",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchBankAccounts, toast]);

  // Create bank ledger entry
  const createBankLedgerEntry = useCallback(async (entryData: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bank_ledger')
        .insert([entryData])
        .select()
        .single();

      if (error) throw error;

      // Update bank account balance
      const balanceChange = entryData.transaction_type === 'IN' ? entryData.amount : -entryData.amount!;
      const { data: currentBalance } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', entryData.bank_account_id)
        .single();
      
      if (currentBalance) {
        const newBalance = currentBalance.current_balance + balanceChange;
        await supabase
          .from('bank_accounts')
          .update({ current_balance: newBalance })
          .eq('id', entryData.bank_account_id);
      }

      toast({
        title: "Transaction recorded",
        description: `Bank transaction has been recorded successfully`
      });

      await Promise.all([fetchBankLedgerEntries(), fetchBankAccounts()]);
      return data;
    } catch (error: any) {
      console.error('Error creating bank ledger entry:', error);
      toast({
        variant: "destructive",
        title: "Error recording transaction",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchBankLedgerEntries, fetchBankAccounts, toast]);

  // Create deposit batch
  const createDepositBatch = useCallback(async (batchData: any) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deposit_batches')
        .insert([{
          ...batchData,
          batch_number: batchData.batch_number || `DB-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-3)}`
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Deposit batch created",
        description: `Batch ${data.batch_number} has been created`
      });

      await fetchDepositBatches();
      return data;
    } catch (error: any) {
      console.error('Error creating deposit batch:', error);
      toast({
        variant: "destructive",
        title: "Error creating deposit batch",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchDepositBatches, toast]);

  // Update currency rate
  const updateCurrencyRate = useCallback(async (fromCurrency: string, toCurrency: string, rate: number, date?: string) => {
    try {
      setIsLoading(true);
      const rateDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('currency_rates')
        .upsert([{
          date: rateDate,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: rate
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Exchange rate updated",
        description: `${fromCurrency} to ${toCurrency} rate updated to ${rate}`
      });

      await fetchCurrencyRates();
      return data;
    } catch (error: any) {
      console.error('Error updating currency rate:', error);
      toast({
        variant: "destructive",
        title: "Error updating exchange rate",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrencyRates, toast]);

  // Load initial data
  useEffect(() => {
    fetchCurrencyRates();
    fetchBankAccounts();
    fetchBankLedgerEntries();
    fetchDepositBatches();
  }, [fetchCurrencyRates, fetchBankAccounts, fetchBankLedgerEntries, fetchDepositBatches]);

  return {
    currencyRates,
    bankAccounts,
    bankLedgerEntries,
    depositBatches,
    isLoading,
    fetchExchangeRate,
    calculateFxAmounts,
    createBankAccount,
    createBankLedgerEntry,
    createDepositBatch,
    updateCurrencyRate,
    refetch: () => {
      fetchCurrencyRates();
      fetchBankAccounts();
      fetchBankLedgerEntries();
      fetchDepositBatches();
    }
  };
};