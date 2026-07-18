// @ts-nocheck
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Loader2
} from "lucide-react";
import { TestDetailModal } from "./TestDetailModal";

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

interface TestExecution {
  id: string;
  test_suite: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time: string;
}

interface LiveTestGridProps {
  testResults: TestResult[];
  testExecutions: TestExecution[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
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

const getStatusBadge = (status: string) => {
  const variants = {
    running: "default",
    passed: "default", 
    failed: "destructive",
    skipped: "secondary",
    pending: "outline"
  } as const;
  
  return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status}</Badge>;
};

const formatDuration = (ms?: number) => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const LiveTestGrid: React.FC<LiveTestGridProps> = ({
  testResults,
  testExecutions
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const runningExecutions = testExecutions.filter(exec => exec.status === 'running');
  const categories = ['all', ...new Set(testResults.map(result => result.test_category))];
  const statuses = ['all', 'running', 'passed', 'failed', 'skipped', 'pending'];

  const filteredResults = testResults.filter(result => {
    const matchesSearch = result.test_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || result.test_category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || result.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const groupedResults = filteredResults.reduce((acc, result) => {
    const key = result.execution_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Test Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Running Tests Alert */}
      {runningExecutions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">
                {runningExecutions.length} test suite{runningExecutions.length > 1 ? 's' : ''} running
              </span>
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {runningExecutions.map(exec => exec.test_suite).join(', ')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Grid */}
      <div className="grid gap-6">
        {Object.entries(groupedResults).map(([executionId, results]) => {
          const execution = testExecutions.find(exec => exec.id === executionId);
          const passedCount = results.filter(r => r.status === 'passed').length;
          const failedCount = results.filter(r => r.status === 'failed').length;
          const runningCount = results.filter(r => r.status === 'running').length;
          
          return (
            <Card key={executionId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {execution?.test_suite || 'Unknown Suite'}
                    </CardTitle>
                    <CardDescription>
                      Execution started: {new Date(execution?.start_time || '').toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{passedCount} Passed</Badge>
                    <Badge variant="destructive">{failedCount} Failed</Badge>
                    {runningCount > 0 && (
                      <Badge variant="default">{runningCount} Running</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(result.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{result.test_name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {result.test_category}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground min-w-0">
                            {formatDuration(result.duration_ms)}
                          </span>
                          {getStatusBadge(result.status)}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTest(result)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              No test results found matching your filters.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTest && (
        <TestDetailModal
          test={selectedTest}
          isOpen={!!selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </div>
  );
};