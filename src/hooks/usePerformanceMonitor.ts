// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { databaseService } from "@/services/DatabaseService";

interface PerformanceMetrics {
  queryCount: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  connectionHealth: any;
  lastUpdated: Date;
}

interface QueryMetric {
  query: string;
  latency: number;
  success: boolean;
  timestamp: Date;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    queryCount: 0,
    averageLatency: 0,
    errorRate: 0,
    cacheHitRate: 0,
    connectionHealth: null,
    lastUpdated: new Date()
  });

  const [queryHistory, setQueryHistory] = useState<QueryMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const addQueryMetric = useCallback((metric: Omit<QueryMetric, 'timestamp'>) => {
    const newMetric = { ...metric, timestamp: new Date() };
    setQueryHistory(prev => {
      const updated = [...prev, newMetric];
      // Keep only last 100 queries
      return updated.slice(-100);
    });
  }, []);

  const calculateMetrics = useCallback(() => {
    if (queryHistory.length === 0) return;

    const recentQueries = queryHistory.slice(-50); // Last 50 queries
    const successfulQueries = recentQueries.filter(q => q.success);
    const failedQueries = recentQueries.filter(q => !q.success);

    const avgLatency = successfulQueries.length > 0
      ? successfulQueries.reduce((sum, q) => sum + q.latency, 0) / successfulQueries.length
      : 0;

    const errorRate = recentQueries.length > 0
      ? (failedQueries.length / recentQueries.length) * 100
      : 0;

    // Get cache stats from database service
    const cacheStats = databaseService.getCacheStats();
    const connectionHealth = databaseService.getConnectionHealth();

    setMetrics({
      queryCount: queryHistory.length,
      averageLatency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: 0, // Would need to track cache hits vs misses
      connectionHealth,
      lastUpdated: new Date()
    });
  }, [queryHistory]);

  const startMonitoring = useCallback(async () => {
    setIsMonitoring(true);
    console.log("📊 PerformanceMonitor: Starting monitoring");

    // Check connection health immediately
    await databaseService.checkConnection();
    calculateMetrics();
  }, [calculateMetrics]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log("📊 PerformanceMonitor: Stopping monitoring");
  }, []);

  const runHealthCheck = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      const health = await databaseService.checkConnection();
      const latency = Date.now() - startTime;
      
      addQueryMetric({
        query: 'health_check',
        latency,
        success: health.isConnected
      });

      return health;
    } catch (error) {
      const latency = Date.now() - startTime;
      addQueryMetric({
        query: 'health_check',
        latency,
        success: false
      });
      throw error;
    }
  }, [addQueryMetric]);

  const clearHistory = useCallback(() => {
    setQueryHistory([]);
    setMetrics({
      queryCount: 0,
      averageLatency: 0,
      errorRate: 0,
      cacheHitRate: 0,
      connectionHealth: null,
      lastUpdated: new Date()
    });
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(calculateMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring, calculateMetrics]);

  useEffect(() => {
    calculateMetrics();
  }, [queryHistory, calculateMetrics]);

  return {
    metrics,
    queryHistory,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    runHealthCheck,
    addQueryMetric,
    clearHistory
  };
};
