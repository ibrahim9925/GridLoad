// @ts-nocheck

import React, { createContext, useContext, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DataCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface OptimizedDataContextType {
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T, ttl?: number) => void;
  invalidateCache: (key: string) => void;
  clearCache: () => void;
  isOnline: boolean;
  refetchAll: () => void;
}

const OptimizedDataContext = createContext<OptimizedDataContextType | undefined>(undefined);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const OptimizedDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cache, setCache] = useState<Map<string, DataCacheEntry<any>>>(new Map());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [refetchCallbacks] = useState<Set<() => void>>(new Set());
  const { toast } = useToast();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Data synchronization resumed.",
      });
      refetchAll();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        variant: "destructive",
        title: "Connection lost",
        description: "Working in offline mode.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const getCachedData = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      setCache(new Map(cache));
      return null;
    }

    return entry.data as T;
  }, [cache]);

  const setCachedData = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    const entry: DataCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, entry);
      return newCache;
    });
  }, []);

  const invalidateCache = useCallback((key: string) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const refetchAll = useCallback(() => {
    refetchCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error during refetch:', error);
      }
    });
  }, [refetchCallbacks]);

  const value = {
    getCachedData,
    setCachedData,
    invalidateCache,
    clearCache,
    isOnline,
    refetchAll,
  };

  return (
    <OptimizedDataContext.Provider value={value}>
      {children}
    </OptimizedDataContext.Provider>
  );
};

export const useOptimizedDataContext = () => {
  const context = useContext(OptimizedDataContext);
  if (context === undefined) {
    throw new Error('useOptimizedDataContext must be used within an OptimizedDataProvider');
  }
  return context;
};
