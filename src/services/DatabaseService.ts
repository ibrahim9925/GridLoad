// @ts-nocheck

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface DatabaseServiceOptions {
  useCache?: boolean;
  retries?: number;
}

interface ConnectionHealth {
  isConnected: boolean;
  latency?: number;
  errors: string[];
  lastChecked: Date;
}

class DatabaseService {
  private cache = new Map<string, CacheEntry>();
  private connectionHealth: ConnectionHealth = {
    isConnected: false,
    errors: [],
    lastChecked: new Date()
  };

  // Cache management
  private getCacheKey(table: string, query: string): string {
    return `${table}:${query}`;
  }

  private getCachedData(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCachedData(key: string, data: any, ttl = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Connection health monitoring
  async checkConnection(): Promise<ConnectionHealth> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .limit(1);
        
      const latency = Date.now() - startTime;
      
      this.connectionHealth = {
        isConnected: !error,
        latency,
        errors: error ? [error.message] : [],
        lastChecked: new Date()
      };
      
      console.log('🔌 DatabaseService: Connection check completed', this.connectionHealth);
      return this.connectionHealth;
    } catch (err: any) {
      const latency = Date.now() - startTime;
      this.connectionHealth = {
        isConnected: false,
        latency,
        errors: [err.message || 'Unknown connection error'],
        lastChecked: new Date()
      };
      
      console.error('❌ DatabaseService: Connection check failed', this.connectionHealth);
      return this.connectionHealth;
    }
  }

  getConnectionHealth(): ConnectionHealth {
    return this.connectionHealth;
  }

  // Retry logic
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        console.warn(`🔄 DatabaseService: Retry attempt ${attempt}/${retries}:`, error.message);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError!;
  }

  // Query method with proper typing
  async query<T = any>(
    table: keyof Database['public']['Tables'],
    queryBuilder: (query: any) => any,
    options: DatabaseServiceOptions = {}
  ): Promise<{ data: T[] | null; error: any }> {
    const { useCache = false, retries = 3 } = options;
    const queryKey = this.getCacheKey(table as string, queryBuilder.toString());
    
    // Check cache first
    if (useCache) {
      const cachedData = this.getCachedData(queryKey);
      if (cachedData) {
        console.log(`📦 DatabaseService: Cache hit for ${table}`);
        return { data: cachedData, error: null };
      }
    }
    
    const operation = async () => {
      const query = supabase.from(table);
      const result = await queryBuilder(query);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    };
    
    try {
      const result = await this.withRetry(operation, retries);
      const data = result.data || [];
      
      // Cache successful results
      if (useCache && data) {
        this.setCachedData(queryKey, data);
      }
      
      console.log(`✅ DatabaseService: Query successful for ${table}:`, data?.length || 0, 'records');
      return { data: data as T[], error: null };
    } catch (error: any) {
      console.error(`❌ DatabaseService: Query failed for ${table}:`, error);
      return { data: null, error };
    }
  }

  // Insert method with proper typing
  async insert<T = any>(
    table: keyof Database['public']['Tables'],
    data: any,
    options: DatabaseServiceOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const { retries = 3 } = options;
    
    const operation = async () => {
      const result = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
        
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    };
    
    try {
      const result = await this.withRetry(operation, retries);
      
      // Clear related cache entries
      this.clearCacheForTable(table as string);
      
      console.log(`✅ DatabaseService: Insert successful for ${table}:`, result.data);
      return { data: result.data as T, error: null };
    } catch (error: any) {
      console.error(`❌ DatabaseService: Insert failed for ${table}:`, error);
      return { data: null, error };
    }
  }

  // Update method with proper typing
  async update<T = any>(
    table: keyof Database['public']['Tables'],
    id: string,
    data: any,
    options: DatabaseServiceOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const { retries = 3 } = options;
    
    const operation = async () => {
      const result = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    };
    
    try {
      const result = await this.withRetry(operation, retries);
      
      // Clear related cache entries
      this.clearCacheForTable(table as string);
      
      console.log(`✅ DatabaseService: Update successful for ${table}:`, result.data);
      return { data: result.data as T, error: null };
    } catch (error: any) {
      console.error(`❌ DatabaseService: Update failed for ${table}:`, error);
      return { data: null, error };
    }
  }

  // Delete method
  async delete(
    table: keyof Database['public']['Tables'],
    id: string,
    options: DatabaseServiceOptions = {}
  ): Promise<{ error: any }> {
    const { retries = 3 } = options;
    
    const operation = async () => {
      const result = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    };
    
    try {
      await this.withRetry(operation, retries);
      
      // Clear related cache entries
      this.clearCacheForTable(table as string);
      
      console.log(`✅ DatabaseService: Delete successful for ${table}, id: ${id}`);
      return { error: null };
    } catch (error: any) {
      console.error(`❌ DatabaseService: Delete failed for ${table}:`, error);
      return { error };
    }
  }

  // Cache management methods
  private clearCacheForTable(table: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 DatabaseService: Cleared ${keysToDelete.length} cache entries for ${table}`);
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 DatabaseService: Cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // Performance monitoring
  getPerformanceMetrics() {
    return {
      cacheSize: this.cache.size,
      connectionHealth: this.connectionHealth,
      lastHealthCheck: this.connectionHealth.lastChecked
    };
  }
}

export const databaseService = new DatabaseService();
