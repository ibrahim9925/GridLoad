// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WarrantyStats {
  activeWarranties: number;
  expiredWarranties: number;
  expiringSoon: number;
  pendingClaims: number;
  totalClaims: number;
  loading: boolean;
  error: string | null;
}

export const useWarrantyStats = () => {
  const [stats, setStats] = useState<WarrantyStats>({
    activeWarranties: 0,
    expiredWarranties: 0,
    expiringSoon: 0,
    pendingClaims: 0,
    totalClaims: 0,
    loading: true,
    error: null
  });

  const fetchWarrantyStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      // Fetch warranty statistics
      const { data: warrantyData, error: warrantyError } = await supabase
        .from('warranties')
        .select('status, warranty_end_date');

      if (warrantyError) throw warrantyError;

      // Fetch warranty claims statistics
      const { data: claimsData, error: claimsError } = await supabase
        .from('warranty_claims')
        .select('status');

      if (claimsError) throw claimsError;

      // Calculate statistics
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const active = warrantyData?.filter(w => w.status === 'active').length || 0;
      const expired = warrantyData?.filter(w => w.status === 'expired').length || 0;
      const expiringSoon = warrantyData?.filter(w => {
        if (w.status !== 'active') return false;
        const endDate = new Date(w.warranty_end_date);
        return endDate >= now && endDate <= thirtyDaysFromNow;
      }).length || 0;

      const pendingClaims = claimsData?.filter(c => c.status === 'pending').length || 0;
      const totalClaims = claimsData?.length || 0;

      setStats({
        activeWarranties: active,
        expiredWarranties: expired,
        expiringSoon: expiringSoon,
        pendingClaims: pendingClaims,
        totalClaims: totalClaims,
        loading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Error fetching warranty stats:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch warranty statistics'
      }));
    }
  };

  useEffect(() => {
    fetchWarrantyStats();
  }, []);

  return {
    ...stats,
    refetch: fetchWarrantyStats
  };
};