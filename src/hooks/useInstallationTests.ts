// @ts-nocheck
import { useCallback } from "react";
import type { BusinessTest } from "./useBusinessTestTypes";
import { supabase } from "@/integrations/supabase/client";

export const useInstallationTests = () => {
  const createInstallationTests = useCallback((): BusinessTest[] => {
    const tests: BusinessTest[] = [
      {
        name: "Installation Workflow Test",
        category: "Installation Management",
        description: "Test complete installation workflow from scheduling to completion",
        module: "Installations",
        priority: "Critical",
        fn: async () => {
          const startTime = Date.now();
          let customerId: string | null = null;
          let saleId: string | null = null;
          let installationId: string | null = null;

          try {
            // Create test customer
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_name: 'Installation Test Customer',
                contact_person: 'Install Contact',
                email: 'install@test.com',
                phone: '555-0125',
                address: '123 Installation St'
              })
              .select()
              .single();

            if (customerError) throw customerError;
            customerId = customerData.id;

            // Create test sale
            const { data: saleData, error: saleError } = await supabase
              .from('sales')
              .insert({
                customer_id: customerId,
                sale_date: new Date().toISOString().split('T')[0],
                total_amount: 15000,
                payment_status: 'paid',
                fulfillment_status: 'pending',
                requires_installation: true
              })
              .select()
              .single();

            if (saleError) throw saleError;
            saleId = saleData.id;

            // Create installation
            const { data: installationData, error: installationError } = await supabase
              .from('installations')
              .insert({
                sale_id: saleId,
                customer_id: customerId,
                status: 'scheduled',
                site_address: customerData.address,
                installation_notes: 'Test installation for solar system',
                scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              })
              .select()
              .single();

            if (installationError) throw installationError;
            installationId = installationData.id;

            // Update installation to in_progress
            const { error: progressError } = await supabase
              .from('installations')
              .update({
                status: 'in_progress'
              })
              .eq('id', installationId);

            if (progressError) throw progressError;

            // Complete installation
            const { error: completeError } = await supabase
              .from('installations')
              .update({
                status: 'completed',
                completion_date: new Date().toISOString().split('T')[0]
              })
              .eq('id', installationId);

            if (completeError) throw completeError;

            // Verify installation completion updated sale
            const { data: updatedSale } = await supabase
              .from('sales')
              .select('fulfillment_status, actual_delivery_date')
              .eq('id', saleId)
              .single();

            const installationCompleted = updatedSale?.fulfillment_status === 'delivered';

            return {
              success: installationCompleted,
              message: installationCompleted ? 
                "Installation workflow completed successfully and sale status updated" :
                "Installation workflow test failed",
              details: {
                installationId,
                saleId,
                finalStatus: updatedSale?.fulfillment_status,
                deliveryDate: updatedSale?.actual_delivery_date,
                installationCompleted
              },
              duration: Date.now() - startTime,
              testName: "Installation Workflow Test",
              category: "Installation Management",
              priority: "Critical",
              module: "Installations"
            };

          } catch (err: any) {
            return {
              success: false,
              message: "Installation workflow test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Installation Workflow Test",
              category: "Installation Management",
              priority: "Critical",
              module: "Installations"
            };
          } finally {
            // Cleanup
            if (installationId) {
              await supabase.from('installation_reports').delete().eq('installation_id', installationId);
              await supabase.from('installations').delete().eq('id', installationId);
            }
            if (saleId) {
              await supabase.from('sale_items').delete().eq('sale_id', saleId);
              await supabase.from('sales').delete().eq('id', saleId);
            }
            if (customerId) {
              await supabase.from('customers').delete().eq('id', customerId);
            }
          }
        }
      },

      {
        name: "Installation Report Management Test",
        category: "Installation Management",
        description: "Test installation report creation and image upload functionality",
        module: "Installations",
        priority: "High",
        fn: async () => {
          const startTime = Date.now();
          let customerId: string | null = null;
          let installationId: string | null = null;
          let reportId: string | null = null;

          try {
            // Create test customer
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_name: 'Report Test Customer',
                contact_person: 'Report Contact',
                email: 'report@test.com',
                phone: '555-0126'
              })
              .select()
              .single();

            if (customerError) throw customerError;
            customerId = customerData.id;

            // Create installation
            const { data: installationData, error: installationError } = await supabase
              .from('installations')
              .insert({
                customer_id: customerId,
                status: 'in_progress',
                site_address: '456 Report Ave',
                installation_notes: 'Test installation for reporting'
              })
              .select()
              .single();

            if (installationError) throw installationError;
            installationId = installationData.id;

            // Create installation report
            const { data: reportData, error: reportError } = await supabase
              .from('installation_reports')
              .insert({
                installation_id: installationId,
                report_type: 'progress',
                description: 'Installation progress report - panels mounted',
                image_url: 'https://example.com/test-image.jpg'
              })
              .select()
              .single();

            if (reportError) throw reportError;
            reportId = reportData.id;

            // Add another report
            const { data: finalReportData, error: finalReportError } = await supabase
              .from('installation_reports')
              .insert({
                installation_id: installationId,
                report_type: 'completion',
                description: 'Installation completed successfully',
                image_url: 'https://example.com/completion-image.jpg'
              })
              .select()
              .single();

            if (finalReportError) throw finalReportError;

            // Verify reports were created
            const { data: allReports } = await supabase
              .from('installation_reports')
              .select('*')
              .eq('installation_id', installationId);

            const reportCreated = allReports && allReports.length === 2;
            const hasProgressReport = allReports?.some(r => r.report_type === 'progress');
            const hasCompletionReport = allReports?.some(r => r.report_type === 'completion');

            return {
              success: reportCreated && hasProgressReport && hasCompletionReport,
              message: reportCreated ? 
                `Created ${allReports?.length} installation reports successfully` :
                "Installation report creation failed",
              details: {
                installationId,
                reportCount: allReports?.length || 0,
                hasProgressReport,
                hasCompletionReport,
                reportTypes: allReports?.map(r => r.report_type) || []
              },
              duration: Date.now() - startTime,
              testName: "Installation Report Management Test",
              category: "Installation Management",
              priority: "High",
              module: "Installations"
            };

          } catch (err: any) {
            return {
              success: false,
              message: "Installation report management test failed",
              error: err.message,
              duration: Date.now() - startTime,
              testName: "Installation Report Management Test",
              category: "Installation Management",
              priority: "High",
              module: "Installations"
            };
          } finally {
            // Cleanup
            if (installationId) {
              await supabase.from('installation_reports').delete().eq('installation_id', installationId);
              await supabase.from('installations').delete().eq('id', installationId);
            }
            if (customerId) {
              await supabase.from('customers').delete().eq('id', customerId);
            }
          }
        }
      }
    ];

    return tests;
  }, []);

  return { createInstallationTests };
};