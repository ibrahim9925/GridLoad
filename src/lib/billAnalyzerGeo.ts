export const GRIDLOAD_SALES_PHONE_DISPLAY = "+972 59-777-9666";
export const GRIDLOAD_SALES_PHONE_TEL = "+972597779666";
export const GRIDLOAD_WHATSAPP_E164 = "972597779666";
export const GRIDLOAD_LEADS_EMAIL = "info@gridload.com";

export const LOCATION_STORAGE_KEY = "gridload.billAnalyzer.location";

export const LOCATION_OPTIONS = [
  { id: "Palestine", code: "PS" },
  { id: "Jordan", code: "JO" },
  { id: "Lebanon", code: "LB" },
  { id: "Egypt", code: "EG" },
  { id: "Saudi Arabia", code: "SA" },
  { id: "United Arab Emirates", code: "AE" },
  { id: "Iraq", code: "IQ" },
  { id: "Syria", code: "SY" },
  { id: "Other", code: "" },
] as const;

export type LocationId = (typeof LOCATION_OPTIONS)[number]["id"];

export type VisitorGeo = {
  country: string;
  countryCode: string;
  isPalestine: boolean;
};

const PALESTINE_HINT =
  /palestine|gaza|west bank|ramallah|nablus|hebron|bethlehem|jenin|tulkarm|qalqilya|jericho|rafah|khan yunis/i;

export function isPalestineName(value: string): boolean {
  return PALESTINE_HINT.test(value) || value.trim().toUpperCase() === "PS";
}

export function isPalestineLocation(id: string): boolean {
  return id === "Palestine" || isPalestineName(id);
}

export function readStoredLocation(): LocationId | null {
  try {
    const value = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (LOCATION_OPTIONS.some((o) => o.id === value)) return value as LocationId;
  } catch {
    /* ignore */
  }
  return null;
}

export function storeLocation(id: LocationId) {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function mapCountryToLocation(country: string, code: string): LocationId {
  const blob = `${country} ${code}`.toUpperCase();
  if (code === "PS" || isPalestineName(`${country} ${code}`)) return "Palestine";
  if (code === "JO" || blob.includes("JORDAN")) return "Jordan";
  if (code === "LB" || blob.includes("LEBANON")) return "Lebanon";
  if (code === "EG" || blob.includes("EGYPT")) return "Egypt";
  if (code === "SA" || blob.includes("SAUDI")) return "Saudi Arabia";
  if (code === "AE" || blob.includes("EMIRATES") || blob.includes("UAE")) return "United Arab Emirates";
  if (code === "IQ" || blob.includes("IRAQ")) return "Iraq";
  if (code === "SY" || blob.includes("SYRIA")) return "Syria";
  return "Other";
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** ip-api.com first, then ipwho.is. */
export async function detectVisitorGeo(): Promise<VisitorGeo> {
  const ipApi = await fetchJson("https://ip-api.com/json/?fields=status,country,countryCode,regionName,city");
  if (ipApi && ipApi.status === "success") {
    const country = String(ipApi.country ?? "");
    const code = String(ipApi.countryCode ?? "").toUpperCase();
    const region = `${ipApi.regionName ?? ""} ${ipApi.city ?? ""}`;
    const isPalestine = code === "PS" || isPalestineName(`${country} ${region}`);
    return {
      country: isPalestine ? "Palestine" : country || "Unknown",
      countryCode: code,
      isPalestine,
    };
  }

  const ipwho = await fetchJson("https://ipwho.is/");
  if (ipwho && ipwho.success !== false) {
    const country = String(ipwho.country ?? "");
    const code = String(ipwho.country_code ?? "").toUpperCase();
    const blob = `${country} ${ipwho.region ?? ""} ${ipwho.city ?? ""} ${code}`;
    const isPalestine = code === "PS" || isPalestineName(blob);
    return {
      country: isPalestine ? "Palestine" : country || "Unknown",
      countryCode: code,
      isPalestine,
    };
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const isPalestine = /Gaza|Hebron/.test(tz);
  return {
    country: isPalestine ? "Palestine" : "Unknown",
    countryCode: isPalestine ? "PS" : "",
    isPalestine,
  };
}

export function locationFromGeo(geo: VisitorGeo): LocationId {
  return mapCountryToLocation(geo.country, geo.countryCode);
}

export function preferredLanguage(_isPalestine: boolean): "en" | "ar" {
  if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ar")) {
    return "ar";
  }
  return "en";
}

/** Accept +972 / +970 / 05X local numbers. */
export function isValidLocalPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 11 && digits.length <= 13) return true;
  if (digits.startsWith("970") && digits.length >= 11 && digits.length <= 13) return true;
  if (digits.startsWith("05") && digits.length === 10) return true;
  if (digits.startsWith("5") && digits.length === 9) return true;
  return false;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return `+${digits}`;
  if (digits.startsWith("970")) return `+${digits}`;
  if (digits.startsWith("05") && digits.length === 10) return `+972${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `+972${digits}`;
  return raw.trim();
}

export function whatsappLeadUrl(text: string): string {
  return `https://wa.me/${GRIDLOAD_WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}

export function mailtoLeadUrl(subject: string, body: string): string {
  return `mailto:${GRIDLOAD_LEADS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
