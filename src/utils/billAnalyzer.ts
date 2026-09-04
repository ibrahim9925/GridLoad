/** Frontend-only electricity-bill → solar-system sizing for the public site.
 *
 * Formulas are documented in docs/BILL_ANALYZER_CALCULATION_AUDIT.md
 * Example (₪1,500 / ₪0.65 / 100 m² / battery yes):
 *   1500/0.65 = 2307.69 → 2,308 kWh/month
 *   2307.69/30 = 76.92 → 77 kWh/day
 *   76.92/4.5 = 17.09 → 17 kW
 *   76.92×1.3 = 100 kWh battery nameplate
 */

/** Conservative Palestine annual peak-sun-hours (winter-weighted vs ~5.0–5.6 typical). */
export const PEAK_SUN_HOURS = 4.5;
/** 350 W module. */
export const PANEL_KW = 0.35;
/** Rule-of-thumb footprint including light row spacing. Real layouts often need 2.2–2.5 m². */
export const PANEL_AREA_M2 = 2;
export const GRIDLOAD_SAVINGS_RATE = 0.7;
/** Calendar convention for daily kWh — not 30.44. */
export const DAYS_PER_MONTH = 30;
/**
 * Battery nameplate = daily kWh × this factor.
 * 1.3 = one day of consumption + 30% overhead (≈ 77% usable, in the same
 * ballpark as 90% round-trip × ~85% DoD). It is NOT extra days of autonomy
 * and does not model inverter losses separately.
 */
export const BATTERY_DAY_FACTOR = 1.3;
/** Warn when free roof area is under this fraction of the estimated array. */
export const ROOF_SPARE_MARGIN = 0.15;
/** Estimated PV-only installed ₪/kW. Battery is not included in payback. */
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
  roofTight: boolean;
  currentMonthlyCost: number;
  gridloadMonthlyCost: number;
  annualSavings: number;
  estimatedPvCostIls: number;
  paybackYears: number;
  dailyUsageHours: number | null;
  hoursUsedInSizing: false;
};

export function calculateBillRecommendation(input: BillAnalyzerInput): BillAnalyzerResult {
  const monthlyKwh = input.monthlyBill / input.pricePerKwh;
  const dailyKwh = monthlyKwh / DAYS_PER_MONTH;
  const systemSizeKw = Math.round(dailyKwh / PEAK_SUN_HOURS);
  const batteryCapacityKwh = input.batteryNeeded
    ? Math.round(dailyKwh * BATTERY_DAY_FACTOR)
    : null;
  const panelsNeeded = Math.ceil((systemSizeKw * 1000) / (PANEL_KW * 1000));
  const spaceRequiredM2 = panelsNeeded * PANEL_AREA_M2;
  const annualSavings = input.monthlyBill * 12 * GRIDLOAD_SAVINGS_RATE;
  const gridloadMonthlyCost = input.monthlyBill * (1 - GRIDLOAD_SAVINGS_RATE);
  const estimatedPvCostIls = systemSizeKw * INSTALLED_COST_PER_KW_ILS;
  const paybackYears = annualSavings > 0 ? estimatedPvCostIls / annualSavings : 0;
  const spareM2 = input.roofSizeM2 - spaceRequiredM2;
  const roofTooSmall = spareM2 < 0;
  const roofTight = !roofTooSmall && spareM2 < spaceRequiredM2 * ROOF_SPARE_MARGIN;

  return {
    monthlyKwh: Math.round(monthlyKwh),
    dailyKwh: Math.round(dailyKwh),
    systemSizeKw,
    batteryCapacityKwh,
    panelsNeeded,
    spaceRequiredM2,
    roofSizeM2: input.roofSizeM2,
    roofTooSmall,
    roofTight,
    currentMonthlyCost: input.monthlyBill,
    gridloadMonthlyCost: Math.round(gridloadMonthlyCost),
    annualSavings,
    estimatedPvCostIls,
    paybackYears,
    dailyUsageHours: input.dailyUsageHours ?? null,
    hoursUsedInSizing: false,
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
      ? `• Battery: ${formatNumber(result.batteryCapacityKwh)} kWh (1 day + 30% overhead; not in payback)`
      : "• Battery: not requested",
    `• Panels: ${formatNumber(result.panelsNeeded)}`,
    `• Roof available: ${formatNumber(result.roofSizeM2)} m² (about ${formatNumber(result.spaceRequiredM2)} m² needed)`,
  ];
  if (result.dailyUsageHours != null) {
    lines.push(
      `• Typical daily usage: ${result.dailyUsageHours} hours (note: sizing used the bill, not hours)`
    );
  }
  return lines.join("\n");
}
