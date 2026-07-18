// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  routeKey?: string;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AdminErrorBoundary caught:", error, info);
  }

  componentDidUpdate(prev: Props) {
    if (prev.routeKey !== this.props.routeKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || "Unknown error";
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> This page failed to load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page. Other pages are still available from the sidebar.
            </p>
            <div className="bg-muted rounded p-3 text-xs font-mono break-all">{msg}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Go back
              </Button>
              <Button onClick={() => this.setState({ hasError: false, error: null })}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try again
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default AdminErrorBoundary;
