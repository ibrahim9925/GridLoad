// @ts-nocheck

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, TrendingDown } from "lucide-react";

interface CollectionEfficiencyProps {
  collectionRate: number;
  targetRate: number;
  previousPeriodRate: number;
  isLoading?: boolean;
}

const CollectionEfficiencyWidget = ({ 
  collectionRate, 
  targetRate, 
  previousPeriodRate, 
  isLoading 
}: CollectionEfficiencyProps) => {
  const trend = collectionRate - previousPeriodRate;
  const isPositiveTrend = trend >= 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Collection Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Collection Efficiency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-2xl font-bold">{collectionRate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">Target: {targetRate}%</span>
            </div>
            <Progress 
              value={collectionRate} 
              max={100}
              className="h-2"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {isPositiveTrend ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={isPositiveTrend ? "text-green-600" : "text-red-600"}>
              {isPositiveTrend ? "+" : ""}{trend.toFixed(1)}% vs last period
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionEfficiencyWidget;
