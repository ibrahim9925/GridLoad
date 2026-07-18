// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SiteSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  description?: string;
  is_public?: boolean;
  category: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

interface SettingsData {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  default_tax_rate: number;
  default_warranty_months: number;
  auto_create_installations: boolean;
  stock_alert_threshold: number;
  mfa_required_roles: string[];
  session_timeout_minutes: number;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsData>({
    company_name: 'GridLoad Energy Solutions',
    company_email: 'info@gridload.com',
    company_phone: '+1-555-0123',
    company_address: '123 Energy Street, Solar City, SC 12345',
    default_tax_rate: 8.5,
    default_warranty_months: 12,
    auto_create_installations: true,
    stock_alert_threshold: 20,
    mfa_required_roles: ['admin', 'accountant'],
    session_timeout_minutes: 480,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const settingsObject: any = {};
        data.forEach((setting: any) => {
          let value = setting.setting_value;
          
          // Parse the value based on type
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // If parsing fails, keep as string
            }
          }
          
          settingsObject[setting.setting_key] = value;
        });
        
        setSettings(prev => ({ ...prev, ...settingsObject }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: "destructive",
        title: "Error loading settings",
        description: "Could not load system settings.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateSetting = useCallback(async (key: string, value: any) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: key,
          setting_value: JSON.stringify(value),
          setting_type: typeof value,
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      
      toast({
        title: "Setting updated",
        description: `${key} has been updated successfully.`,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        variant: "destructive",
        title: "Error updating setting",
        description: "Could not update the setting. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [toast]);

  const updateSettings = useCallback(async (newSettings: Partial<SettingsData>) => {
    setIsUpdating(true);
    try {
      const updatePromises = Object.entries(newSettings).map(([key, value]) =>
        supabase
          .from('site_settings')
          .upsert({
            setting_key: key,
            setting_value: JSON.stringify(value),
            setting_type: typeof value,
          }, {
            onConflict: 'setting_key'
          })
      );

      const results = await Promise.all(updatePromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Some settings failed to update');
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
      
      toast({
        title: "Settings updated",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: "Could not update settings. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isUpdating,
    updateSetting,
    updateSettings,
    refetchSettings: fetchSettings,
  };
};
