import en from "./bill-analyzer-en.json";
import ar from "./bill-analyzer-ar.json";

export type BillAnalyzerLang = "en" | "ar";
export type BillAnalyzerCopy = typeof en;

const dictionaries: Record<BillAnalyzerLang, BillAnalyzerCopy> = { en, ar };

export function billAnalyzerCopy(lang: BillAnalyzerLang): BillAnalyzerCopy {
  return dictionaries[lang] ?? en;
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
