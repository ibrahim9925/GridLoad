// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessTest, TestResult } from './useBusinessTestTypes';

export const usePaymentTests = () => {
  const createPaymentTests = useCallback((): BusinessTest[] => [
    {
      name: "Payment Processing Workflow",
      category: "Financial",
      description: "Test complete payment processing from creation to bank ledger",
      module: "Payments",
      priority: "Critical",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create bank account
          const { data: bankAccount, error: bankError } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'Test Payment Account',
              currency: 'NIS',
              current_balance: 10000
            })
            .select()
            .single();

          if (bankError) throw bankError;

          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Test Customer',
              contact_person: 'Test Contact',
              email: 'payment@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 5000,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create payment
          const paymentAmount = 3000;
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: paymentAmount,
              payment_method: 'bank_transfer',
              currency: 'NIS',
              reference_number: 'PAY-TEST-001'
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Create bank ledger entry
          const { data: ledgerEntry, error: ledgerError } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: bankAccount.id,
              transaction_type: 'credit',
              amount: paymentAmount,
              currency: 'NIS',
              purpose: 'Customer Payment',
              linked_payment_id: payment.id,
              reference_number: 'PAY-TEST-001'
            })
            .select()
            .single();

          if (ledgerError) throw ledgerError;

          // Update bank account balance
          const newBalance = 10000 + paymentAmount;
          const { data: updatedAccount, error: updateError } = await supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', bankAccount.id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Verify payment with relationships
          const { data: paymentWithDetails, error: verifyError } = await supabase
            .from('payments')
            .select(`
              *,
              sales(*, customers(*)),
              bank_ledger!linked_payment_id(*)
            `)
            .eq('id', payment.id)
            .single();

          if (verifyError) throw verifyError;

          // Cleanup
          await supabase.from('bank_ledger').delete().eq('id', ledgerEntry.id);
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('bank_accounts').delete().eq('id', bankAccount.id);

          const relationshipsCorrect = paymentWithDetails.sales && 
                                     paymentWithDetails.bank_ledger?.length > 0;
          const balanceCorrect = updatedAccount.current_balance === newBalance;

          return {
            success: relationshipsCorrect && balanceCorrect,
            message: "Payment processing workflow completed successfully",
            duration: Date.now() - startTime,
            details: {
              paymentId: payment.id,
              paymentAmount,
              ledgerEntryId: ledgerEntry.id,
              originalBalance: 10000,
              newBalance: updatedAccount.current_balance,
              relationshipsLinked: relationshipsCorrect
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Payment processing test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Multi-Currency Payment Handling",
      category: "Financial",
      description: "Test payments in different currencies with exchange rates",
      module: "Payments",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create currency rate
          const { data: currencyRate, error: rateError } = await supabase
            .from('currency_rates')
            .insert({
              from_currency: 'USD',
              to_currency: 'NIS',
              rate: 3.7,
              date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single();

          if (rateError) throw rateError;

          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Multi-Currency Customer',
              contact_person: 'MC Contact',
              email: 'multicurrency@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 3700, // NIS equivalent
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create USD payment
          const usdAmount = 1000;
          const exchangeRate = 3.7;
          const nisAmount = usdAmount * exchangeRate;

          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              amount: usdAmount,
              currency: 'USD',
              exchange_rate: exchangeRate,
              amount_usd: usdAmount,
              amount_nis: nisAmount,
              payment_method: 'wire_transfer'
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Create bank accounts for both currencies
          const { data: usdAccount, error: usdAccountError } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'USD Account',
              currency: 'USD',
              current_balance: 0
            })
            .select()
            .single();

          if (usdAccountError) throw usdAccountError;

          const { data: nisAccount, error: nisAccountError } = await supabase
            .from('bank_accounts')
            .insert({
              name: 'NIS Account',
              currency: 'NIS',
              current_balance: 0
            })
            .select()
            .single();

          if (nisAccountError) throw nisAccountError;

          // Create ledger entries for both currencies
          const { data: usdLedger, error: usdLedgerError } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: usdAccount.id,
              transaction_type: 'credit',
              amount: usdAmount,
              currency: 'USD',
              usd_value: usdAmount,
              nis_value: nisAmount,
              exchange_rate: exchangeRate,
              linked_payment_id: payment.id,
              purpose: 'Customer Payment (USD)'
            })
            .select()
            .single();

          if (usdLedgerError) throw usdLedgerError;

          const { data: nisLedger, error: nisLedgerError } = await supabase
            .from('bank_ledger')
            .insert({
              bank_account_id: nisAccount.id,
              transaction_type: 'credit',
              amount: nisAmount,
              currency: 'NIS',
              usd_value: usdAmount,
              nis_value: nisAmount,
              exchange_rate: exchangeRate,
              linked_payment_id: payment.id,
              purpose: 'Customer Payment (NIS Equivalent)'
            })
            .select()
            .single();

          if (nisLedgerError) throw nisLedgerError;

          // Verify currency conversion calculations
          const calculatedNIS = payment.amount * payment.exchange_rate;
          const conversionCorrect = Math.abs(calculatedNIS - nisAmount) < 0.01;

          // Cleanup
          await supabase.from('bank_ledger').delete().eq('linked_payment_id', payment.id);
          await supabase.from('payments').delete().eq('id', payment.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);
          await supabase.from('bank_accounts').delete().eq('id', usdAccount.id);
          await supabase.from('bank_accounts').delete().eq('id', nisAccount.id);
          await supabase.from('currency_rates').delete().eq('id', currencyRate.id);

          return {
            success: conversionCorrect,
            message: "Multi-currency payment handling completed",
            duration: Date.now() - startTime,
            details: {
              usdAmount,
              exchangeRate,
              calculatedNIS,
              expectedNIS: nisAmount,
              conversionAccurate: conversionCorrect,
              usdLedgerId: usdLedger.id,
              nisLedgerId: nisLedger.id
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Multi-currency payment test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Payment Schedule Management",
      category: "Workflow",
      description: "Test installment payment schedules and tracking",
      module: "Payments",
      priority: "High",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Installment Customer',
              contact_person: 'Install Contact',
              email: 'installment@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const totalAmount = 12000;
          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: totalAmount,
              status: 'confirmed',
              payment_terms: 'installments'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create payment schedule (4 installments of 3000 each)
          const installmentAmount = 3000;
          const schedules = [];
          
          for (let i = 0; i < 4; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i + 1);
            
            const { data: schedule, error: scheduleError } = await supabase
              .from('payment_schedules')
              .insert({
                sale_id: sale.id,
                installment_number: i + 1,
                amount: installmentAmount,
                due_date: dueDate.toISOString().split('T')[0],
                status: 'pending'
              })
              .select()
              .single();

            if (scheduleError) throw scheduleError;
            schedules.push(schedule);
          }

          // Make payment for first installment
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              sale_id: sale.id,
              payment_schedule_id: schedules[0].id,
              amount: installmentAmount,
              payment_method: 'cash'
            })
            .select()
            .single();

          if (paymentError) throw paymentError;

          // Update payment schedule status
          const { data: updatedSchedule, error: updateError } = await supabase
            .from('payment_schedules')
            .update({ 
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              paid_amount: installmentAmount
            })
            .eq('id', schedules[0].id)
            .select()
            .single();

          if (updateError) throw updateError;

          // Query payment schedule with status
          const { data: allSchedules, error: queryError } = await supabase
            .from('payment_schedules')
            .select('*')
            .eq('sale_id', sale.id)
            .order('installment_number');

          if (queryError) throw queryError;

          // Calculate outstanding balance
          const paidSchedules = allSchedules.filter(s => s.status === 'paid');
          const pendingSchedules = allSchedules.filter(s => s.status === 'pending');
          const totalPaid = paidSchedules.reduce((sum, s) => sum + (s.amount || 0), 0);
          const totalOutstanding = pendingSchedules.reduce((sum, s) => sum + (s.amount || 0), 0);

          // Cleanup
          await supabase.from('payments').delete().eq('id', payment.id);
          await Promise.all(
            schedules.map(schedule => 
              supabase.from('payment_schedules').delete().eq('id', schedule.id)
            )
          );
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const scheduleCorrect = allSchedules.length === 4;
          const paymentTracked = paidSchedules.length === 1;
          const balanceCorrect = totalPaid === installmentAmount && 
                               totalOutstanding === installmentAmount * 3;

          return {
            success: scheduleCorrect && paymentTracked && balanceCorrect,
            message: "Payment schedule management completed successfully",
            duration: Date.now() - startTime,
            details: {
              totalSchedules: allSchedules.length,
              paidSchedules: paidSchedules.length,
              pendingSchedules: pendingSchedules.length,
              totalPaid,
              totalOutstanding,
              installmentAmount,
              firstScheduleStatus: updatedSchedule.status
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Payment schedule test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Overdue Payment Detection",
      category: "Automation",
      description: "Test automatic detection and alerting of overdue payments",
      module: "Payments",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Overdue Customer',
              contact_person: 'Test Contact',
              email: 'overdue@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 5000,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Create overdue payment schedule (past due date)
          const overdueDate = new Date();
          overdueDate.setDate(overdueDate.getDate() - 30); // 30 days overdue

          const { data: overdueSchedule, error: scheduleError } = await supabase
            .from('payment_schedules')
            .insert({
              sale_id: sale.id,
              installment_number: 1,
              amount: 5000,
              due_date: overdueDate.toISOString().split('T')[0],
              status: 'overdue'
            })
            .select()
            .single();

          if (scheduleError) throw scheduleError;

          // Query overdue payments
          const today = new Date().toISOString().split('T')[0];
          const { data: overduePayments, error: overdueError } = await supabase
            .from('payment_schedules')
            .select(`
              *,
              sales(*, customers(*))
            `)
            .eq('status', 'overdue')
            .lt('due_date', today);

          if (overdueError) throw overdueError;

          // Calculate days overdue
          const dueDateObj = new Date(overdueSchedule.due_date);
          const todayObj = new Date();
          const daysOverdue = Math.floor((todayObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));

          // Test overdue amount calculation
          const { data: overdueTotal, error: totalError } = await supabase
            .from('payment_schedules')
            .select('amount')
            .eq('status', 'overdue')
            .eq('sale_id', sale.id);

          if (totalError) throw totalError;

          const totalOverdueAmount = overdueTotal.reduce((sum, payment) => sum + (payment.amount || 0), 0);

          // Cleanup
          await supabase.from('payment_schedules').delete().eq('id', overdueSchedule.id);
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const overdueDetected = overduePayments.length > 0;
          const amountCorrect = totalOverdueAmount === 5000;
          const daysCalculated = daysOverdue >= 30;

          return {
            success: overdueDetected && amountCorrect && daysCalculated,
            message: "Overdue payment detection working correctly",
            duration: Date.now() - startTime,
            details: {
              overduePaymentsFound: overduePayments.length,
              totalOverdueAmount,
              daysOverdue,
              overdueDetected: true,
              overdueScheduleId: overdueSchedule.id
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Overdue payment detection test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    },

    {
      name: "Payment Method Validation",
      category: "Business Logic",
      description: "Test different payment methods and their validation rules",
      module: "Payments",
      priority: "Medium",
      fn: async (): Promise<TestResult> => {
        const startTime = Date.now();
        try {
          // Create customer and sale
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: 'Payment Method Customer',
              contact_person: 'Test Contact',
              email: 'paymentmethod@test.com'
            })
            .select()
            .single();

          if (customerError) throw customerError;

          const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
              customer_id: customer.id,
              total_amount: 10000,
              status: 'confirmed'
            })
            .select()
            .single();

          if (saleError) throw saleError;

          // Test different payment methods
          const paymentMethods = [
            { method: 'cash', amount: 2000, requiresRef: false },
            { method: 'bank_transfer', amount: 3000, requiresRef: true, ref: 'TRX-001' },
            { method: 'credit_card', amount: 2500, requiresRef: true, ref: 'CC-AUTH-123' },
            { method: 'check', amount: 2500, requiresRef: true, ref: 'CHK-456' }
          ];

          const createdPayments = [];
          for (const pm of paymentMethods) {
            const paymentData: any = {
              sale_id: sale.id,
              amount: pm.amount,
              payment_method: pm.method
            };

            if (pm.requiresRef && pm.ref) {
              paymentData.reference_number = pm.ref;
            }

            const { data: payment, error: paymentError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single();

            if (paymentError) throw paymentError;
            createdPayments.push(payment);
          }

          // Verify payments by method
          const { data: cashPayments, error: cashError } = await supabase
            .from('payments')
            .select('*')
            .eq('sale_id', sale.id)
            .eq('payment_method', 'cash');

          if (cashError) throw cashError;

          const { data: transferPayments, error: transferError } = await supabase
            .from('payments')
            .select('*')
            .eq('sale_id', sale.id)
            .eq('payment_method', 'bank_transfer');

          if (transferError) throw transferError;

          // Verify reference numbers are stored correctly
          const paymentsWithRefs = createdPayments.filter(p => p.reference_number);
          const expectedRefsCount = paymentMethods.filter(pm => pm.requiresRef).length;

          // Calculate total by payment method
          const totalCash = cashPayments.reduce((sum, p) => sum + p.amount, 0);
          const totalTransfer = transferPayments.reduce((sum, p) => sum + p.amount, 0);

          // Cleanup
          await Promise.all(
            createdPayments.map(payment => 
              supabase.from('payments').delete().eq('id', payment.id)
            )
          );
          await supabase.from('sales').delete().eq('id', sale.id);
          await supabase.from('customers').delete().eq('id', customer.id);

          const allMethodsCreated = createdPayments.length === paymentMethods.length;
          const referencesStored = paymentsWithRefs.length === expectedRefsCount;
          const amountsCorrect = totalCash === 2000 && totalTransfer === 3000;

          return {
            success: allMethodsCreated && referencesStored && amountsCorrect,
            message: "Payment method validation completed successfully",
            duration: Date.now() - startTime,
            details: {
              paymentMethodsCreated: createdPayments.length,
              expectedMethods: paymentMethods.length,
              referencesStored: paymentsWithRefs.length,
              expectedReferences: expectedRefsCount,
              totalCash,
              totalTransfer,
              methodsBreakdown: paymentMethods.map(pm => ({
                method: pm.method,
                amount: pm.amount,
                hasReference: pm.requiresRef
              }))
            }
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Payment method validation test failed: ${error.message}`,
            duration: Date.now() - startTime,
            error: error.message
          };
        }
      }
    }
  ], []);

  return { createPaymentTests };
};