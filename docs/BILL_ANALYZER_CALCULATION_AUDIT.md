# Bill Analyzer calculation audit

Audit of `src/utils/billAnalyzer.ts` against the customer example:

| Input | Value |
|---|---|
| Monthly bill | ₪1,500 |
| Price per kWh | ₪0.65 |
| Roof size | 100 m² |
| Daily usage hours | 5 |
| Battery needed | Yes |

Live output from current code:

| Output | Value |
|---|---|
| Monthly consumption | 2,308 kWh |
| Daily consumption | 77 kWh |
| System size | 17 kW |
| Battery capacity | **100 kWh** |
| Panels | 49 |
| Roof space required | 98 m² |
| GridLoad monthly cost | ₪450 |
| Annual savings | ₪12,600 |
| Payback | 3.6 years |

Rounding is applied **after** each energy step (`Math.round` on kWh values, `Math.round` on kW, `Math.ceil` on panel count). Downstream steps use the **unrounded** intermediates unless noted.

```
CALCULATION AUDIT LOG
═══════════════════════

1. Monthly Consumption
   Formula in code: monthlyBill / pricePerKwh
   Math: 1500 ÷ 0.65 = 2307.692307…
   Display: Math.round → 2,308 kWh
   Confidence: YES — this is the right way to recover kWh from a bill.
   Note: Uses the bill as ground truth. No API.

2. Daily Consumption
   Formula in code: monthlyKwh / 30   (uses UNROUNDED monthly, then rounds)
   Math: 2307.692307… ÷ 30 = 76.923076… → Math.round → 77 kWh
   If we divided the rounded 2,308: 2308 ÷ 30 = 76.933… → still 77
   If we used 365.25/12 = 30.4375 days: 2307.69 ÷ 30.4375 = 75.82 kWh/day
   Confidence: YES for a household estimator. 30 is a convention, not a calendar.
   Recommended: keep ÷ 30. Switching to 30.44 changes size by ~1.5% and is not worth the extra explanation on a public page.

3. System Size (kW)
   Formula in code: Math.round(dailyKwh / 4.5)
   Math: 76.923… ÷ 4.5 = 17.094… → 17 kW
   77 ÷ 4.5 = 17.111… → also 17 kW
   Confidence: NEEDS REVIEW on the 4.5 constant (see peak sun hours below).
   Arithmetic: correct.

4. Battery Capacity  ← CRITICAL
   Formula in code: Math.round(dailyKwh * 1.3)   when batteryNeeded
   Math: 76.923… × 1.3 = 100.000… → 100 kWh
   77 × 1.3 = 100.1 → still 100 kWh
   Confidence: arithmetic YES. Engineering NEEDS REVIEW.
   What 1.3 means: nameplate kWh = 130% of one day's consumption.
   It does NOT model extra days of autonomy as 1.3 days of usable energy.
   It is a blunt 30% overhead. Two honest readings:
     A) "One day of backup + 30% fudge"
     B) Shortcut for usable fraction ≈ 1/1.3 ≈ 77%
        (similar to 90% round-trip × ~85% depth of discharge)
   It does NOT separately apply:
     - round-trip efficiency (typically ~90% LiFePO4)
     - depth of discharge (80–90% usable)
     - inverter losses
     - days of autonomy > 1
   If we required 77 kWh USABLE for one day:
     nameplate = 77 / (0.90 RTE × 0.80 DoD) = 107 kWh
     nameplate = 77 / (0.90 × 0.90)         = 95 kWh
     1.3-day usable: 77 × 1.3 / 0.81        = 124 kWh
   Verdict: 100 kWh is the number the current formula is supposed to produce.
   It is slightly optimistic vs a strict 80% DoD + 90% RTE one-day bank (107 kWh),
   and far below a true 1.5-day resilient bank.
   Recommended default (if we change it):
     nameplate = dailyKwh / (DoD × RTE)
     DoD = 0.90, RTE = 0.90  → ~95 kWh for this example (still ~1 day)
   Keep 1.3 until product agrees to change the public number.

5. Panels Required
   Formula in code: Math.ceil((systemSizeKw * 1000) / 350)
   Math: 17,000 W ÷ 350 W = 48.571… → ceil → 49 panels
   17 ÷ 0.35 in IEEE float can be 48.571 or 48.57…; we use watts to avoid 17/0.35 → 48.57 vs 48.999 bugs.
   Confidence: YES for 350 W modules.
   Modern 400 W modules would be 17,000/400 = 42.5 → 43 panels.
   Recommended: keep 350 W (conservative / common). Optional later: let quote use stocked SKU wattage.

6. Roof Space Required
   Formula in code: panelsNeeded × 2
   Math: 49 × 2 = 98 m²
   Confidence: YES as a rule of thumb. A typical 350 W module is ~1.7–2.0 m² of glass;
   2.0 m² includes a little row spacing. Real layouts often need 2.2–2.5 m²/module
   once walkways, fire setbacks, inverter, and shading gaps are included.
   This example: 100 m² available vs 98 m² estimated → only 2 m² spare (2%).
   Current code warns ONLY when roof < required, so this case shows NO warning.
   Recommended: warn when spare < 15% (or < 10 m²). Do not auto-shrink the system;
   tell them to talk to us about layout / slightly smaller array.

7. Financials
   Annual savings: monthlyBill × 12 × 0.70
   Math: 1500 × 12 × 0.70 = 12,600  ✓
   GridLoad monthly: 1500 × 0.30 = 450  ✓
   Payback: (systemSizeKw × 2700) / annualSavings
   Math: (17 × 2700) / 12600 = 45900 / 12600 = 3.642… → 3.6 years
   Assumed PV-only installed cost: ₪2,700 per kW = ₪45,900 for 17 kW
   Battery is NOT in that cost.
   Confidence: 70/30 split — product assumption, not a measured tariff.
   Payback constant — NEEDS REVIEW. ₪2,700/kW was picked so the original
   21 kW demo paid back in 3.2 years. It is cheap for Palestine installed PV
   and wildly cheap if a 100 kWh battery is included.
   Reality check (order of magnitude, not a GridLoad price list):
     PV 17 kW at ₪2,700/kW     ≈ ₪45,900   ← what payback uses
     Battery 100 kWh at ~₪1,500–2,500/kWh ≈ ₪150,000–250,000
     Combined payback at ₪12,600/yr        ≈ 12–24 years
   Recommended: show "estimated PV cost" and state payback excludes battery.
   Do not treat 3.6 years as a battery-backed quote.

8. Daily usage hours (5 h) vs the bill
   Formula in code: hours are stored and sent on the quote. They are NOT used
   in monthly kWh, daily kWh, kW, battery, or panels.
   5 hours is a duration. 2,308 kWh is energy. They do not contradict without
   an assumed load in kW.
   If someone assumes a 5 kW household: 77 kWh / 5 kW = 15.4 h "equivalent".
   That assumption is not in the code.
   What 5 hours CAN mean: people are home / AC runs 5 hours. Then average
   power during those hours = 77 kWh / 5 h = 15.4 kW — a large house or
   heavy HVAC, still possible. It does not mean the bill is wrong.
   Precedence: the BILL wins for energy. Hours are notes for the sales team.
   Recommended: say so on the results card. Do not resize the array from hours.

9. Peak sun hours 4.5
   Code constant PEAK_SUN_HOURS = 4.5 (Palestine annual rule of thumb).
   Typical West Bank / Gaza annual PSH is often ~5.0–5.6; winter lower (~3.5),
   summer higher (~6–7). 4.5 is slightly conservative (good: less risk of
   undersizing in winter). Not season-aware. Not region-picker.
   Recommended: keep 4.5 for v1. Optional later: governorate or winter/summer.

═══════════════════════
SUMMARY
- 100 kWh battery is what Daily kWh × 1.3 is designed to output. Math is correct.
- 1.3 is a 30% overhead on one day, not a full engineering battery model.
- Payback 3.6 years is PV-only at ₪2,700/kW (₪45,900). Battery is omitted.
- 5 daily hours do not feed the math; the ₪1,500 bill does.
- 98 m² on a 100 m² roof has no practical margin; code previously did not warn.
```
