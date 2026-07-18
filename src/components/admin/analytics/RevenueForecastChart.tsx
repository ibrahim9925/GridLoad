// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Target, AlertTriangle } from "lucide-react";

interface RevenueForecastChartProps {
  forecastData: {
    historical: Array<{ month: string; actual: number; predicted?: number; confidence_low?: number; confidence_high?: number }>;
    predictions: Array<{ month: string; actual: number; predicted?: number; confidence_low?: number; confidence_high?: number }>;
    growthRate: number;
    seasonalTrends: { [key: string]: number };
    accuracy: number;
  };
  isLoading: boolean;
}

const RevenueForecastChart = ({ forecastData, isLoading }: RevenueForecastChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const allData = [...forecastData.historical, ...forecastData.predictions];
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Forecast Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Forecast
            <Badge variant={forecastData.accuracy > 85 ? "default" : "secondary"}>
              {forecastData.accuracy.toFixed(0)}% Accuracy
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={allData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value, name) => [formatCurrency(Number(value)), name]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              
              {/* Confidence interval area */}
              <Area
                dataKey="confidence_high"
                stackId="confidence"
                stroke="none"
                fill="rgba(59, 130, 246, 0.1)"
                fillOpacity={0.3}
              />
              <Area
                dataKey="confidence_low"
                stackId="confidence"
                stroke="none"
                fill="white"
                fillOpacity={1}
              />
              
              {/* Actual revenue line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#22c55e" 
                strokeWidth={3}
                name="Actual Revenue"
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              
              {/* Predicted revenue line */}
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted Revenue"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Insights */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Growth Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Growth Rate</span>
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${forecastData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className={`font-semibold ${forecastData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(forecastData.growthRate * 100)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Forecast Accuracy</span>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-600">
                  {forecastData.accuracy.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Next Month Prediction</span>
              <div className="mt-1">
                {forecastData.predictions.length > 0 && (
                  <div className="text-lg font-bold">
                    {formatCurrency(forecastData.predictions[0].predicted || 0)}
                  </div>
                )}
                {forecastData.predictions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Range: {formatCurrency(forecastData.predictions[0].confidence_low || 0)} - {formatCurrency(forecastData.predictions[0].confidence_high || 0)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Seasonal Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(forecastData.seasonalTrends)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([month, value]) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm">{month}</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {forecastData.growthRate < 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Growth Alert</span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Revenue growth is declining. Consider reviewing sales strategies.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RevenueForecastChart;
