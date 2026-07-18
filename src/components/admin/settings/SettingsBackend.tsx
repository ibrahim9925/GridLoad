// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2 } from "lucide-react";

interface Settings {
  company_profile: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  taxation: {
    default_rate: number;
    inclusive: boolean;
  };
  valuation_method: string;
  otp_ttl: string;
  session_max_age: string;
  password_policy: {
    min_length: number;
    require_special: boolean;
    require_numbers: boolean;
  };
}

const SettingsBackend = () => {
  const [settings, setSettings] = useState<Settings>({
    company_profile: { name: "", address: "", phone: "", email: "" },
    taxation: { default_rate: 0.1, inclusive: false },
    valuation_method: "weighted_average",
    otp_ttl: "300",
    session_max_age: "28800",
    password_policy: { min_length: 12, require_special: true, require_numbers: true }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = (data || []).reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      setSettings({
        company_profile: settingsMap.company_profile || settings.company_profile,
        taxation: settingsMap.taxation || settings.taxation,
        valuation_method: settingsMap.valuation_method || settings.valuation_method,
        otp_ttl: settingsMap.otp_ttl || settings.otp_ttl,
        session_max_age: settingsMap.session_max_age || settings.session_max_age,
        password_policy: settingsMap.password_policy || settings.password_policy
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const user = await supabase.auth.getUser();
      const updates = Object.entries(settings).map(([k, v]) => ({
        key: k,
        value: v as any,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_profile.name}
                onChange={(e) => setSettings({
                  ...settings,
                  company_profile: { ...settings.company_profile, name: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                value={settings.company_profile.email}
                onChange={(e) => setSettings({
                  ...settings,
                  company_profile: { ...settings.company_profile, email: e.target.value }
                })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company_address">Address</Label>
            <Input
              id="company_address"
              value={settings.company_profile.address}
              onChange={(e) => setSettings({
                ...settings,
                company_profile: { ...settings.company_profile, address: e.target.value }
              })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              value={settings.taxation.default_rate * 100}
              onChange={(e) => setSettings({
                ...settings,
                taxation: { ...settings.taxation, default_rate: parseFloat(e.target.value) / 100 }
              })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="tax_inclusive"
              checked={settings.taxation.inclusive}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                taxation: { ...settings.taxation, inclusive: checked }
              })}
            />
            <Label htmlFor="tax_inclusive">Tax Inclusive Pricing</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="otp_ttl">OTP Expiry (seconds)</Label>
              <Input
                id="otp_ttl"
                type="number"
                value={settings.otp_ttl}
                onChange={(e) => setSettings({
                  ...settings,
                  otp_ttl: e.target.value
                })}
              />
            </div>
            <div>
              <Label htmlFor="session_max_age">Session Max Age (seconds)</Label>
              <Input
                id="session_max_age"
                type="number"
                value={settings.session_max_age}
                onChange={(e) => setSettings({
                  ...settings,
                  session_max_age: e.target.value
                })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="min_password_length">Minimum Password Length</Label>
            <Input
              id="min_password_length"
              type="number"
              value={settings.password_policy.min_length}
              onChange={(e) => setSettings({
                ...settings,
                password_policy: { ...settings.password_policy, min_length: parseInt(e.target.value) }
              })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsBackend;