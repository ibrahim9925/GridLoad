// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { invalidateCompanyInfo } from "@/utils/companySettings";

const FIELDS: Array<{ key: string; label: string; placeholder?: string; multiline?: boolean }> = [
  { key: "company_name", label: "Company Name" },
  { key: "company_tagline", label: "Tagline" },
  { key: "company_email", label: "Email" },
  { key: "company_phone", label: "Phone" },
  { key: "company_tax_id", label: "Tax ID" },
  { key: "company_website", label: "Website" },
  { key: "company_iban", label: "IBAN" },
  { key: "company_bank_details", label: "Bank Details (footer)" },
  { key: "warranty_contact", label: "Warranty Claims Email" },
];

const CompanySettingsManager: React.FC = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("company_settings").select("key, value");
        if (error) throw error;
        const map: Record<string, string> = {};
        (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
        setValues(map);
      } catch (e: any) {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const rows = FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
      const { error } = await supabase.from("company_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      invalidateCompanyInfo();
      toast({ title: "Saved", description: "Company info updated. New PDFs will use these values." });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Settings</CardTitle>
        <CardDescription>
          These values appear on every invoice, receipt, and warranty PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.key === "company_bank_details" ? "md:col-span-2" : ""}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Company Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanySettingsManager;
