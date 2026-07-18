// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedCapitalData {
  injectedCapital: number;
  availableLiquidity: number;
  frozenCapital: number;
  outstandingPayables: number;
  utilizationRate: number;
}

export interface CompanySettings {
  injectedCapital: {
    total: number;
    currency: string;
    injections: Array<{
      amount: number;
      date: string;
      description: string;
    }>;
  };
  liquidityBufferPercentage: number;
  seasonalCoverageTargets: {
    winter: number;
    spring: number;
    summer: number;
    autumn: number;
  };
}

export interface FrozenCapitalItem {
  id: string;
  type: 'container' | 'purchase_order';
  amount: number;
  description: string;
  releaseDate?: string;
  status: string;
}

export const useEnhancedCapitalTracking = () => {
  const [capitalData, setCapitalData] = useState<EnhancedCapitalData>({
    injectedCapital: 0,
    availableLiquidity: 0,
    frozenCapital: 0,
    outstandingPayables: 0,
    utilizationRate: 0,
  });
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [frozenCapitalItems, setFrozenCapitalItems] = useState<FrozenCapitalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCapitalData = async () => {
    try {
      console.log('🔄 Enhanced capital tracking: Fetching real cash flow analysis...');
      setIsLoading(true);
      
      // Get comprehensive cash flow analysis using the new function
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .rpc('get_cash_flow_analysis') as { data: any; error: any };
      
      if (cashFlowError) {
        console.error('❌ Error fetching cash flow analysis:', cashFlowError);
        throw cashFlowError;
      }

      console.log('✅ Cash flow analysis fetched:', cashFlowData);

      // Get real injected capital
      const { data: injectedCapitalData, error: injectedError } = await supabase
        .rpc('get_real_injected_capital') as { data: number | null; error: any };
      
      if (injectedError) {
        console.error('❌ Error fetching injected capital:', injectedError);
        // Continue with default value
      }

      const injectedCapital = injectedCapitalData || 0;
      const availableLiquidity = cashFlowData?.available_cash || 0;
      const frozenCapital = (cashFlowData?.frozen_in_containers || 0) + (cashFlowData?.frozen_in_pos || 0);
      const outstandingPayables = Math.max(0, injectedCapital - availableLiquidity - frozenCapital);
      const utilizationRate = cashFlowData?.cash_utilization_rate || 0;

      const newCapitalData: EnhancedCapitalData = {
        injectedCapital,
        availableLiquidity,
        frozenCapital,
        outstandingPayables,
        utilizationRate: Number(utilizationRate.toFixed(2))
      };

      // Transform expected releases into frozen capital items
      const expectedReleases = cashFlowData?.expected_releases || [];
      const newFrozenCapitalItems: FrozenCapitalItem[] = expectedReleases.map((release: any, index: number) => ({
        id: `${release.type}-${index}`,
        type: release.type === 'container' ? 'container' as const : 'purchase_order' as const,
        amount: Number(release.amount),
        description: `${release.type === 'container' ? 'Container' : 'Purchase Order'} - ₪${release.amount.toLocaleString()}`,
        status: 'active',
        releaseDate: release.date || undefined
      }));

      // Fetch company settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value');

      if (settingsError) {
        console.error('❌ Error fetching company settings:', settingsError);
        // Continue with empty settings
      }

      // Get actual capital injections for detailed display
      const { data: injections } = await supabase
        .from('capital_injections')
        .select('amount, injection_date, description, currency')
        .order('injection_date', { ascending: false });

      // Transform settings
      const settingsMap = settingsData?.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {}) || {};

      const companySettingsData: CompanySettings = {
        injectedCapital: {
          total: injectedCapital,
          currency: 'NIS',
          injections: injections?.map(inj => ({
            amount: inj.amount,
            date: inj.injection_date,
            description: inj.description || 'Capital injection'
          })) || []
        },
        liquidityBufferPercentage: settingsMap.liquidity_buffer_percentage || 30,
        seasonalCoverageTargets: settingsMap.seasonal_coverage_targets || {
          winter: 2.0, spring: 2.5, summer: 3.0, autumn: 2.5
        }
      };

      console.log('✅ Enhanced capital data with real cash flow:', {
        injected: injectedCapital,
        available: availableLiquidity,
        frozen: frozenCapital,
        utilization: utilizationRate,
        frozenItems: newFrozenCapitalItems.length,
        safeOrderingCapacity: cashFlowData?.safe_ordering_capacity || 0
      });

      setCapitalData(newCapitalData);
      setFrozenCapitalItems(newFrozenCapitalItems);
      setCompanySettings(companySettingsData);
    } catch (error) {
      console.error('❌ Error in fetchCapitalData:', error);
      // Set default values on error
      setCapitalData({
        injectedCapital: 0,
        availableLiquidity: 0,
        frozenCapital: 0,
        outstandingPayables: 0,
        utilizationRate: 0
      });
      setFrozenCapitalItems([]);
      setCompanySettings({
        injectedCapital: { total: 0, currency: 'NIS', injections: [] },
        liquidityBufferPercentage: 30,
        seasonalCoverageTargets: {
          winter: 2.0, spring: 2.5, summer: 3.0, autumn: 2.5
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanySetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
        });

      if (error) throw error;
      await fetchCapitalData(); // Refresh data
    } catch (error) {
      console.error('Error updating company setting:', error);
    }
  };

  const addCapitalInjection = async (amount: number, description: string, currency = 'NIS') => {
    try {
      // Add to capital_injections table
      const { error: injectionError } = await supabase
        .from('capital_injections')
        .insert({
          amount,
          description,
          currency,
        });

      if (injectionError) throw injectionError;

      // Update company settings
      if (companySettings) {
        const newTotal = companySettings.injectedCapital.total + amount;
        const newInjections = [
          ...companySettings.injectedCapital.injections,
          { amount, date: new Date().toISOString().split('T')[0], description }
        ];

        await updateCompanySetting('injected_capital', {
          total: newTotal,
          currency: companySettings.injectedCapital.currency,
          injections: newInjections
        });
      }
    } catch (error) {
      console.error('Error adding capital injection:', error);
    }
  };

  useEffect(() => {
    fetchCapitalData();
  }, []);

  return {
    capitalData,
    companySettings,
    frozenCapitalItems,
    isLoading,
    refetch: fetchCapitalData,
    updateCompanySetting,
    addCapitalInjection,
  };
};