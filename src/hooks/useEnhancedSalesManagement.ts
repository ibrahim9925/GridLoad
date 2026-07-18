// @ts-nocheck
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MultiCurrencySale {
  id: string;
  customer_id: string;
  sale_date: string;
  currency: string;
  exchange_rate?: number;
  total_amount: number;
  total_amount_usd?: number;
  total_amount_nis?: number;
  total_paid: number;
  balance_due: number;
  payment_status: string;
  deposit_batch_id?: string;
  invoice_number?: string;
  notes?: string;
  customer?: any;
  sale_items?: any[];
}

export interface MultiCurrencyPayment {
  id: string;
  sale_id: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  amount_usd?: number;
  amount_nis?: number;
  payment_date: string;
  payment_method: string;
  deposit_batch_id?: string;
  bank_ledger_id?: string;
  reference_number?: string;
  notes?: string;
}

export const useEnhancedSalesManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Create sale with multi-currency support
  const createMultiCurrencySale = useCallback(async (saleData: {
    customer_id: string;
    currency: string;
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      serial?: string;
    }>;
    exchange_rate?: number;
    notes?: string;
  }) => {
    try {
      setIsLoading(true);
      
      // Calculate totals
      const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Get exchange rate if not provided
      let exchangeRate = saleData.exchange_rate;
      if (!exchangeRate) {
        const { data: rate } = await supabase.rpc('get_exchange_rate', {
          p_from_currency: saleData.currency,
          p_to_currency: saleData.currency === 'USD' ? 'NIS' : 'USD'
        });
        exchangeRate = rate || 1.0;
      }

      // Calculate FX amounts
      const { data: fxAmounts } = await supabase.rpc('calculate_fx_amounts', {
        p_amount: subtotal,
        p_currency: saleData.currency,
        p_exchange_rate: exchangeRate
      });

      const fxData = fxAmounts as any;

      // Generate invoice number
      const invoiceNumber = `S${Date.now().toString().slice(-6)}`;

      // Create sale header
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: saleData.customer_id,
          sale_date: new Date().toISOString().split('T')[0],
          currency: saleData.currency,
          exchange_rate: exchangeRate,
          total_amount: subtotal,
          total_amount_usd: fxData?.amount_usd || subtotal,
          total_amount_nis: fxData?.amount_nis || subtotal,
          total_paid: 0,
          balance_due: subtotal,
          payment_status: 'unpaid',
          invoice_number: invoiceNumber,
          notes: saleData.notes
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = saleData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
        serial_number: item.serial
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Sale created successfully",
        description: `Invoice ${invoiceNumber} created for ${fxData?.amount_nis?.toLocaleString()} NIS`
      });

      return sale;
    } catch (error: any) {
      console.error('Error creating multi-currency sale:', error);
      toast({
        variant: "destructive",
        title: "Error creating sale",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Create payment with multi-currency support
  const createMultiCurrencyPayment = useCallback(async (paymentData: {
    sale_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    exchange_rate?: number;
    deposit_batch_id?: string;
    create_bank_entry?: boolean;
    bank_account_id?: string;
    reference_number?: string;
    notes?: string;
  }) => {
    try {
      setIsLoading(true);

      // Get exchange rate if not provided
      let exchangeRate = paymentData.exchange_rate;
      if (!exchangeRate) {
        const { data: rate } = await supabase.rpc('get_exchange_rate', {
          p_from_currency: paymentData.currency,
          p_to_currency: paymentData.currency === 'USD' ? 'NIS' : 'USD'
        });
        exchangeRate = rate || 1.0;
      }

      // Calculate FX amounts
      const { data: fxAmounts } = await supabase.rpc('calculate_fx_amounts', {
        p_amount: paymentData.amount,
        p_currency: paymentData.currency,
        p_exchange_rate: exchangeRate
      });

      const fxData = fxAmounts as any;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          sale_id: paymentData.sale_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          exchange_rate: exchangeRate,
          amount_usd: fxData?.amount_usd,
          amount_nis: fxData?.amount_nis,
          payment_method: paymentData.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          deposit_batch_id: paymentData.deposit_batch_id,
          reference_number: paymentData.reference_number,
          notes: paymentData.notes
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create bank ledger entry if requested
      if (paymentData.create_bank_entry && paymentData.bank_account_id) {
        const { error: bankError } = await supabase
          .from('bank_ledger')
          .insert([{
            date: new Date().toISOString().split('T')[0],
            bank_account_id: paymentData.bank_account_id,
            transaction_type: 'IN',
            amount: paymentData.amount,
            currency: paymentData.currency,
            exchange_rate: exchangeRate,
            usd_value: fxData?.amount_usd,
            nis_value: fxData?.amount_nis,
            purpose: `Payment for sale ${paymentData.sale_id}`,
            linked_payment_id: payment.id,
            linked_sale_id: paymentData.sale_id,
            reference_number: paymentData.reference_number,
            notes: paymentData.notes
          }]);

        if (bankError) throw bankError;

        // Update bank account balance manually
        const balanceChange = fxData?.amount_nis || paymentData.amount;
        const { data: currentBalance } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', paymentData.bank_account_id)
          .single();
        
        if (currentBalance) {
          const newBalance = currentBalance.current_balance + balanceChange;
          await supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', paymentData.bank_account_id);
        }
      }

      // Update sale totals and payment status
      await updateSalePaymentStatus(paymentData.sale_id);

      toast({
        title: "Payment recorded",
        description: `Payment of ${fxData?.amount_nis?.toLocaleString()} NIS recorded successfully`
      });

      return payment;
    } catch (error: any) {
      console.error('Error creating multi-currency payment:', error);
      toast({
        variant: "destructive",
        title: "Error recording payment",
        description: error.message
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Update sale payment status
  const updateSalePaymentStatus = useCallback(async (saleId: string) => {
    try {
      // Get total payments for this sale
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount_nis, amount')
        .eq('sale_id', saleId);

      if (paymentsError) throw paymentsError;

      const totalPaid = payments?.reduce((sum: number, payment: any) => sum + (payment.amount_nis || payment.amount), 0) || 0;

      // Get sale total
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('total_amount_nis, total_amount')
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      const saleTotal = sale.total_amount_nis || sale.total_amount;
      const balanceDue = saleTotal - totalPaid;
      
      let paymentStatus = 'unpaid';
      if (totalPaid >= saleTotal) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial_paid';
      }

      // Update sale
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          total_paid: totalPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus
        })
        .eq('id', saleId);

      if (updateError) throw updateError;
    } catch (error: any) {
      console.error('Error updating sale payment status:', error);
    }
  }, []);

  // Fetch sales with multi-currency support
  const fetchMultiCurrencySales = useCallback(async (filters?: {
    customer_id?: string;
    payment_status?: string;
    currency?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(*),
          sale_items(*)
        `)
        .order('sale_date', { ascending: false });

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters?.currency) {
        query = query.eq('currency', filters.currency);
      }
      if (filters?.date_from) {
        query = query.gte('sale_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('sale_date', filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Error fetching multi-currency sales:', error);
      toast({
        variant: "destructive",
        title: "Error fetching sales",
        description: error.message
      });
      return [];
    }
  }, [toast]);

  return {
    isLoading,
    createMultiCurrencySale,
    createMultiCurrencyPayment,
    updateSalePaymentStatus,
    fetchMultiCurrencySales
  };
};