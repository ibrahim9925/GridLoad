// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  BarChart3,
  Activity,
  Zap
} from "lucide-react";

interface TestResult {
  id: string;
  execution_id: string;
  test_name: string;
  test_category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  created_at: string;
}

interface TestPerformanceChartsProps {
  testResults: TestResult[];
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export const TestPerformanceCharts: React.FC<TestPerformanceChartsProps> = ({
  testResults
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const filterByPeriod = (results: TestResult[], period: string) => {
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case '24h':
        cutoff.setHours(cutoff.getHours() - 24);
        break;
      case '7d':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(cutoff.getDate() - 30);
        break;
      default:
        return results;
    }
    
    return results.filter(result => new Date(result.created_at) >= cutoff);
  };

  const filteredResults = filterByPeriod(testResults, selectedPeriod);

  // Performance trend data
  const performanceTrendData = React.useMemo(() => {
    const groupedByDay = filteredResults.reduce((acc, result) => {
      const day = new Date(result.created_at).toLocaleDateString();
      if (!acc[day]) {
        acc[day] = { day, totalTests: 0, avgDuration: 0, passRate: 0, durations: [] };
      }
      acc[day].totalTests++;
      if (result.duration_ms) {
        acc[day].durations.push(result.duration_ms);
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByDay).map((dayData: any) => {
      const passed = filteredResults.filter(r => 
        new Date(r.created_at).toLocaleDateString() === dayData.day && 
        r.status === 'passed'
      ).length;
      
      dayData.avgDuration = dayData.durations.length > 0 
        ? dayData.durations.reduce((a: number, b: number) => a + b, 0) / dayData.durations.length 
        : 0;
      dayData.passRate = dayData.totalTests > 0 ? (passed / dayData.totalTests) * 100 : 0;
      
      return dayData;
    }).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  }, [filteredResults]);

  // Test category distribution
  const categoryDistribution = React.useMemo(() => {
    const distribution = filteredResults.reduce((acc, result) => {
      acc[result.test_category] = (acc[result.test_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredResults]);

  // Status distribution
  const statusDistribution = React.useMemo(() => {
    const distribution = filteredResults.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredResults]);

  // Performance metrics
  const performanceMetrics = React.useMemo(() => {
    const durations = filteredResults
      .filter(r => r.duration_ms)
      .map(r => r.duration_ms!);
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    
    const passRate = filteredResults.length > 0 
      ? (filteredResults.filter(r => r.status === 'passed').length / filteredResults.length) * 100 
      : 0;

    return { avgDuration, maxDuration, minDuration, passRate };
  }, [filteredResults]);

  // Duration distribution data
  const durationDistribution = React.useMemo(() => {
    const buckets = [
      { range: '0-1s', min: 0, max: 1000, count: 0 },
      { range: '1-5s', min: 1000, max: 5000, count: 0 },
      { range: '5-10s', min: 5000, max: 10000, count: 0 },
      { range: '10-30s', min: 10000, max: 30000, count: 0 },
      { range: '30s+', min: 30000, max: Infinity, count: 0 }
    ];

    filteredResults.forEach(result => {
      if (result.duration_ms) {
        const bucket = buckets.find(b => 
          result.duration_ms! >= b.min && result.duration_ms! < b.max
        );
        if (bucket) bucket.count++;
      }
    });

    return buckets;
  }, [filteredResults]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Analytics
            </CardTitle>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(performanceMetrics.avgDuration / 1000).toFixed(2)}s
            </div>
            <p className="text-xs text-muted-foreground">
              Min: {(performanceMetrics.minDuration / 1000).toFixed(2)}s | 
              Max: {(performanceMetrics.maxDuration / 1000).toFixed(2)}s
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {performanceMetrics.passRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredResults.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryDistribution.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>Average test duration and pass rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Avg Duration (ms)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="passRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Pass Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Duration Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Duration Distribution</CardTitle>
            <CardDescription>Test execution time ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Test Categories</CardTitle>
            <CardDescription>Distribution of tests by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};