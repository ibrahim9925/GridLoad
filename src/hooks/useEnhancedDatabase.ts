// @ts-nocheck

import { useState, useCallback } from "react";
import { databaseService } from "@/services/DatabaseService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface UseEnhancedDatabaseOptions {
  enableCache?: boolean;
  retries?: number;
  showToasts?: boolean;
}

export const useEnhancedDatabase = <T>(
  table: keyof Database['public']['Tables'],
  options: UseEnhancedDatabaseOptions = {}
) => {
  const { enableCache = true, retries = 3, showToasts = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error?.message || `Failed to ${operation}`;
    setError(errorMessage);
    
    if (showToasts) {
      toast({
        variant: "destructive",
        title: `Database Error`,
        description: errorMessage,
      });
    }
    
    console.error(`❌ EnhancedDatabase: ${operation} failed:`, error);
  }, [showToasts, toast]);

  const handleSuccess = useCallback((operation: string, data?: any) => {
    setError(null);
    
    if (showToasts && operation !== 'fetch') {
      toast({
        title: "Success",
        description: `${operation} completed successfully`,
      });
    }
    
    console.log(`✅ EnhancedDatabase: ${operation} successful`, data);
  }, [showToasts, toast]);

  const fetch = useCallback(async (queryBuilder: (query: any) => any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await databaseService.query<T>(
        table,
        queryBuilder,
        { useCache: enableCache, retries }
      );
      
      if (error) throw error;
      
      handleSuccess('fetch');
      return data;
    } catch (err: any) {
      handleError(err, 'fetch data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [table, enableCache, retries, handleError, handleSuccess]);

  const create = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await databaseService.insert<T>(
        table,
        data,
        { retries }
      );
      
      if (result.error) throw result.error;
      
      handleSuccess('create', result.data);
      return result.data;
    } catch (err: any) {
      handleError(err, 'create record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [table, retries, handleError, handleSuccess]);

  const update = useCallback(async (id: string, data: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await databaseService.update<T>(
        table,
        id,
        data,
        { retries }
      );
      
      if (result.error) throw result.error;
      
      handleSuccess('update', result.data);
      return result.data;
    } catch (err: any) {
      handleError(err, 'update record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [table, retries, handleError, handleSuccess]);

  const remove = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await databaseService.delete(
        table,
        id,
        { retries }
      );
      
      if (error) throw error;
      
      handleSuccess('delete');
      return true;
    } catch (err: any) {
      handleError(err, 'delete record');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [table, retries, handleError, handleSuccess]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    fetch,
    create,
    update,
    remove,
    isLoading,
    error,
    clearError
  };
};
