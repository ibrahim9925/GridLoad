// @ts-nocheck

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyRevenue {
  month: string;
  actual: number;
  predicted?: number;
  confidence_low?: number;
  confidence_high?: number;
}

interface ForecastData {
  historical: MonthlyRevenue[];
  predictions: MonthlyRevenue[];
  growthRate: number;
  seasonalTrends: { [key: string]: number };
  accuracy: number;
}

export const useRevenueForecasting = (monthsToForecast: number = 6) => {
  const [forecastData, setForecastData] = useState<ForecastData>({
    historical: [],
    predictions: [],
    growthRate: 0,
    seasonalTrends: {},
    accuracy: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const calculateGrowthRate = (data: MonthlyRevenue[]) => {
    if (data.length < 2) return 0;
    
    const sortedData = [...data].sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    const firstValue = sortedData[0].actual;
    const lastValue = sortedData[sortedData.length - 1].actual;
    const periods = sortedData.length - 1;
    
    return Math.pow(lastValue / firstValue, 1 / periods) - 1;
  };

  const calculateSeasonalTrends = (data: MonthlyRevenue[]) => {
    const monthlyTotals: { [key: string]: number[] } = {};
    
    data.forEach(item => {
      const month = new Date(item.month).getMonth();
      const monthName = new Date(item.month).toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyTotals[monthName]) {
        monthlyTotals[monthName] = [];
      }
      monthlyTotals[monthName].push(item.actual);
    });

    const trends: { [key: string]: number } = {};
    Object.keys(monthlyTotals).forEach(month => {
      const values = monthlyTotals[month];
      trends[month] = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return trends;
  };

  const generatePredictions = (historical: MonthlyRevenue[], growthRate: number, seasonalTrends: { [key: string]: number }) => {
    const predictions: MonthlyRevenue[] = [];
    const lastDataPoint = historical[historical.length - 1];
    const baseValue = lastDataPoint.actual;
    
    for (let i = 1; i <= monthsToForecast; i++) {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      const monthName = futureDate.toLocaleDateString('en-US', { month: 'short' });
      const monthKey = futureDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      // Apply growth rate and seasonal adjustment
      const seasonalMultiplier = seasonalTrends[monthName] ? 
        seasonalTrends[monthName] / Object.values(seasonalTrends).reduce((a, b) => a + b, 0) * Object.keys(seasonalTrends).length : 1;
      
      const predicted = baseValue * Math.pow(1 + growthRate, i) * seasonalMultiplier;
      const confidenceRange = predicted * 0.15; // 15% confidence interval
      
      predictions.push({
        month: monthKey,
        actual: 0,
        predicted: Math.round(predicted),
        confidence_low: Math.round(predicted - confidenceRange),
        confidence_high: Math.round(predicted + confidenceRange)
      });
    }
    
    return predictions;
  };

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true);

      // Fetch sales data for the last 24 months
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("total_amount, sale_date, created_at")
        .gte("sale_date", new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order("sale_date", { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = new Map<string, number>();
      
      (salesData || []).forEach(sale => {
        const saleDate = new Date(sale.sale_date || sale.created_at);
        const monthKey = saleDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + sale.total_amount);
      });

      const historical = Array.from(monthlyData.entries()).map(([month, actual]) => ({
        month,
        actual
      }));

      // Calculate analytics
      const growthRate = calculateGrowthRate(historical);
      const seasonalTrends = calculateSeasonalTrends(historical);
      const predictions = generatePredictions(historical, growthRate, seasonalTrends);

      // Calculate accuracy (simplified mock calculation)
      const accuracy = Math.min(95, Math.max(70, 85 + (historical.length * 2)));

      setForecastData({
        historical,
        predictions,
        growthRate,
        seasonalTrends,
        accuracy
      });

    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast({
        variant: "destructive",
        title: "Error loading revenue forecast",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [monthsToForecast]);

  return {
    forecastData,
    isLoading,
    refetch: fetchRevenueData,
  };
};
