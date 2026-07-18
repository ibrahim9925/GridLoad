// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedSalesInventoryIntegration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Complete sales workflow with all integrations
  const createCompleteSale = async (saleData: any, saleItems: any[]) => {
    setIsLoading(true);
    try {
      console.log('🔄 Creating complete sale with data:', { saleData, saleItems });
      
      // Validate input data
      if (!saleData || !saleItems || saleItems.length === 0) {
        throw new Error('Invalid sale data: Missing sale data or sale items');
      }

      // Ensure sale data only contains valid columns for sales table
      const cleanSaleData = buildCleanSaleData(saleData);

      console.log('🔄 Inserting clean sale data:', cleanSaleData);

      // Step 1: Create the sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([cleanSaleData])
        .select()
        .single();

      if (saleError) {
        console.error('❌ Error creating sale:', saleError);
        throw new Error(`Failed to create sale: ${saleError.message}`);
      }

      console.log('✅ Sale created successfully:', sale.id);

      // Step 2: Create sale items
      const saleItemsWithSaleId = buildSaleItemRows(sale.id, saleItems);

      console.log('🔄 Inserting sale items:', saleItemsWithSaleId);

      await insertSaleItems(saleItemsWithSaleId);

      console.log('✅ Sale items created successfully');

      // The comprehensive_sales_automation trigger will automatically:
      // - Deduct inventory
      // - Create stock movements
      // - Create installations (if needed)
      // - Create warranties (if applicable)

      toast({
        title: "Success",
        description: "Sale created successfully with full automation applied.",
      });

      return sale;
    } catch (error: any) {
      console.error('❌ Error in complete sales workflow:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create sale.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const buildCleanSaleData = (saleData: any) => ({
    customer_id: saleData.customer_id,
    sales_rep_id: saleData.sales_rep_id,
    payment_status: saleData.payment_status,
    sale_date: saleData.sale_date,
    notes: saleData.notes,
    subtotal_before_discount: saleData.subtotal_before_discount,
    discount_type: saleData.discount_type,
    discount_percentage: saleData.discount_percentage,
    discount_amount: saleData.discount_amount,
    subtotal: saleData.subtotal,
    tax_amount: saleData.tax_amount,
    tax_rate: saleData.tax_rate,
    delivery_charges: saleData.delivery_charges,
    total_amount: saleData.total_amount,
    is_installment: saleData.is_installment,
    installment_plan_type: saleData.installment_plan_type,
    balance_due: saleData.balance_due,
    fulfillment_status: saleData.fulfillment_status,
    delivery_company_name: saleData.delivery_company_name ?? null,
    delivery_date: saleData.delivery_date ?? null,
    expected_payment_date: saleData.expected_payment_date ?? null,
  });

  const buildSaleItemRows = (saleId: string, saleItems: any[]) =>
    saleItems.map((item) => ({
      sale_id: saleId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total ?? item.line_total,
      serial_number: item.serial_number?.trim?.() || item.serial_number || null,
      has_missing_serials: item.has_missing_serials ?? false,
    }));

  const insertSaleItems = async (rows: any[]) => {
    const { error } = await supabase.from('sale_items').insert(rows);
    if (error?.message?.includes('has_missing_serials')) {
      const stripped = rows.map(({ has_missing_serials: _flag, ...rest }) => rest);
      const { error: retryError } = await supabase.from('sale_items').insert(stripped);
      if (retryError) throw retryError;
      console.warn('sale_items.has_missing_serials column missing — run npm run db:push');
      return;
    }
    if (error) throw error;
  };

  const restoreStockForSaleItems = async (saleId: string) => {
    const { data: existingItems, error } = await supabase
      .from('sale_items')
      .select('product_id, quantity')
      .eq('sale_id', saleId);
    if (error) throw error;

    for (const item of existingItems || []) {
      if (!item.product_id || !item.quantity) continue;
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', item.product_id)
        .single();
      if (productError) throw productError;

      const { error: restoreError } = await supabase
        .from('products')
        .update({
          current_stock: (Number(product?.current_stock) || 0) + Number(item.quantity),
        })
        .eq('id', item.product_id);
      if (restoreError) throw restoreError;
    }
  };

  const updateCompleteSale = async (saleId: string, saleData: any, saleItems: any[]) => {
    setIsLoading(true);
    try {
      if (!saleId) {
        throw new Error('Invalid sale data: Missing sale ID for update');
      }
      if (!saleData || !saleItems || saleItems.length === 0) {
        throw new Error('Invalid sale data: Missing sale data or sale items');
      }

      const cleanSaleData = buildCleanSaleData(saleData);
      console.log('🔄 Updating sale:', saleId, cleanSaleData);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .update(cleanSaleData)
        .eq('id', saleId)
        .select()
        .single();

      if (saleError) {
        console.error('❌ Error updating sale:', saleError);
        throw new Error(`Failed to update sale: ${saleError.message}`);
      }

      // Restore stock for existing lines before replace — insert trigger deducts again
      await restoreStockForSaleItems(saleId);

      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);

      if (deleteItemsError) {
        console.error('❌ Error deleting existing sale items:', deleteItemsError);
        throw new Error(`Failed to replace sale items: ${deleteItemsError.message}`);
      }

      const saleItemsWithSaleId = buildSaleItemRows(saleId, saleItems);
      await insertSaleItems(saleItemsWithSaleId);

      console.log('✅ Sale updated successfully:', saleId);
      return sale;
    } catch (error: any) {
      console.error('❌ Error in sale update workflow:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update sale.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get detailed sales analytics
  const getSalesAnalytics = async (startDate?: string, endDate?: string) => {
    try {
      const query = supabase
        .from('sales')
        .select(`
          *,
          sale_items(
            *,
            products(name, sku)
          ),
          customers(contact_person, company_name),
          installations(status, completion_date),
          warranties(status, warranty_end_date)
        `)
        .order('created_at', { ascending: false });

      if (startDate) {
        query.gte('sale_date', startDate);
      }
      if (endDate) {
        query.lte('sale_date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error fetching sales analytics:', error);
      throw error;
    }
  };

  // Get inventory status with sales impact
  const getInventoryWithSalesImpact = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          stock_movements(
            quantity,
            movement_type,
            created_at,
            reference_type
          ),
          stock_alerts(
            alert_type,
            severity,
            is_acknowledged
          )
        `)
        .order('name');

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error fetching inventory with sales impact:', error);
      throw error;
    }
  };

  // Process Purchase Order receipt with automation
  const processPOReceipt = async (purchaseOrderId: string, items: any[]) => {
    setIsLoading(true);
    try {
      // Update PO items with received quantities
      for (const item of items) {
        const { error: itemError } = await supabase
          .from('purchase_order_items')
          .update({ received_quantity: item.received_quantity })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      // Update PO status to received
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', purchaseOrderId);

      if (poError) throw poError;

      // The enhanced_po_completion trigger will automatically:
      // - Update inventory levels
      // - Create stock movements
      // - Update inventory valuations
      // - Generate stock alerts

      toast({
        title: "Success",
        description: "Purchase order received and inventory updated automatically.",
      });

      return true;
    } catch (error: any) {
      console.error('Error processing PO receipt:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process purchase order receipt.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get workflow status for a sale
  const getSaleWorkflowStatus = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(
            quantity,
            products(name, requires_installation, warranty_months)
          ),
          installations(status, completion_date),
          warranties(status, warranty_end_date),
          stock_movements(quantity, movement_type)
        `)
        .eq('id', saleId)
        .single();

      if (error) throw error;

      return {
        sale: data,
        hasInstallation: data.installations?.length > 0,
        hasWarranties: data.warranties?.length > 0,
        stockDeducted: data.stock_movements?.length > 0,
        workflowComplete: data.installations?.every((i: any) => i.status === 'completed') &&
                         data.warranties?.every((w: any) => w.status === 'active')
      };
    } catch (error: any) {
      console.error('Error fetching sale workflow status:', error);
      throw error;
    }
  };

  return {
    isLoading,
    createCompleteSale,
    updateCompleteSale,
    getSalesAnalytics,
    getInventoryWithSalesImpact,
    processPOReceipt,
    getSaleWorkflowStatus
  };
};