// @ts-nocheck
export interface SolarFormData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  monthlyBill: string;
  monthlyConsumption: string;
  roofSpace: string;
  roofType: string;
  batteryBackup: boolean;
  budgetRange: string;
  additionalNotes: string;
  currency: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SolarRecommendations {
  customerName: string;
  location: string;
  systemSizeKw: number;
  panelCount: number;
  panelDetails: string;
  inverterSize: number;
  inverterDetails: string;
  batteryDetails?: string;
  estimatedCost: number;
  monthlySavings: number;
  paybackYears: number;
  co2ReductionTons: number;
  currency: string;
}

export interface SolarCalculationData {
  monthlyBill: number;
  monthlyConsumption: number;
  roofSpace: number;
  roofType: string;
  batteryBackup: boolean;
  location: string;
  currency: string;
}