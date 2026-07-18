// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAutomaticCommissionCalculation = () => {
  const { toast } = useToast();

  const calculateAndCreateCommissionPayment = async (saleId: string) => {
    try {
      console.log('🧮 Calculating commission for sale:', saleId);

      // Get sale details with sales rep information
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          staff!sales_sales_rep_id_fkey(id, full_name, commission_rate)
        `)
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      if (!sale.sales_rep_id || !sale.staff) {
        console.log('ℹ️ No sales rep assigned to this sale');
        return { success: true, message: 'No sales rep assigned' };
      }

      const salesRep = sale.staff as any;
      const commissionRate = salesRep.commission_rate || 0;

      if (commissionRate === 0) {
        console.log('ℹ️ Sales rep has 0% commission rate');
        return { success: true, message: 'Sales rep has 0% commission rate' };
      }

      // Calculate commission amount
      const baseCommission = (sale.total_amount * commissionRate) / 100;
      
      // Check for existing commission payment for this sale
      const { data: existingCommission } = await supabase
        .from('commission_payments')
        .select('id')
        .eq('sales_rep_id', sale.sales_rep_id)
        .eq('notes', `Commission for sale ${sale.invoice_number || sale.id}`)
        .single();

      if (existingCommission) {
        console.log('ℹ️ Commission already calculated for this sale');
        return { success: true, message: 'Commission already exists' };
      }

      // Determine period dates (current month)
      const saleDate = new Date(sale.sale_date);
      const periodStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1);
      const periodEnd = new Date(saleDate.getFullYear(), saleDate.getMonth() + 1, 0);

      // Create commission payment record
      const commissionData = {
        sales_rep_id: sale.sales_rep_id,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        base_commission: baseCommission,
        bonus_commission: 0, // Can be added later manually
        total_commission: baseCommission,
        status: 'pending',
        payment_method: 'pending',
        notes: `Commission for sale ${sale.invoice_number || sale.id} - ${commissionRate}% of $${sale.total_amount.toFixed(2)}`
      };

      const { error: commissionError } = await supabase
        .from('commission_payments')
        .insert(commissionData);

      if (commissionError) throw commissionError;

      // Update the sale to mark commission as calculated
      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          commission_amount: baseCommission,
          commission_paid: false 
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      console.log(`✅ Commission calculated: $${baseCommission.toFixed(2)} for ${salesRep.full_name}`);

      toast({
        title: "Commission Calculated",
        description: `$${baseCommission.toFixed(2)} commission pending for ${salesRep.full_name}`,
      });

      return { 
        success: true, 
        commissionAmount: baseCommission,
        salesRepName: salesRep.full_name
      };

    } catch (error: any) {
      console.error('❌ Error calculating commission:', error);
      toast({
        variant: "destructive",
        title: "Commission Calculation Failed",
        description: error.message || "Failed to calculate commission for this sale",
      });
      return { success: false, error };
    }
  };

  const recalculateMonthlyCommissions = async (salesRepId: string, month: string) => {
    try {
      console.log('🔄 Recalculating monthly commissions for:', salesRepId, month);

      const monthStart = `${month}-01`;
      const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      // Get all sales for the rep in the specified month
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          staff!sales_sales_rep_id_fkey(commission_rate)
        `)
        .eq('sales_rep_id', salesRepId)
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd);

      if (salesError) throw salesError;

      if (!sales || sales.length === 0) {
        return { success: true, message: 'No sales found for this period' };
      }

      const salesRep = (sales[0].staff as any);
      const commissionRate = salesRep?.commission_rate || 0;

      if (commissionRate === 0) {
        return { success: true, message: 'Sales rep has 0% commission rate' };
      }

      // Calculate total commission for the month
      const totalCommission = sales.reduce((sum, sale) => {
        return sum + ((sale.total_amount * commissionRate) / 100);
      }, 0);

      // Delete existing commission payment for this period
      await supabase
        .from('commission_payments')
        .delete()
        .eq('sales_rep_id', salesRepId)
        .eq('period_start', monthStart)
        .eq('period_end', monthEnd);

      // Create new consolidated commission payment
      const commissionData = {
        sales_rep_id: salesRepId,
        period_start: monthStart,
        period_end: monthEnd,
        base_commission: totalCommission,
        bonus_commission: 0,
        total_commission: totalCommission,
        status: 'pending',
        payment_method: 'pending',
        notes: `Monthly commission consolidation for ${month} - ${sales.length} sales`
      };

      const { error: commissionError } = await supabase
        .from('commission_payments')
        .insert(commissionData);

      if (commissionError) throw commissionError;

      console.log(`✅ Monthly commission recalculated: $${totalCommission.toFixed(2)}`);

      toast({
        title: "Monthly Commission Recalculated",
        description: `$${totalCommission.toFixed(2)} total commission for ${month}`,
      });

      return { 
        success: true, 
        totalCommission,
        salesCount: sales.length
      };

    } catch (error: any) {
      console.error('❌ Error recalculating monthly commissions:', error);
      toast({
        variant: "destructive",
        title: "Recalculation Failed",
        description: error.message || "Failed to recalculate monthly commissions",
      });
      return { success: false, error };
    }
  };

  const getCommissionSummary = async (salesRepId: string, startDate: string, endDate: string) => {
    try {
      // Get commission payments in date range
      const { data: commissions, error: commissionsError } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('sales_rep_id', salesRepId)
        .gte('period_start', startDate)
        .lte('period_end', endDate);

      if (commissionsError) throw commissionsError;

      // Get sales in date range
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('sales_rep_id', salesRepId)
        .gte('sale_date', startDate)
        .lte('sale_date', endDate);

      if (salesError) throw salesError;

      const summary = {
        totalCommissionEarned: commissions?.reduce((sum, c) => sum + c.total_commission, 0) || 0,
        totalCommissionPaid: commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.total_commission, 0) || 0,
        pendingCommission: commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.total_commission, 0) || 0,
        totalSales: sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0,
        salesCount: sales?.length || 0,
        commissionPaymentsCount: commissions?.length || 0
      };

      return { success: true, summary };

    } catch (error: any) {
      console.error('❌ Error getting commission summary:', error);
      return { success: false, error };
    }
  };

  return {
    calculateAndCreateCommissionPayment,
    recalculateMonthlyCommissions,
    getCommissionSummary
  };
};