export const GRIDLOAD_SALES_PHONE_DISPLAY = "+972 59-777-9666";
export const GRIDLOAD_SALES_PHONE_TEL = "+972597779666";

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

export async function detectVisitorGeo(): Promise<VisitorGeo> {
  const timeout = AbortSignal.timeout(4000);
  try {
    const res = await fetch("https://ipwho.is/", { signal: timeout });
    if (res.ok) {
      const data = await res.json();
      const country = String(data.country ?? "");
      const code = String(data.country_code ?? "").toUpperCase();
      const blob = `${country} ${data.region ?? ""} ${data.city ?? ""} ${code}`;
      const isPalestine = code === "PS" || isPalestineName(blob);
      return {
        country: isPalestine ? "Palestine" : country || "Unknown",
        countryCode: code,
        isPalestine,
      };
    }
  } catch {
    /* fall through */
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const isPalestine = /Gaza|Hebron/.test(tz);
  return {
    country: isPalestine ? "Palestine" : "Unknown",
    countryCode: isPalestine ? "PS" : "",
    isPalestine,
  };
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
