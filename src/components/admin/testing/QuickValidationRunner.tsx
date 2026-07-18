// @ts-nocheck
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, RefreshCw } from 'lucide-react';
import { TestValidationRunner } from '@/utils/testValidationRunner';

export const QuickValidationRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      const validationResults = await TestValidationRunner.runQuickValidationTests();
      setResults(validationResults);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Quick Validation Tests
          <Badge variant="outline">Post-Remediation Check</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runValidation}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Running Validation...' : 'Run Quick Validation'}
        </Button>

        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={results.summary?.improved ? "default" : "destructive"}>
                Pass Rate: {results.summary?.passRate}%
              </Badge>
              <Badge variant="outline">
                {results.summary?.passedTests}/{results.summary?.totalTests} Tests
              </Badge>
              {results.summary?.passRate >= 85 && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Target Achieved ≥85%
                </Badge>
              )}
            </div>
            
            <div className="grid gap-2">
              {Object.entries(results).filter(([key]) => key !== 'summary').map(([testName, result]: [string, any]) => (
                <div key={testName} className="space-y-1">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{testName.replace('Test', '')}</span>
                      {result.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.details}
                        </p>
                      )}
                    </div>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  
                  {!result.success && result.error && (
                    <div className="ml-4 p-2 bg-red-50 border-l-2 border-red-200 rounded">
                      <p className="text-xs text-red-700 font-medium">Error:</p>
                      <p className="text-xs text-red-600">{result.error}</p>
                      {result.subTestsResults && (
                        <div className="mt-2">
                          <p className="text-xs text-red-700 font-medium">Failed sub-tests:</p>
                          <ul className="text-xs text-red-600 ml-2">
                            {Object.entries(result.subTestsResults)
                              .filter(([, subResult]: [string, any]) => !subResult.success)
                              .map(([subTestName, subResult]: [string, any]) => (
                                <li key={subTestName}>• {subTestName}: {subResult.error}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {results.summary?.passRate < 85 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Pass rate below target (85%). Consider running QA Remediation.
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Failed: {results.summary?.failedTests} | Need improvement to reach ≥85% pass rate
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};