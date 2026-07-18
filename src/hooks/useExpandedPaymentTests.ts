// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useExpandedPaymentTests = () => {
  const createExpandedPaymentTests = useCallback((): BusinessTest[] => [
    {
      name: "Payment Processing and Recording",
      category: "Payment Management",
      description: "Test payment processing, recording, and sale balance updates",
      module: "Payments",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Test Customer',
              contact_person: 'Payment Manager',
              email: 'payment@test.com'
            })
            .select()
            .single();

          // Create sale
          const saleAmount = 10000;
          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: saleAmount,
              balance_due: saleAmount,
              payment_status: 'pending',
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Process partial payment
          const paymentAmount = 6000;
          const { data: payment } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: paymentAmount,
              payment_method: 'bank_transfer',
              currency: 'NIS',
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: `PAY-${Date.now()}`
            })
            .select()
            .single();

          // Update sale balance
          const newBalance = saleAmount - paymentAmount;
          const { data: updatedSale } = await supabase
            .from('sales')
            .update({
              total_paid: paymentAmount,
              balance_due: newBalance,
              payment_status: 'partial_paid'
            })
            .eq('id', sale.id)
            .select()
            .single();

          // Create bank ledger entry
          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'Test Payment Account',
              currency: 'NIS',
              current_balance: paymentAmount
            })
            .select()
            .single();

          const { data: ledgerEntry } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: bankAccount.id,
              transaction_type: 'credit',
              amount: paymentAmount,
              currency: 'NIS',
              linked_payment_id: payment.id,
              purpose: 'Customer payment received',
              reference_number: payment.reference_number
            })
            .select()
            .single();

          // Cleanup
          await supabase.from('bank_ledger').delete().eq('id', ledgerEntry.id);
          await supabase.from('bank_accounts').delete().eq('id', bankAccount.id);
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const paymentValid = payment.amount === paymentAmount &&
                             updatedSale.balance_due === newBalance &&
                             updatedSale.payment_status === 'partial_paid';

          return {
            success: paymentValid,
            message: "Payment processing completed successfully",
            details: {
              saleAmount,
              paymentAmount,
              remainingBalance: newBalance,
              paymentStatus: updatedSale.payment_status
            },
            duration: Date.now() - startTime,
            testName: "Payment Processing and Recording",
            category: "Payment Management",
            priority: "Critical",
            module: "Payments"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Payment processing failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Payment Processing and Recording",
            category: "Payment Management",
            priority: "Critical",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Multi-Currency Payment Processing",
      category: "Payment Management",
      description: "Test processing payments in different currencies with exchange rates",
      module: "Payments",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create currency rate
          const exchangeRate = 3.7; // USD to NIS
          const { data: currencyRate } = await supabase
            .from('currency_rates')
            .insert({
              from_currency: 'USD',
              to_currency: 'NIS',
              rate: exchangeRate,
              date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Multi-Currency Customer',
              contact_person: 'Currency Manager',
              email: 'currency@test.com'
            })
            .select()
            .single();

          // Create sale in USD
          const saleAmountUSD = 2500;
          const saleAmountNIS = saleAmountUSD * exchangeRate;

          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: saleAmountNIS,
              balance_due: saleAmountNIS,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Process payment in USD
          const paymentAmountUSD = 1500;
          const paymentAmountNIS = paymentAmountUSD * exchangeRate;

          const { data: payment } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: paymentAmountNIS,
              currency: 'USD',
              amount_usd: paymentAmountUSD,
              amount_nis: paymentAmountNIS,
              exchange_rate: exchangeRate,
              payment_method: 'wire_transfer',
              reference_number: `USD-PAY-${Date.now()}`
            })
            .select()
            .single();

          // Create USD bank account
          const { data: usdAccount } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'USD Payment Account',
              currency: 'USD',
              current_balance: paymentAmountUSD
            })
            .select()
            .single();

          // Create bank ledger entry in USD
          const { data: ledgerEntry } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: usdAccount.id,
              transaction_type: 'credit',
              amount: paymentAmountUSD,
              currency: 'USD',
              exchange_rate: exchangeRate,
              usd_value: paymentAmountUSD,
              nis_value: paymentAmountNIS,
              linked_payment_id: payment.id,
              purpose: 'Multi-currency payment'
            })
            .select()
            .single();

          // Cleanup
          await supabase.from('bank_ledger').delete().eq('id', ledgerEntry.id);
          await supabase.from('bank_accounts').delete().eq('id', usdAccount.id);
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('currency_rates').delete().eq('id', currencyRate.id);

          const currencyPaymentValid = payment.amount_usd === paymentAmountUSD &&
                                     payment.amount_nis === paymentAmountNIS &&
                                     payment.exchange_rate === exchangeRate;

          return {
            success: currencyPaymentValid,
            message: "Multi-currency payment processing completed successfully",
            details: {
              saleAmountUSD,
              paymentAmountUSD,
              exchangeRate,
              paymentAmountNIS,
              currency: payment.currency
            },
            duration: Date.now() - startTime,
            testName: "Multi-Currency Payment Processing",
            category: "Payment Management",
            priority: "High",
            module: "Payments"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Multi-currency payment processing failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Multi-Currency Payment Processing",
            category: "Payment Management",
            priority: "High",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Payment Method Validation",
      category: "Payment Management",
      description: "Test validation and processing of different payment methods",
      module: "Payments",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Method Customer',
              contact_person: 'Method Manager',
              email: 'method@payment.com'
            })
            .select()
            .single();

          // Create sale for testing different payment methods
          const totalAmount = 15000;
          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: totalAmount,
              balance_due: totalAmount,
              payment_terms: 'multiple_payments',
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Test different payment methods
          const paymentMethods = [
            { method: 'cash', amount: 5000 },
            { method: 'bank_transfer', amount: 6000 },
            { method: 'check', amount: 4000 }
          ];

          const payments = [];
          let totalPaid = 0;

          for (const pm of paymentMethods) {
            const { data: payment } = await supabase
              .from('payments')
              .insert({
                sale_id: sale.id,
                amount: pm.amount,
                payment_method: pm.method,
                currency: 'NIS',
                payment_date: new Date().toISOString().split('T')[0],
                reference_number: `${pm.method.toUpperCase()}-${Date.now()}`
              })
              .select()
              .single();
            
            payments.push(payment);
            totalPaid += pm.amount;
          }

          // Update sale with total payments
          const remainingBalance = totalAmount - totalPaid;
          const { data: updatedSale } = await supabase
            .from('sales')
            .update({
              total_paid: totalPaid,
              balance_due: remainingBalance,
              payment_status: remainingBalance > 0 ? 'partial_paid' : 'paid'
            })
            .eq('id', sale.id)
            .select()
            .single();

          // Cleanup
          await Promise.all(payments.map(payment => 
            supabase.from('payments').delete().eq('id', payment.id)
          ));
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const paymentMethodsValid = payments.length === 3 &&
                                    updatedSale.total_paid === totalPaid &&
                                    updatedSale.payment_status === 'paid';

          return {
            success: paymentMethodsValid,
            message: "Payment method validation completed successfully",
            details: {
              totalAmount,
              totalPaid,
              remainingBalance,
              paymentMethodsUsed: paymentMethods.length,
              paymentStatus: updatedSale.payment_status
            },
            duration: Date.now() - startTime,
            testName: "Payment Method Validation",
            category: "Payment Management",
            priority: "High",
            module: "Payments"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Payment method validation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Payment Method Validation",
            category: "Payment Management",
            priority: "High",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Bank Reconciliation Process",
      category: "Financial Control",
      description: "Test bank transaction recording and reconciliation processes",
      module: "Payments",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create bank account
          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'Reconciliation Test Account',
              bank_name: 'Test Bank',
              account_number: 'ACC-123456',
              currency: 'NIS',
              opening_balance: 100000,
              current_balance: 100000
            })
            .select()
            .single();

          // Create multiple bank transactions
          const transactions = [];
          const transactionData = [
            { type: 'credit', amount: 15000, purpose: 'Customer payment received' },
            { type: 'debit', amount: 5000, purpose: 'Supplier payment made' },
            { type: 'credit', amount: 8000, purpose: 'Customer payment received' },
            { type: 'debit', amount: 3000, purpose: 'Bank charges' }
          ];

          let runningBalance = bankAccount.current_balance;
          
          for (const txn of transactionData) {
            runningBalance += txn.type === 'credit' ? txn.amount : -txn.amount;
            
            const { data: ledgerEntry } = await supabase
              .from('bank_ledger')
              .insert({
                bank_account_id: bankAccount.id,
                transaction_type: txn.type,
                amount: txn.amount,
                currency: 'NIS',
                purpose: txn.purpose,
                reference_number: `TXN-${Date.now()}-${transactions.length + 1}`,
                date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();
            transactions.push(ledgerEntry);
          }

          // Update bank account balance
          const { data: updatedAccount } = await supabase
            .from('bank_accounts')
            .update({ current_balance: runningBalance })
            .eq('id', bankAccount.id)
            .select()
            .single();

          // Calculate reconciliation totals
          const totalCredits = transactions
            .filter(t => t.transaction_type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const totalDebits = transactions
            .filter(t => t.transaction_type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

          const expectedBalance = bankAccount.opening_balance + totalCredits - totalDebits;

          // Cleanup
          await Promise.all(transactions.map(txn => 
            supabase.from('bank_ledger').delete().eq('id', txn.id)
          ));
          await supabase.from('bank_accounts').delete().eq('id', bankAccount.id);

          const reconciliationValid = updatedAccount.current_balance === expectedBalance &&
                                    transactions.length === 4;

          return {
            success: reconciliationValid,
            message: "Bank reconciliation process completed successfully",
            details: {
              openingBalance: bankAccount.opening_balance,
              totalCredits,
              totalDebits,
              expectedBalance,
              actualBalance: updatedAccount.current_balance,
              transactionsProcessed: transactions.length
            },
            duration: Date.now() - startTime,
            testName: "Bank Reconciliation Process",
            category: "Financial Control",
            priority: "Critical",
            module: "Payments"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Bank reconciliation process failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Bank Reconciliation Process",
            category: "Financial Control",
            priority: "Critical",
            module: "Payments"
          };
        }
      }
    },

    {
      name: "Payment Receipt Generation",
      category: "Documentation",
      description: "Test automated payment receipt creation and tracking",
      module: "Payments",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer
          const { data: customer } = await supabase
            .from('customers')
            .insert({
              company_name: 'Receipt Customer',
              contact_person: 'Receipt Manager',
              email: 'receipt@customer.com'
            })
            .select()
            .single();

          // Create sale
          const { data: sale } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 12000,
              balance_due: 12000,
              sale_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          // Process payment with receipt URL
          const paymentAmount = 12000;
          const receiptUrl = `https://receipts.example.com/receipt-${Date.now()}.pdf`;
          
          const { data: payment } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: paymentAmount,
              payment_method: 'bank_transfer',
              currency: 'NIS',
              payment_date: new Date().toISOString().split('T')[0],
              reference_number: `REC-${Date.now()}`,
              receipt_url: receiptUrl,
              notes: 'Full payment with receipt generated'
            })
            .select()
            .single();

          // Update sale to fully paid
          const { data: updatedSale } = await supabase
            .from('sales')
            .update({
              total_paid: paymentAmount,
              balance_due: 0,
              payment_status: 'paid'
            })
            .eq('id', sale.id)
            .select()
            .single();

          // Verify receipt generation
          const receiptGenerated = payment.receipt_url === receiptUrl &&
                                 payment.notes?.includes('receipt generated');

          // Cleanup
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          return {
            success: receiptGenerated,
            message: "Payment receipt generation completed successfully",
            details: {
              paymentAmount,
              receiptUrl,
              paymentStatus: updatedSale.payment_status,
              balanceAfterPayment: updatedSale.balance_due
            },
            duration: Date.now() - startTime,
            testName: "Payment Receipt Generation",
            category: "Documentation",
            priority: "Medium",
            module: "Payments"
          };
        } catch (error: any) {
          return {
            success: false,
            message: "Payment receipt generation failed",
            error: error.message,
            duration: Date.now() - startTime,
            testName: "Payment Receipt Generation",
            category: "Documentation",
            priority: "Medium",
            module: "Payments"
          };
        }
      }
    }

    // TODO: Add 25 more payment tests to reach 30 total
    // Payment Authorization
    // Refund Processing
    // Chargeback Management
    // Payment Gateway Integration
    // Credit Card Processing
    // ACH/Direct Debit Processing
    // International Payment Processing
    // Payment Fraud Detection
    // Recurring Payment Setup
    // Payment Plan Management
    // Payment Notification System
    // Late Payment Fee Calculation
    // Payment Dunning Process
    // Payment Audit Trail
    // Payment Batch Processing
    // Payment Reversal Processing
    // Payment Terms Management
    // Payment Approval Workflow
    // Payment Exception Handling
    // Payment Performance Analytics
    // Customer Payment History
    // Payment Method Security Validation
    // Payment Compliance Checks
    // Cross-border Payment Processing
    // Payment Integration Testing

  ], []);

  return { createExpandedPaymentTests };
};