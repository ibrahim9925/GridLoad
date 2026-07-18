// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePurchasingStats = () => {
  return useQuery({
    queryKey: ['purchasing-stats'],
    queryFn: async () => {
      const [suppliersRes, pendingPORes, monthlySpendRes, lowStockRes] = await Promise.all([
        supabase.from('suppliers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).in('status', ['draft', 'pending', 'sent']),
        supabase.from('purchase_orders').select('total_amount').gte('order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).not('min_stock_level', 'is', null).filter('current_stock', 'lte', 'min_stock_level'),
      ]);

      const monthlyTotal = (monthlySpendRes.data || []).reduce((s, po) => s + Number(po.total_amount || 0), 0);

      return {
        activeSuppliers: suppliersRes.count || 0,
        pendingOrders: pendingPORes.count || 0,
        monthlySpend: monthlyTotal,
        lowStockAlerts: lowStockRes.count || 0,
      };
    },
    staleTime: 30_000,
  });
};
