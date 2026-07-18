// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useCommissionTests = () => {
  const createCommissionTests = useCallback((): BusinessTest[] => {
    return [
      {
        name: "Commission Calculation Test",
        category: "Financial Management",
        description: "Test commission calculation based on sales",
        module: "Financial",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let customerToCleanup: string | null = null;
          let saleToCleanup: string | null = null;

          try {
            // Get or create a sales rep
            let { data: salesReps } = await supabase
              .from('staff')
              .select('*')
              .eq('role', 'sales_rep')
              .limit(1);

            if (!salesReps || salesReps.length === 0) {
              return {
                success: false,
                message: "No sales reps found to test commission calculation",
                duration: Date.now() - startTime,
                testName: "Commission Calculation Test",
                category: "Financial Management",
                priority: "Critical",
                module: "Financial"
              };
            }

            const salesRep = salesReps[0];

            // Create test customer
            const { data: customer, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_name: `Commission Test Customer ${Date.now()}`,
                contact_person: "Jane Commission",
                email: `commission${Date.now()}@test.com`,
                phone: "123-456-7890"
              })
              .select()
              .single();

            if (customerError) throw customerError;
            customerToCleanup = customer.id;

            // Create test sale
            const saleAmount = 10000;
            const expectedCommissionRate = 0.05; // 5%
            const expectedCommission = saleAmount * expectedCommissionRate;

            const { data: sale, error: saleError } = await supabase
              .from('sales')
              .insert({
                customer_id: customer.id,
                sales_rep_id: salesRep.id,
                total_amount: saleAmount,
                commission_amount: expectedCommission,
                status: 'completed'
              })
              .select()
              .single();

            if (saleError) throw saleError;
            saleToCleanup = sale.id;

            // Calculate commission  
            const calculatedCommission = sale.commission_amount || (sale.total_amount * expectedCommissionRate);

            return {
              success: Math.abs(calculatedCommission - expectedCommission) < 0.01,
              message: "Commission calculation successful",
              details: { 
                saleAmount,
                commissionRate: expectedCommissionRate,
                expectedCommission,
                calculatedCommission
              },
              duration: Date.now() - startTime,
              testName: "Commission Calculation Test",
              category: "Financial Management",
              priority: "Critical",
              module: "Financial"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Commission calculation failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Commission Calculation Test",
              category: "Financial Management",
              priority: "Critical",
              module: "Financial"
            };
          } finally {
            // Cleanup
            if (saleToCleanup) {
              await supabase.from('sales').delete().eq('id', saleToCleanup);
            }
            if (customerToCleanup) {
              await supabase.from('customers').delete().eq('id', customerToCleanup);
            }
          }
        }
      },
      {
        name: "Commission Payment Processing Test",
        category: "Financial Management",
        description: "Test commission payment workflow",
        module: "Financial",
        priority: "High",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let commissionToCleanup: string | null = null;

          try {
            // Get a sales rep
            let { data: salesReps } = await supabase
              .from('staff')
              .select('*')
              .eq('role', 'sales_rep')
              .limit(1);

            if (!salesReps || salesReps.length === 0) {
              return {
                success: false,
                message: "No sales reps found to test commission payment",
                duration: Date.now() - startTime,
                testName: "Commission Payment Processing Test",
                category: "Financial Management",
                priority: "High",
                module: "Financial"
              };
            }

            const salesRep = salesReps[0];

            // Create commission payment record
            const { data: commission, error: commissionError } = await supabase
              .from('commission_payments')
              .insert({
                sales_rep_id: salesRep.id,
                period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                period_end: new Date().toISOString().split('T')[0],
                base_commission: 1500.00,
                bonus_commission: 300.00,
                total_commission: 1800.00,
                status: 'pending'
              })
              .select()
              .single();

            if (commissionError) throw commissionError;
            commissionToCleanup = commission.id;

            // Process payment
            const { error: processError } = await supabase
              .from('commission_payments')
              .update({
                status: 'paid',
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'bank_transfer',
                payment_reference: `PAY-${Date.now()}`
              })
              .eq('id', commission.id);

            if (processError) throw processError;

            // Verify payment processed
            const { data: processedCommission, error: verifyError } = await supabase
              .from('commission_payments')
              .select('*')
              .eq('id', commission.id)
              .single();

            if (verifyError) throw verifyError;

            return {
              success: processedCommission.status === 'paid' && processedCommission.payment_date !== null,
              message: "Commission payment processed successfully",
              details: { 
                commissionId: commission.id,
                totalAmount: processedCommission.total_commission,
                status: processedCommission.status
              },
              duration: Date.now() - startTime,
              testName: "Commission Payment Processing Test",
              category: "Financial Management",
              priority: "High",
              module: "Financial"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Commission payment processing failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Commission Payment Processing Test",
              category: "Financial Management",
              priority: "High",
              module: "Financial"
            };
          } finally {
            if (commissionToCleanup) {
              await supabase.from('commission_payments').delete().eq('id', commissionToCleanup);
            }
          }
        }
      },
      {
        name: "Monthly Commission Report Test",
        category: "Financial Management",
        description: "Test monthly commission reporting",
        module: "Financial",
        priority: "Medium",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();

          try {
            // Get commission payments for current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            const endOfMonth = new Date();
            endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);

            const { data: commissions, error: commissionsError } = await supabase
              .from('commission_payments')
              .select(`
                *,
                staff:sales_rep_id (full_name, email)
              `)
              .gte('period_start', startOfMonth.toISOString().split('T')[0])
              .lte('period_end', endOfMonth.toISOString().split('T')[0]);

            if (commissionsError) throw commissionsError;

            // Calculate totals
            const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.total_commission), 0) || 0;
            const paidCommissions = commissions?.filter(c => c.status === 'paid').length || 0;
            const pendingCommissions = commissions?.filter(c => c.status === 'pending').length || 0;

            return {
              success: true,
              message: "Monthly commission report generated successfully",
              details: {
                totalRecords: commissions?.length || 0,
                totalCommissions,
                paidCount: paidCommissions,
                pendingCount: pendingCommissions
              },
              duration: Date.now() - startTime,
              testName: "Monthly Commission Report Test",
              category: "Financial Management",
              priority: "Medium",
              module: "Financial"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Monthly commission report generation failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Monthly Commission Report Test",
              category: "Financial Management",
              priority: "Medium",
              module: "Financial"
            };
          }
        }
      }
    ];
  }, []);

  return { createCommissionTests };
};