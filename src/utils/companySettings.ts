// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface CompanyInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  taxId: string;
  website: string;
  iban: string;
  bankDetails: string;
  warrantyContact: string;
}

const DEFAULTS: CompanyInfo = {
  name: "GridLoad Energy Solutions",
  tagline: "Solar Equipment Import & Distribution — Palestine",
  email: "info@gridloadenergy.com",
  phone: "+970-XXX-XXXX",
  taxId: "PS-XXXXXXX",
  website: "www.gridloadenergy.com",
  iban: "PS00XXXXXXXXXXXXXXXXXXXX",
  bankDetails: "Bank of Palestine | Account: XXXXXXXXXXXX",
  warrantyContact: "warranty@gridloadenergy.com",
};

const KEY_MAP: Record<keyof CompanyInfo, string> = {
  name: "company_name",
  tagline: "company_tagline",
  email: "company_email",
  phone: "company_phone",
  taxId: "company_tax_id",
  website: "company_website",
  iban: "company_iban",
  bankDetails: "company_bank_details",
  warrantyContact: "warranty_contact",
};

let cached: CompanyInfo | null = null;

export const fetchCompanyInfo = async (force = false): Promise<CompanyInfo> => {
  if (cached && !force) return cached;
  try {
    const { data, error } = await supabase
      .from("company_settings")
      .select("key, value");
    if (error) throw error;
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
    const result = { ...DEFAULTS };
    (Object.keys(KEY_MAP) as Array<keyof CompanyInfo>).forEach((k) => {
      const v = map[KEY_MAP[k]];
      if (v) (result as any)[k] = v;
    });
    cached = result;
    return result;
  } catch {
    return DEFAULTS;
  }
};

export const invalidateCompanyInfo = () => { cached = null; };

export const COMPANY_SETTING_KEYS = KEY_MAP;
export const COMPANY_DEFAULTS = DEFAULTS;

/** iOS-Safari-safe PDF download via anchor click in a user-gesture handler. */
export const downloadPdfIOSSafe = (doc: any, filename: string) => {
  try {
    const dataUri = doc.output("datauristring", { filename });
    const a = document.createElement("a");
    a.href = dataUri;
    a.target = "_blank";
    a.rel = "noopener";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 100);
  } catch {
    try { doc.save(filename); } catch {}
  }
};
