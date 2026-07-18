// @ts-nocheck
// Number and currency formatting utilities — NIS (₪) primary

export const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString();
};

export const formatCurrency = (value: number | string, currency: string = 'NIS'): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₪0.00';
  
  const currencyMap: Record<string, string> = {
    NIS: 'ILS',
    ILS: 'ILS',
    USD: 'USD',
    JOD: 'JOD',
    EUR: 'EUR',
  };

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyMap[currency] || 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const formatNIS = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₪0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NIS: '₪', ILS: '₪', USD: '$', EUR: '€', JOD: 'JOD ', GBP: '£',
};

export const formatMoney = (value: number | string, currency: string = 'NIS'): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const cur = (currency || 'NIS').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[cur] ?? '';
  if (isNaN(num)) return `${symbol}0.00`;
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cur === 'JOD' ? `${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatWithOriginal = (
  nisAmount: number,
  originalAmount?: number | null,
  originalCurrency?: string | null
): string => {
  const nisStr = formatNIS(nisAmount);
  if (!originalAmount || !originalCurrency || originalCurrency === 'NIS' || originalCurrency === 'ILS') {
    return nisStr;
  }
  return `${nisStr} (${formatCurrency(originalAmount, originalCurrency)})`;
};

export const formatCurrencyCompact = (value: number | string, currency: string = 'NIS'): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₪0';
  
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
  
  if (num >= 1000000) {
    return `${symbol}${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${symbol}${(num / 1000).toFixed(1)}K`;
  }
  
  return formatCurrency(num, currency);
};

export const parseFormattedNumber = (value: string): number => {
  const cleanValue = value.replace(/[,$₪\s]/g, '');
  return parseFloat(cleanValue) || 0;
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};
