/** Frontend-only electricity-bill → solar-system sizing for the public site. */

export const PEAK_SUN_HOURS = 4.5;
export const PANEL_KW = 0.35;
export const PANEL_AREA_M2 = 2;
export const GRIDLOAD_SAVINGS_RATE = 0.7;
/** Estimated installed ₪ per kW — chosen so the spec example (21 kW, ₪17,640/yr) pays back in 3.2 years. */
export const INSTALLED_COST_PER_KW_ILS = 2700;

export type BillAnalyzerInput = {
  monthlyBill: number;
  pricePerKwh: number;
  roofSizeM2: number;
  dailyUsageHours?: number | null;
  batteryNeeded: boolean;
};

export type BillAnalyzerResult = {
  monthlyKwh: number;
  dailyKwh: number;
  systemSizeKw: number;
  batteryCapacityKwh: number | null;
  panelsNeeded: number;
  spaceRequiredM2: number;
  roofSizeM2: number;
  roofTooSmall: boolean;
  currentMonthlyCost: number;
  gridloadMonthlyCost: number;
  annualSavings: number;
  paybackYears: number;
  dailyUsageHours: number | null;
};

export function calculateBillRecommendation(input: BillAnalyzerInput): BillAnalyzerResult {
  const monthlyKwh = input.monthlyBill / input.pricePerKwh;
  const dailyKwh = monthlyKwh / 30;
  const systemSizeKw = Math.round(dailyKwh / PEAK_SUN_HOURS);
  const batteryCapacityKwh = input.batteryNeeded ? Math.round(dailyKwh * 1.3) : null;
  const panelsNeeded = Math.ceil((systemSizeKw * 1000) / (PANEL_KW * 1000));
  const spaceRequiredM2 = panelsNeeded * PANEL_AREA_M2;
  const annualSavings = input.monthlyBill * 12 * GRIDLOAD_SAVINGS_RATE;
  const gridloadMonthlyCost = input.monthlyBill * (1 - GRIDLOAD_SAVINGS_RATE);
  const paybackYears =
    annualSavings > 0 ? (systemSizeKw * INSTALLED_COST_PER_KW_ILS) / annualSavings : 0;

  return {
    monthlyKwh: Math.round(monthlyKwh),
    dailyKwh: Math.round(dailyKwh),
    systemSizeKw,
    batteryCapacityKwh,
    panelsNeeded,
    spaceRequiredM2,
    roofSizeM2: input.roofSizeM2,
    roofTooSmall: input.roofSizeM2 < spaceRequiredM2,
    currentMonthlyCost: input.monthlyBill,
    gridloadMonthlyCost: Math.round(gridloadMonthlyCost),
    annualSavings,
    paybackYears,
    dailyUsageHours: input.dailyUsageHours ?? null,
  };
}

export function formatIls(value: number): string {
  return `₪${Math.round(value).toLocaleString("en-US")}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function quoteSearchParams(result: BillAnalyzerResult): string {
  const params = new URLSearchParams({
    product: `${result.systemSizeKw} kW solar system`,
    system: String(result.systemSizeKw),
    panels: String(result.panelsNeeded),
    roof: String(result.roofSizeM2),
    space: String(result.spaceRequiredM2),
    bill: String(result.currentMonthlyCost),
  });
  if (result.batteryCapacityKwh != null) {
    params.set("battery", String(result.batteryCapacityKwh));
  }
  if (result.dailyUsageHours != null) {
    params.set("hours", String(result.dailyUsageHours));
  }
  params.set("message", buildQuoteMessage(result));
  return params.toString();
}

export function buildQuoteMessage(result: BillAnalyzerResult): string {
  const lines = [
    "I'd like a custom quote based on the GridLoad bill analyzer:",
    `• Monthly bill: ${formatIls(result.currentMonthlyCost)}`,
    `• Recommended system: ${result.systemSizeKw} kW`,
    result.batteryCapacityKwh != null
      ? `• Battery: ${formatNumber(result.batteryCapacityKwh)} kWh`
      : "• Battery: not requested",
    `• Panels: ${formatNumber(result.panelsNeeded)}`,
    `• Roof available: ${formatNumber(result.roofSizeM2)} m² (about ${formatNumber(result.spaceRequiredM2)} m² needed)`,
  ];
  if (result.dailyUsageHours != null) {
    lines.push(`• Typical daily usage: ${result.dailyUsageHours} hours`);
  }
  return lines.join("\n");
}
