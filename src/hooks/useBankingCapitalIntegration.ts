// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BankingCapitalData {
  totalCapitalUsd: number;
  totalCapitalNis: number;
  totalCapitalEur: number;
  availableCapitalUsd: number;
  availableCapitalNis: number;
  availableCapitalEur: number;
  frozenCapital: number;
  utilizationRate: number;
}

export const useBankingCapitalIntegration = () => {
  const [capitalData, setCapitalData] = useState<BankingCapitalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBankingCapital = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_banking_capital_summary');
      
      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data[0];
        setCapitalData({
          totalCapitalUsd: Number(summary.total_capital_usd || 0),
          totalCapitalNis: Number(summary.total_capital_nis || 0),
          totalCapitalEur: Number(summary.total_capital_eur || 0),
          availableCapitalUsd: Number(summary.available_capital_usd || 0),
          availableCapitalNis: Number(summary.available_capital_nis || 0),
          availableCapitalEur: Number(summary.available_capital_eur || 0),
          frozenCapital: Number(summary.frozen_capital || 0),
          utilizationRate: Number(summary.utilization_rate || 0)
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching banking capital:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankingCapital();
  }, []);

  return {
    capitalData,
    isLoading,
    error,
    refetch: fetchBankingCapital
  };
};