// @ts-nocheck
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessTest, TestResult } from "./useBusinessTestTypes";

export const useWarrantyTests = () => {
  const createWarrantyTests = useCallback((): BusinessTest[] => {
    return [
      {
        name: "Warranty Registration Test",
        category: "Warranty Management",
        description: "Test warranty registration for products",
        module: "Warranty",
        priority: "Critical",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let customerToCleanup: string | null = null;
          let saleToCleanup: string | null = null;
          let warrantyToCleanup: string | null = null;

          try {
            // Create test customer
            const { data: customer, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_name: `Test Warranty Customer ${Date.now()}`,
                contact_person: "John Warranty",
                email: `warranty${Date.now()}@test.com`,
                phone: "123-456-7890"
              })
              .select()
              .single();

            if (customerError) throw customerError;
            customerToCleanup = customer.id;

            // Create test sale
            const { data: sale, error: saleError } = await supabase
              .from('sales')
              .insert({
                customer_id: customer.id,
                sales_rep_id: customer.id, // Using customer id as placeholder
                total_amount: 5000,
                status: 'completed'
              })
              .select()
              .single();

            if (saleError) throw saleError;
            saleToCleanup = sale.id;

            // Register warranty with required fields
            const { data: warranty, error: warrantyError } = await supabase
              .from('warranties')
              .insert({
                sale_id: sale.id,
                customer_id: customer.id,
                warranty_type: 'standard',
                warranty_period_months: 24,
                warranty_start_date: new Date().toISOString().split('T')[0],
                warranty_end_date: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24 months from now
                serial_number: `SN-${Date.now()}`,
                notes: 'Full system warranty including parts and labor'
              })
              .select()
              .single();

            if (warrantyError) throw warrantyError;
            warrantyToCleanup = warranty.id;

            // Verify warranty was created
            const { data: verifyWarranty, error: verifyError } = await supabase
              .from('warranties')
              .select('*')
              .eq('id', warranty.id)
              .single();

            if (verifyError) throw verifyError;

            return {
              success: true,
              message: "Warranty registration successful",
              details: { warrantyId: warranty.id, duration: verifyWarranty.warranty_period_months },
              duration: Date.now() - startTime,
              testName: "Warranty Registration Test",
              category: "Warranty Management",
              priority: "Critical",
              module: "Warranty"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Warranty registration failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Warranty Registration Test",
              category: "Warranty Management",
              priority: "Critical",
              module: "Warranty"
            };
          } finally {
            // Cleanup
            if (warrantyToCleanup) {
              await supabase.from('warranties').delete().eq('id', warrantyToCleanup);
            }
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
        name: "Warranty Claim Processing Test",
        category: "Warranty Management",
        description: "Test warranty claim creation and processing",
        module: "Warranty",
        priority: "High",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();
          let claimToCleanup: string | null = null;

          try {
            // Get existing warranty or create one
            let { data: warranties } = await supabase
              .from('warranties')
              .select('*')
              .limit(1);

            if (!warranties || warranties.length === 0) {
              return {
                success: false,
                message: "No warranties found to test claim processing",
                duration: Date.now() - startTime,
                testName: "Warranty Claim Processing Test",
                category: "Warranty Management",
                priority: "High",
                module: "Warranty"
              };
            }

            const warranty = warranties[0];

            // Create warranty claim
            const { data: claim, error: claimError } = await supabase
              .from('warranty_claims')
              .insert({
                warranty_id: warranty.id,
                description: "Solar panel not generating expected power output",
                claim_type: 'performance',
                status: 'submitted'
              })
              .select()
              .single();

            if (claimError) throw claimError;
            claimToCleanup = claim.id;

            // Update claim status
            const { error: updateError } = await supabase
              .from('warranty_claims')
              .update({ 
                status: 'under_review'
              })
              .eq('id', claim.id);

            if (updateError) throw updateError;

            // Verify claim processing
            const { data: updatedClaim, error: verifyError } = await supabase
              .from('warranty_claims')
              .select('*')
              .eq('id', claim.id)
              .single();

            if (verifyError) throw verifyError;

            return {
              success: updatedClaim.status === 'under_review',
              message: "Warranty claim processed successfully",
              details: { claimId: claim.id, status: updatedClaim.status },
              duration: Date.now() - startTime,
              testName: "Warranty Claim Processing Test",
              category: "Warranty Management", 
              priority: "High",
              module: "Warranty"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Warranty claim processing failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Warranty Claim Processing Test",
              category: "Warranty Management",
              priority: "High", 
              module: "Warranty"
            };
          } finally {
            if (claimToCleanup) {
              await supabase.from('warranty_claims').delete().eq('id', claimToCleanup);
            }
          }
        }
      },
      {
        name: "Warranty Extension Test",
        category: "Warranty Management",
        description: "Test warranty extension functionality",
        module: "Warranty",
        priority: "Medium",
        fn: async (): Promise<TestResult> => {
          const startTime = Date.now();

          try {
            // Get existing warranty
            let { data: warranties } = await supabase
              .from('warranties')
              .select('*')
              .limit(1);

            if (!warranties || warranties.length === 0) {
              return {
                success: false,
                message: "No warranties found to test extension",
                duration: Date.now() - startTime,
                testName: "Warranty Extension Test",
                category: "Warranty Management",
                priority: "Medium",
                module: "Warranty"
              };
            }

            const warranty = warranties[0];
            const originalDuration = warranty.warranty_period_months;
            const extensionMonths = 12;

            // Extend warranty
            const { error: extendError } = await supabase
              .from('warranties')
              .update({ 
                warranty_period_months: originalDuration + extensionMonths,
                updated_at: new Date().toISOString()
              })
              .eq('id', warranty.id);

            if (extendError) throw extendError;

            // Verify extension
            const { data: extendedWarranty, error: verifyError } = await supabase
              .from('warranties')
              .select('warranty_period_months, updated_at')
              .eq('id', warranty.id)
              .single();

            if (verifyError) throw verifyError;

            // Restore original duration
            await supabase
              .from('warranties')
              .update({ warranty_period_months: originalDuration })
              .eq('id', warranty.id);

            return {
              success: extendedWarranty.warranty_period_months === originalDuration + extensionMonths,
              message: "Warranty extension successful",
              details: { 
                originalDuration, 
                newDuration: extendedWarranty.warranty_period_months,
                extensionMonths 
              },
              duration: Date.now() - startTime,
              testName: "Warranty Extension Test",
              category: "Warranty Management",
              priority: "Medium",
              module: "Warranty"
            };

          } catch (error: any) {
            return {
              success: false,
              message: "Warranty extension failed",
              error: error.message,
              duration: Date.now() - startTime,
              testName: "Warranty Extension Test",
              category: "Warranty Management",
              priority: "Medium",
              module: "Warranty"
            };
          }
        }
      }
    ];
  }, []);

  return { createWarrantyTests };
};