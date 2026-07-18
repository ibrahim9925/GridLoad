// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  ShoppingCart,
  Activity,
  Zap,
  Search,
  Filter,
  Users,
  Shield,
  DollarSign,
  Package
} from "lucide-react";

interface IndividualTest {
  name: string;
  category: string;
  description: string;
  module: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fn: () => Promise<{ success: boolean; message: string; details?: any }>;
}

interface IndividualTestPanelProps {
  availableTests: Record<string, IndividualTest[]>;
  onRunTest: (testSuite: string, testName: string) => void;
  recentResults: any[];
}

const categoryIcons = {
  database: Database,
  security: Shield,
  workflow: ShoppingCart,
  inventory: Package,
  system: Zap,
  sales: DollarSign,
  customer: Users,
  warranty: CheckCircle,
  staff: Users,
  financial: DollarSign,
  performance: Activity
};

const getCategoryIcon = (category: string) => {
  const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Activity;
  return <IconComponent className="h-4 w-4" />;
};

const getCategoryColor = (category: string) => {
  const colors = {
    database: 'bg-primary/10 text-primary',
    security: 'bg-success/10 text-success',
    workflow: 'bg-secondary/10 text-secondary',
    inventory: 'bg-accent/10 text-accent',
    system: 'bg-muted/30 text-muted-foreground',
    sales: 'bg-green-500/10 text-green-600',
    customer: 'bg-blue-500/10 text-blue-600',
    warranty: 'bg-orange-500/10 text-orange-600',
    staff: 'bg-purple-500/10 text-purple-600',
    financial: 'bg-emerald-500/10 text-emerald-600',
    performance: 'bg-yellow-500/10 text-yellow-600'
  };
  return colors[category as keyof typeof colors] || 'bg-muted/20 text-muted-foreground';
};

const getPriorityColor = (priority: string) => {
  const colors = {
    critical: 'bg-red-500/10 text-red-600 border-red-200',
    high: 'bg-orange-500/10 text-orange-600 border-orange-200',
    medium: 'bg-blue-500/10 text-blue-600 border-blue-200',
    low: 'bg-gray-500/10 text-gray-600 border-gray-200'
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-500/10 text-gray-600';
};

export const IndividualTestPanel: React.FC<IndividualTestPanelProps> = ({
  availableTests,
  onRunTest,
  recentResults
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  // Get unique modules and priorities from available tests
  const { modules, priorities } = useMemo(() => {
    const allTests = Object.values(availableTests).flat();
    const moduleSet = new Set(allTests.map(test => test.module));
    const prioritySet = new Set(allTests.map(test => test.priority));
    return {
      modules: Array.from(moduleSet),
      priorities: Array.from(prioritySet)
    };
  }, [availableTests]);

  // Filter tests based on search and filters
  const filteredTests = useMemo(() => {
    const filtered: Record<string, IndividualTest[]> = {};
    
    Object.entries(availableTests).forEach(([suiteName, tests]) => {
      const suiteTests = tests.filter(test => {
        const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            test.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = priorityFilter === "all" || test.priority === priorityFilter;
        const matchesModule = moduleFilter === "all" || test.module === moduleFilter;
        
        return matchesSearch && matchesPriority && matchesModule;
      });
      
      if (suiteTests.length > 0) {
        filtered[suiteName] = suiteTests;
      }
    });
    
    return filtered;
  }, [availableTests, searchTerm, priorityFilter, moduleFilter]);

  const getTestResult = (testSuite: string, testName: string) => {
    return recentResults.find(r => 
      r.test_name === testName && r.execution_id?.includes(testSuite)
    );
  };

  const totalFilteredTests = Object.values(filteredTests).reduce((sum, tests) => sum + tests.length, 0);

  // Run all tests for a suite
  const runAllTestsInSuite = (suiteName: string) => {
    const tests = filteredTests[suiteName];
    tests.forEach(test => {
      onRunTest(suiteName, test.name);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Individual Test Controls</h2>
          <p className="text-muted-foreground">
            Run specific tests to validate system components - {totalFilteredTests} tests available
          </p>
        </div>
        <Button 
          onClick={() => {
            Object.entries(filteredTests).forEach(([suiteName, tests]) => {
              tests.forEach(test => {
                onRunTest(suiteName, test.name);
              });
            });
          }}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Run All Tests
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      <span className="capitalize">{priority}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Module</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(module => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(filteredTests).map(([suiteName, tests]) => (
        <Card key={suiteName}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {suiteName}
                  <Badge variant="outline">{tests.length} tests</Badge>
                </CardTitle>
                <CardDescription>
                  Click any test to run it individually and see real-time results
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => runAllTestsInSuite(suiteName)}
                className="flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                Run Suite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((test) => {
                const result = getTestResult(suiteName, test.name);
                const isRunning = result?.status === 'running';
                const isPassed = result?.status === 'passed';
                const isFailed = result?.status === 'failed';

                return (
                  <div
                    key={test.name}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getCategoryColor(test.category)}`}>
                          {getCategoryIcon(test.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{test.name}</h4>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {test.category}
                            </Badge>
                            <Badge className={`text-xs border ${getPriorityColor(test.priority)}`}>
                              {test.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isRunning && <Clock className="h-3 w-3 animate-spin text-primary" />}
                        {isPassed && <CheckCircle className="h-3 w-3 text-success" />}
                        {isFailed && <XCircle className="h-3 w-3 text-destructive" />}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {test.description}
                    </p>

                    {result && (
                      <div className="mb-3">
                        <div className="text-xs text-muted-foreground mb-1">Last result:</div>
                        <div className={`text-xs p-2 rounded ${
                          isPassed ? 'bg-success/10 text-success' :
                          isFailed ? 'bg-destructive/10 text-destructive' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {result.error_message || "Test completed successfully"}
                        </div>
                        {result.duration_ms && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Duration: {result.duration_ms}ms
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onRunTest(suiteName, test.name)}
                      disabled={isRunning}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {isRunning ? 'Running...' : 'Run Test'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};