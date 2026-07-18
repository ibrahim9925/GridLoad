// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { databaseService } from "@/services/DatabaseService";
import DatabaseTester from "./DatabaseTester";
import { Activity, Database, Zap, TrendingUp, RefreshCw } from "lucide-react";

const EnhancedDatabaseMonitor = () => {
  const {
    metrics,
    queryHistory,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    runHealthCheck,
    clearHistory
  } = usePerformanceMonitor();

  const [cacheStats, setCacheStats] = useState({ size: 0, entries: [] });

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        setCacheStats(databaseService.getCacheStats());
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatLatency = (latency: number) => {
    if (latency < 100) return 'Excellent';
    if (latency < 300) return 'Good';
    if (latency < 1000) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Enhanced Database Monitor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Health Check
              </Button>
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="cache">Cache</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Connection</p>
                        <Badge className={getStatusColor(metrics.connectionHealth?.isConnected)}>
                          {metrics.connectionHealth?.isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">Latency</p>
                        <p className="text-lg font-bold">{metrics.averageLatency}ms</p>
                        <p className="text-xs text-muted-foreground">
                          {formatLatency(metrics.averageLatency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Query Count</p>
                        <p className="text-lg font-bold">{metrics.queryCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium">Error Rate</p>
                        <p className="text-lg font-bold">{metrics.errorRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {metrics.connectionHealth?.errors?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-red-600">Recent Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.connectionHealth.errors.map((error: string, index: number) => (
                        <p key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {error}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Query History</CardTitle>
                    <Button variant="outline" size="sm" onClick={clearHistory}>
                      Clear History
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {queryHistory.slice(-20).reverse().map((query, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(query.success)}>
                            {query.success ? 'Success' : 'Failed'}
                          </Badge>
                          <span className="font-mono">{query.query}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{query.latency}ms</span>
                          <span className="text-muted-foreground">
                            {query.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {queryHistory.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No query history available. Start monitoring to see query performance.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="cache" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cache Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Cache Size</p>
                        <p className="text-2xl font-bold">{cacheStats.size}</p>
                        <p className="text-xs text-muted-foreground">entries</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Hit Rate</p>
                        <p className="text-2xl font-bold">{metrics.cacheHitRate}%</p>
                        <p className="text-xs text-muted-foreground">efficiency</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Cached Queries</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {cacheStats.entries.map((entry: string, index: number) => (
                          <p key={index} className="text-xs font-mono bg-gray-50 p-1 rounded">
                            {entry}
                          </p>
                        ))}
                        
                        {cacheStats.entries.length === 0 && (
                          <p className="text-sm text-muted-foreground">No cached entries</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="testing">
              <DatabaseTester />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDatabaseMonitor;
