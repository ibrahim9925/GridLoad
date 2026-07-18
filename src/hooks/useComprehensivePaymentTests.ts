// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useComprehensivePaymentTests = () => {
  const createComprehensivePaymentTests = (): BusinessTest[] => [
    {
      name: "Full Cash Payment (NIS)",
      category: "Payment Processing",
      description: "Test full payment processing in NIS currency",
      module: "Payments",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get unpaid sale
          const { data: sale } = await supabase
            .from('sales')
            .select('id, total_amount, customer_id')
            .eq('payment_status', 'pending')
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No unpaid sales found for payment test",
              duration: Date.now() - startTime,
              testName: "Full Cash Payment (NIS)",
              category: "Payment Processing",
              priority: "Critical",
              module: "Payments"
            };
          }

          // Process full payment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: sale.total_amount,
              payment_method: 'cash',
              payment_date: new Date().toISOString().split('T')[0],
              currency: 'NIS',
              reference_number: `CASH-${Date.now()}`,
              notes: 'Full cash payment test'
            })
            .select()
            .single();

          if (paymentError) {
            return {
              success: false,
              message: "Failed to create payment record",
              error: paymentError.message,
              duration: Date.now() - startTime,
              testName: "Full Cash Payment (NIS)",
              category: "Payment Processing",
              priority: "Critical",
              module: "Payments"
            };
          }

          // Update sale payment status
          const { error: updateError } = await supabase
            .from('sales')
            .update({
              payment_status: 'paid',
              total_paid: sale.total_amount,
              balance_due: 0
            })
            .eq('id', sale.id);

          return {
            success: !updateError,
            message: updateError ? "Payment created but failed to update sale status" : "Full cash payment processed successfully",
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              saleId: sale.id,
              paymentId: payment.id,
              amount: sale.total_amount,
              currency: 'NIS'
            },
            testName: "Full Cash Payment (NIS)",
            category: "Payment Processing",
            priority: "Critical",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Full cash payment test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Full Cash Payment (NIS)",
            category: "Payment Processing",
            priority: "Critical",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Full Bank Transfer Payment (USD)",
      category: "Payment Processing",
      description: "Test full payment via bank transfer in USD with currency conversion",
      module: "Payments",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get unpaid sale
          const { data: sale } = await supabase
            .from('sales')
            .select('id, total_amount')
            .eq('payment_status', 'pending')
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No unpaid sales found for USD payment test",
              duration: Date.now() - startTime,
              testName: "Full Bank Transfer Payment (USD)",
              category: "Payment Processing",
              priority: "Critical",
              module: "Payments"
            };
          }

          // Get exchange rate (or use default)
          const { data: exchangeRate } = await supabase
            .from('currency_rates')
            .select('rate')
            .eq('from_currency', 'USD')
            .eq('to_currency', 'NIS')
            .order('date', { ascending: false })
            .limit(1)
            .single();

          const rate = exchangeRate?.rate || 3.7; // Default USD to NIS rate
          const usdAmount = sale.total_amount / rate;

          // Process USD payment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: usdAmount,
              payment_method: 'bank_transfer',
              payment_date: new Date().toISOString().split('T')[0],
              currency: 'USD',
              exchange_rate: rate,
              amount_usd: usdAmount,
              amount_nis: sale.total_amount,
              reference_number: `BANK-USD-${Date.now()}`,
              notes: 'USD bank transfer payment test'
            })
            .select()
            .single();

          if (paymentError) {
            return {
              success: false,
              message: "Failed to create USD payment record",
              error: paymentError.message,
              duration: Date.now() - startTime,
              testName: "Full Bank Transfer Payment (USD)",
              category: "Payment Processing",
              priority: "Critical",
              module: "Payments"
            };
          }

          // Update sale status
          const { error: updateError } = await supabase
            .from('sales')
            .update({
              payment_status: 'paid',
              total_paid: sale.total_amount,
              balance_due: 0
            })
            .eq('id', sale.id);

          return {
            success: !updateError,
            message: updateError ? "USD payment created but failed to update sale" : "USD bank transfer payment processed successfully",
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              saleId: sale.id,
              paymentId: payment.id,
              usdAmount: usdAmount,
              nisAmount: sale.total_amount,
              exchangeRate: rate
            },
            testName: "Full Bank Transfer Payment (USD)",
            category: "Payment Processing",
            priority: "Critical",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "USD bank transfer payment test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Full Bank Transfer Payment (USD)",
            category: "Payment Processing",
            priority: "Critical",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Partial Payment Processing",
      category: "Payment Processing", 
      description: "Test processing partial payments with balance tracking",
      module: "Payments",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get unpaid sale with significant amount
          const { data: sale } = await supabase
            .from('sales')
            .select('id, total_amount, total_paid')
            .eq('payment_status', 'pending')
            .gt('total_amount', 1000)
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No suitable sales found for partial payment test",
              duration: Date.now() - startTime,
              testName: "Partial Payment Processing",
              category: "Payment Processing",
              priority: "High",
              module: "Payments"
            };
          }

          const totalPaid = sale.total_paid || 0;
          const remainingAmount = sale.total_amount - totalPaid;
          const partialAmount = Math.min(500, remainingAmount * 0.3); // Pay 30% or $500, whichever is smaller

          // Process partial payment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: partialAmount,
              payment_method: 'cash',
              payment_date: new Date().toISOString().split('T')[0],
              currency: 'NIS',
              reference_number: `PARTIAL-${Date.now()}`,
              notes: 'Partial payment test'
            })
            .select()
            .single();

          if (paymentError) {
            return {
              success: false,
              message: "Failed to create partial payment",
              error: paymentError.message,
              duration: Date.now() - startTime,
              testName: "Partial Payment Processing",
              category: "Payment Processing",
              priority: "High",
              module: "Payments"
            };
          }

          // Calculate new totals
          const newTotalPaid = totalPaid + partialAmount;
          const newBalance = sale.total_amount - newTotalPaid;
          const newStatus = newBalance <= 0 ? 'paid' : 'partial_paid';

          // Update sale with partial payment
          const { error: updateError } = await supabase
            .from('sales')
            .update({
              payment_status: newStatus,
              total_paid: newTotalPaid,
              balance_due: newBalance
            })
            .eq('id', sale.id);

          return {
            success: !updateError,
            message: updateError ? "Partial payment created but failed to update sale" : `Partial payment processed, status: ${newStatus}`,
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              saleId: sale.id,
              paymentAmount: partialAmount,
              totalPaid: newTotalPaid,
              remainingBalance: newBalance,
              paymentStatus: newStatus
            },
            testName: "Partial Payment Processing",
            category: "Payment Processing",
            priority: "High",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Partial payment processing test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Partial Payment Processing",
            category: "Payment Processing",
            priority: "High",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Multiple Partial Payments",
      category: "Payment Processing",
      description: "Test multiple partial payments until full payment",
      module: "Payments",
      priority: "High", 
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get partially paid sale
          const { data: sale } = await supabase
            .from('sales')
            .select('id, total_amount, total_paid, balance_due')
            .eq('payment_status', 'partial_paid')
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No partially paid sales found",
              duration: Date.now() - startTime,
              testName: "Multiple Partial Payments",
              category: "Payment Processing",
              priority: "High",
              module: "Payments"
            };
          }

          const remainingBalance = sale.balance_due || (sale.total_amount - (sale.total_paid || 0));
          
          if (remainingBalance <= 0) {
            return {
              success: false,
              message: "Sale is already fully paid",
              duration: Date.now() - startTime,
              testName: "Multiple Partial Payments",
              category: "Payment Processing",
              priority: "High",
              module: "Payments"
            };
          }

          // Make second partial payment
          const secondPartialAmount = Math.min(300, remainingBalance * 0.5);
          
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: secondPartialAmount,
              payment_method: 'bank_transfer',
              payment_date: new Date().toISOString().split('T')[0],
              currency: 'NIS',
              reference_number: `PARTIAL2-${Date.now()}`,
              notes: 'Second partial payment test'
            })
            .select()
            .single();

          if (paymentError) {
            return {
              success: false,
              message: "Failed to create second partial payment",
              error: paymentError.message,
              duration: Date.now() - startTime,
              testName: "Multiple Partial Payments",
              category: "Payment Processing", 
              priority: "High",
              module: "Payments"
            };
          }

          // Update totals
          const newTotalPaid = (sale.total_paid || 0) + secondPartialAmount;
          const newBalance = sale.total_amount - newTotalPaid;
          const finalStatus = newBalance <= 0 ? 'paid' : 'partial_paid';

          const { error: updateError } = await supabase
            .from('sales')
            .update({
              payment_status: finalStatus,
              total_paid: newTotalPaid,
              balance_due: Math.max(0, newBalance)
            })
            .eq('id', sale.id);

          return {
            success: !updateError,
            message: updateError ? "Second payment created but failed to update sale" : `Multiple partial payments processed, final status: ${finalStatus}`,
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              saleId: sale.id,
              secondPaymentAmount: secondPartialAmount,
              totalPaid: newTotalPaid,
              finalBalance: Math.max(0, newBalance),
              finalStatus: finalStatus
            },
            testName: "Multiple Partial Payments",
            category: "Payment Processing",
            priority: "High",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Multiple partial payments test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Multiple Partial Payments",
            category: "Payment Processing",
            priority: "High",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Payment Schedule Creation",
      category: "Payment Processing",
      description: "Test creating installment payment schedules",
      module: "Payments",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get high-value pending sale for installments
          const { data: sale } = await supabase
            .from('sales')
            .select('id, total_amount, customer_id')
            .eq('payment_status', 'pending')
            .gt('total_amount', 2000)
            .limit(1)
            .single();

          if (!sale) {
            return {
              success: false,
              message: "No high-value sales found for installment test",
              duration: Date.now() - startTime,
              testName: "Payment Schedule Creation",
              category: "Payment Processing",
              priority: "Medium",
              module: "Payments"
            };
          }

          // Create 6-month installment schedule
          const numberOfInstallments = 6;
          const installmentAmount = sale.total_amount / numberOfInstallments;
          const schedules = [];

          for (let i = 0; i < numberOfInstallments; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            
            schedules.push({
              sale_id: sale.id,
              customer_id: sale.customer_id,
              installment_number: i + 1,
              due_date: dueDate.toISOString().split('T')[0],
              amount: installmentAmount,
              status: 'pending',
              payment_method: 'bank_transfer'
            });
          }

          const { error } = await supabase
            .from('payment_schedules')
            .insert(schedules);

          if (error) {
            return {
              success: false,
              message: "Failed to create payment schedule",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Payment Schedule Creation",
              category: "Payment Processing",
              priority: "Medium",
              module: "Payments"
            };
          }

          // Update sale to installment status
          const { error: updateError } = await supabase
            .from('sales')
            .update({ payment_status: 'installment' })
            .eq('id', sale.id);

          return {
            success: !updateError,
            message: updateError ? "Schedule created but failed to update sale status" : `${numberOfInstallments}-month payment schedule created successfully`,
            error: updateError?.message,
            duration: Date.now() - startTime,
            details: { 
              saleId: sale.id,
              numberOfInstallments: numberOfInstallments,
              installmentAmount: installmentAmount,
              totalAmount: sale.total_amount
            },
            testName: "Payment Schedule Creation",
            category: "Payment Processing",
            priority: "Medium",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Payment schedule creation test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Payment Schedule Creation",
            category: "Payment Processing",
            priority: "Medium",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Bank Ledger Integration",
      category: "Payment Processing",
      description: "Test bank ledger entries for payment tracking",
      module: "Payments",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Get recent payment
          const { data: payment } = await supabase
            .from('payments')
            .select('id, amount, currency, sale_id, payment_method')
            .eq('payment_method', 'bank_transfer')
            .limit(1)
            .single();

          if (!payment) {
            return {
              success: false,
              message: "No bank transfer payments found for ledger test",
              duration: Date.now() - startTime,
              testName: "Bank Ledger Integration",
              category: "Payment Processing",
              priority: "Medium",
              module: "Payments"
            };
          }

          // Get bank account
          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('currency', payment.currency)
            .eq('is_active', true)
            .limit(1)
            .single();

          if (!bankAccount) {
            return {
              success: false,
              message: `No active bank account found for ${payment.currency}`,
              duration: Date.now() - startTime,
              testName: "Bank Ledger Integration",
              category: "Payment Processing",
              priority: "Medium",
              module: "Payments"
            };
          }

          // Create bank ledger entry
          const { error } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: bankAccount.id,
              transaction_type: 'credit',
              amount: payment.amount,
              currency: payment.currency,
              linked_payment_id: payment.id,
              linked_sale_id: payment.sale_id,
              purpose: 'Customer payment received',
              reference_number: `PAY-${payment.id}`,
              notes: 'Payment received and recorded in bank ledger'
            });

          return {
            success: !error,
            message: error ? "Failed to create bank ledger entry" : "Bank ledger entry created successfully",
            error: error?.message,
            duration: Date.now() - startTime,
            details: { 
              paymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              bankAccountId: bankAccount.id
            },
            testName: "Bank Ledger Integration",
            category: "Payment Processing",
            priority: "Medium",
            module: "Payments"
          };
        } catch (err: any) {
          return {
            success: false,
            message: "Bank ledger integration test failed",
            error: err.message,
            duration: Date.now() - startTime,
            testName: "Bank Ledger Integration",
            category: "Payment Processing",
            priority: "Medium",
            module: "Payments"
          };
        }
      }
    }
  ];

  return { createComprehensivePaymentTests };
};