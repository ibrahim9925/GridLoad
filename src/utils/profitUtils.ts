// @ts-nocheck

export const calculateMarginPercent = (cost: number, price: number): number => {
  if (!cost || !price) return 0;
  return ((price - cost) / price) * 100;
};

export const calculateProfit = (cost: number, price: number): number => {
  if (!cost || !price) return 0;
  return price - cost;
};

export const formatPercent = (val: number) =>
  `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;

export const getMarginColor = (margin: number) => {
  if (margin >= 30) return "text-green-600";
  if (margin >= 10) return "text-yellow-700";
  return "text-red-500";
};
