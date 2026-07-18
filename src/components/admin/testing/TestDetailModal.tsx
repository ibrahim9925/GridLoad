// @ts-nocheck
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Timer,
  Hash
} from "lucide-react";

interface TestResult {
  id: string;
  execution_id: string;
  test_name: string;
  test_category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  created_at: string;
}

interface TestDetailModalProps {
  test: TestResult | null;
  isOpen: boolean;
  onClose: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircle className="h-5 w-5 text-success" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    case 'running':
      return <Clock className="h-5 w-5 text-primary animate-pulse" />;
    case 'skipped':
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'passed':
      return <Badge variant="default" className="bg-success text-success-foreground">Passed</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'running':
      return <Badge variant="secondary" className="bg-primary text-primary-foreground">Running</Badge>;
    case 'skipped':
      return <Badge variant="outline" className="border-warning text-warning">Skipped</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const formatDuration = (ms?: number) => {
  if (!ms) return 'N/A';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
};

export const TestDetailModal: React.FC<TestDetailModalProps> = ({
  test,
  isOpen,
  onClose
}) => {
  if (!test) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon(test.status)}
            <div>
              <DialogTitle className="text-xl">{test.test_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{test.test_category}</Badge>
                {getStatusBadge(test.status)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatDuration(test.duration_ms)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Started At
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {new Date(test.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Execution ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-mono truncate" title={test.execution_id}>
                  {test.execution_id.split('-')[0]}...
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Test Status Details */}
          {test.status === 'failed' && test.error_message && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Error Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Error Message:</h4>
                  <div className="bg-destructive/10 p-3 rounded-md">
                    <p className="text-sm text-destructive font-mono">{test.error_message}</p>
                  </div>
                </div>
                
                {test.stack_trace && (
                  <div>
                    <h4 className="font-medium mb-2">Stack Trace:</h4>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                        {test.stack_trace}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {test.status === 'passed' && (
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="text-success flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Test Passed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This test completed successfully with no errors. 
                  Duration: {formatDuration(test.duration_ms)}
                </p>
              </CardContent>
            </Card>
          )}

          {test.status === 'running' && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Clock className="h-5 w-5 animate-pulse" />
                  Test In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This test is currently running. Check back shortly for results.
                </p>
              </CardContent>
            </Card>
          )}

          {test.status === 'skipped' && (
            <Card className="border-warning">
              <CardHeader>
                <CardTitle className="text-warning flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Test Skipped
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This test was skipped during execution. This may be due to preconditions not being met or the test being marked as optional.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Test Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Test ID:</span>
                  <p className="font-mono text-xs">{test.id}</p>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p>{test.test_category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};