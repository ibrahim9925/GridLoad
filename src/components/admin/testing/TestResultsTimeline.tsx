// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download
} from "lucide-react";

interface TestResult {
  id: string;
  execution_id: string;
  test_name: string;
  test_category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_message?: string;
  created_at: string;
}

interface TestResultsTimelineProps {
  testResults: TestResult[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
    case 'passed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'skipped':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const formatDuration = (ms?: number) => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const groupByDate = (results: TestResult[]) => {
  return results.reduce((acc, result) => {
    const date = new Date(result.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);
};

const calculateStats = (results: TestResult[]) => {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  
  return { total, passed, failed, passRate };
};

export const TestResultsTimeline: React.FC<TestResultsTimelineProps> = ({
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
  const groupedResults = groupByDate(filteredResults);
  const overallStats = calculateStats(filteredResults);

  const exportResults = () => {
    const csvContent = [
      ['Date', 'Test Name', 'Category', 'Status', 'Duration (ms)', 'Error Message'].join(','),
      ...filteredResults.map(result => [
        new Date(result.created_at).toISOString(),
        result.test_name,
        result.test_category,
        result.status,
        result.duration_ms || '',
        result.error_message || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Test History
              </CardTitle>
              <CardDescription>
                Historical test execution results and trends
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
              <Button variant="outline" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.passed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.passRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Test Execution Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(groupedResults)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, results]) => {
                  const dayStats = calculateStats(results);
                  
                  return (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="font-semibold">{date}</h3>
                        <div className="flex gap-2 text-sm">
                          <Badge variant="outline">{dayStats.total} total</Badge>
                          <Badge variant="default">{dayStats.passed} passed</Badge>
                          <Badge variant="destructive">{dayStats.failed} failed</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pl-4">
                        {results
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-2 rounded-lg border-l-4 bg-muted/20"
                              style={{
                                borderLeftColor: 
                                  result.status === 'passed' ? '#22c55e' :
                                  result.status === 'failed' ? '#ef4444' :
                                  result.status === 'running' ? '#3b82f6' : '#f59e0b'
                              }}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {getStatusIcon(result.status)}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.test_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {result.test_category} • {new Date(result.created_at).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {formatDuration(result.duration_ms)}
                                </span>
                                {result.error_message && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-muted-foreground">
              No test results found for the selected period.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};