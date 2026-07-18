// @ts-nocheck
import { SolarCalculationData } from "@/types/solar";

interface SolarCalculationResult {
  systemSizeKw: number;
  panelCount: number;
  panelWattage: number;
  inverterSizeKw: number;
  inverterCount: number;
  batteryAh: number;
  totalCost: number;
  monthlySavings: number;
  paybackYears: number;
  co2ReductionTons: number;
}

export const calculateSolarSystem = (data: SolarCalculationData): SolarCalculationResult => {
  // Currency conversion rates (USD to ILS)
  const usdToIls = 3.7; // Current approximate rate
  const isILS = data.currency === 'ILS';
  
  // Constants for calculations (base in USD, convert if needed)
  const baseTariffRate = 0.15; // $0.15/kWh average
  const ilsTariffRate = 0.55; // ₪0.55/kWh average in Israel
  const averageTariffRate = isILS ? ilsTariffRate : baseTariffRate;
  
  const sunHoursPerDay = data.location.toLowerCase().includes('israel') ? 6.5 : 5; // More sun in Israel
  const panelWattage = 450; // 450W panels
  const panelEfficiency = 0.85; // 85% system efficiency
  
  // Component costs (base USD, convert for ILS)
  const basePanelCostPerWatt = 1.2; // $1.20/W for panels
  const baseInverterCostPerWatt = 0.3; // $0.30/W for inverters
  const baseBatteryCostPerAh = 2.5; // $2.50/Ah for batteries
  
  const panelCostPerWatt = isILS ? basePanelCostPerWatt * usdToIls : basePanelCostPerWatt;
  const inverterCostPerWatt = isILS ? baseInverterCostPerWatt * usdToIls : baseInverterCostPerWatt;
  const batteryCostPerAh = isILS ? baseBatteryCostPerAh * usdToIls : baseBatteryCostPerAh;
  
  const installationCostMultiplier = 1.8; // Installation adds 80% to component costs
  const panelSpaceRequirement = 2.5; // m² per panel

  // Calculate monthly consumption if not provided
  let monthlyConsumption = data.monthlyConsumption;
  if (!monthlyConsumption || monthlyConsumption === 0) {
    monthlyConsumption = data.monthlyBill / averageTariffRate;
  }

  // Calculate daily consumption
  const dailyConsumption = monthlyConsumption / 30;

  // Calculate system size needed (kW)
  const systemSizeKw = Math.ceil((dailyConsumption / (sunHoursPerDay * panelEfficiency)) * 100) / 100;

  // Calculate panel count
  const theoreticalPanelCount = Math.ceil((systemSizeKw * 1000) / panelWattage);
  const maxPanelsFromRoofSpace = Math.floor(data.roofSpace / panelSpaceRequirement);
  const panelCount = Math.min(theoreticalPanelCount, maxPanelsFromRoofSpace);

  // Recalculate actual system size based on available panels
  const actualSystemSizeKw = (panelCount * panelWattage) / 1000;

  // Calculate inverter sizing (120% of panel capacity)
  const inverterSizeKw = Math.ceil(actualSystemSizeKw * 1.2 * 10) / 10;
  const inverterCount = Math.ceil(inverterSizeKw / 5); // Max 5kW per inverter

  // Calculate battery requirements (if requested)
  let batteryAh = 0;
  if (data.batteryBackup) {
    // Size battery for 1 day of backup (24 hours)
    const backupHours = 24;
    const batteryVoltage = 48; // 48V system
    batteryAh = Math.ceil((dailyConsumption * backupHours) / batteryVoltage);
  }

  // Cost calculations
  const panelCost = panelCount * panelWattage * panelCostPerWatt;
  const inverterCost = inverterSizeKw * 1000 * inverterCostPerWatt;
  const batteryCost = data.batteryBackup ? batteryAh * batteryCostPerAh : 0;
  const componentCost = panelCost + inverterCost + batteryCost;
  const totalCost = Math.round(componentCost * installationCostMultiplier);

  // Financial calculations
  const monthlyGeneration = (actualSystemSizeKw * sunHoursPerDay * 30 * panelEfficiency);
  const monthlySavings = Math.min(monthlyGeneration, monthlyConsumption) * averageTariffRate;
  const paybackYears = totalCost / (monthlySavings * 12);

  // Environmental impact (kg CO2 per kWh = 0.4)
  const co2ReductionTons = (monthlyGeneration * 12 * 0.4) / 1000;

  return {
    systemSizeKw: actualSystemSizeKw,
    panelCount,
    panelWattage,
    inverterSizeKw,
    inverterCount,
    batteryAh,
    totalCost,
    monthlySavings,
    paybackYears,
    co2ReductionTons,
  };
};