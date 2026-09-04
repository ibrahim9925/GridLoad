import { supabase } from "@/integrations/supabase/client";
import type { BillAnalyzerLang } from "@/locales/billAnalyzer";
import type { BillAnalyzerResult } from "@/utils/billAnalyzer";

export type BillAnalyzerLeadStatus =
  | "new"
  | "callback_requested"
  | "contacted"
  | "quoted"
  | "closed";

export type BillAnalyzerLead = {
  id: string;
  first_name: string | null;
  phone: string;
  email: string | null;
  monthly_bill: number | null;
  price_per_kwh: number | null;
  roof_size: number | null;
  daily_usage_hours: number | null;
  battery_needed: boolean | null;
  monthly_consumption: number | null;
  daily_consumption: number | null;
  system_size: number | null;
  battery_capacity: number | null;
  panels_required: number | null;
  roof_space_required: number | null;
  annual_savings: number | null;
  peak_sun_hours: number | null;
  source: string | null;
  language: string | null;
  location: string | null;
  user_agent: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BillAnalyzerLeadWrite = {
  firstName?: string;
  phone: string;
  email?: string | null;
  monthlyBill: number;
  pricePerKwh: number;
  roofSize: number;
  dailyUsageHours?: number | null;
  batteryNeeded: boolean;
  result: BillAnalyzerResult;
  language: BillAnalyzerLang;
  location: string;
  peakSunHours: number;
  status?: BillAnalyzerLeadStatus;
};

function toPayload(input: BillAnalyzerLeadWrite): Record<string, unknown> {
  return {
    first_name: input.firstName?.trim() || "Customer",
    phone: input.phone,
    email: input.email?.trim() || "",
    monthly_bill: String(input.monthlyBill),
    price_per_kwh: String(input.pricePerKwh),
    roof_size: String(input.roofSize),
    daily_usage_hours: input.dailyUsageHours != null ? String(input.dailyUsageHours) : "",
    battery_needed: String(input.batteryNeeded),
    monthly_consumption: String(input.result.monthlyKwh),
    daily_consumption: String(input.result.dailyKwh),
    system_size: String(input.result.systemSizeKw),
    battery_capacity: input.result.batteryCapacityKwh != null ? String(input.result.batteryCapacityKwh) : "",
    panels_required: String(input.result.panelsNeeded),
    roof_space_required: String(input.result.spaceRequiredM2),
    annual_savings: String(input.result.annualSavings),
    peak_sun_hours: String(input.peakSunHours),
    source: "bill-analyzer",
    language: input.language,
    location: input.location,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    status: input.status ?? "new",
  };
}

export async function upsertBillAnalyzerLead(input: BillAnalyzerLeadWrite): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc("submit_bill_analyzer_lead" as never, {
      payload: toPayload(input),
    } as never);
    return { error: error?.message ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead save failed";
    console.error("Failed to save bill analyzer lead:", err);
    return { error: message };
  }
}

export function buildLeadShareText(input: BillAnalyzerLeadWrite): string {
  const r = input.result;
  return [
    "GridLoad Bill Analyzer lead",
    `Name: ${input.firstName?.trim() || "Customer"}`,
    `Phone: ${input.phone}`,
    input.email ? `Email: ${input.email}` : null,
    `Location: ${input.location}`,
    `Language: ${input.language}`,
    `Monthly bill: ${input.monthlyBill}`,
    `Price/kWh: ${input.pricePerKwh}`,
    `Roof: ${input.roofSize} m²`,
    `System: ${r.systemSizeKw} kW`,
    r.batteryCapacityKwh != null ? `Battery: ${r.batteryCapacityKwh} kWh` : "Battery: no",
    `Panels: ${r.panelsNeeded}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function requestBillAnalyzerCallback(phone: string, input?: BillAnalyzerLeadWrite): Promise<{ error: string | null }> {
  try {
    if (input) {
      return upsertBillAnalyzerLead({ ...input, phone, status: "callback_requested" });
    }
    const { error } = await supabase.rpc("submit_bill_analyzer_lead" as never, {
      payload: {
        first_name: "Customer",
        phone,
        status: "callback_requested",
        source: "bill-analyzer",
      },
    } as never);
    return { error: error?.message ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Callback save failed";
    console.error("Failed to save callback request:", err);
    return { error: message };
  }
}

export async function fetchBillAnalyzerLeads(): Promise<{ data: BillAnalyzerLead[]; error: string | null }> {
  const { data, error } = await supabase
    .from("bill_analyzer_leads" as never)
    .select("*")
    .order("created_at", { ascending: false });
  return {
    data: (data as BillAnalyzerLead[]) ?? [],
    error: error?.message ?? null,
  };
}

export async function updateBillAnalyzerLeadStatus(
  id: string,
  status: BillAnalyzerLeadStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("bill_analyzer_leads" as never)
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  return { error: error?.message ?? null };
}
