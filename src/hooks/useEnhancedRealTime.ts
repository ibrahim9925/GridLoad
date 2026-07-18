// @ts-nocheck

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseEnhancedRealTimeProps {
  table: string;
  filter?: { column: string; value: any };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export const useEnhancedRealTime = ({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  autoReconnect = true,
  reconnectDelay = 5000
}: UseEnhancedRealTimeProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  });

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Memoize callbacks to prevent unnecessary reconnections
  const stableOnInsert = useCallback((payload: any) => {
    console.log(`📊 EnhancedRealTime: ${table} INSERT:`, payload);
    if (onInsert) onInsert(payload);
  }, [table, onInsert]);

  const stableOnUpdate = useCallback((payload: any) => {
    console.log(`📊 EnhancedRealTime: ${table} UPDATE:`, payload);
    if (onUpdate) onUpdate(payload);
  }, [table, onUpdate]);

  const stableOnDelete = useCallback((payload: any) => {
    console.log(`📊 EnhancedRealTime: ${table} DELETE:`, payload);
    if (onDelete) onDelete(payload);
  }, [table, onDelete]);

  const connect = useCallback(() => {
    console.log(`🔄 EnhancedRealTime: Connecting to ${table}`);
    
    const channelName = `${table}-changes-${Date.now()}`;
    const newChannel = supabase.channel(channelName);

    // Set up postgres changes listeners
    if (onInsert) {
      newChannel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        },
        stableOnInsert
      );
    }

    if (onUpdate) {
      newChannel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        },
        stableOnUpdate
      );
    }

    if (onDelete) {
      newChannel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        },
        stableOnDelete
      );
    }

    // Subscribe and handle status changes
    newChannel.subscribe((status, error) => {
      console.log(`📡 EnhancedRealTime: ${table} subscription status:`, status, error);
      
      setConnectionStatus(prev => {
        if (status === 'SUBSCRIBED') {
          return {
            isConnected: true,
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: undefined
          };
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          const newAttempts = prev.reconnectAttempts + 1;
          
          // Auto-reconnect if enabled and under limit
          if (autoReconnect && newAttempts < 5) {
            console.log(`🔄 EnhancedRealTime: Auto-reconnecting to ${table} in ${reconnectDelay}ms`);
            setTimeout(() => {
              connect();
            }, reconnectDelay);
          }
          
          return {
            isConnected: false,
            lastConnected: prev.lastConnected,
            reconnectAttempts: newAttempts,
            error: error?.message || 'Connection closed'
          };
        }
        return prev;
      });
    });

    setChannel(newChannel);
  }, [table, filter, stableOnInsert, stableOnUpdate, stableOnDelete, autoReconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (channel) {
      console.log(`🧹 EnhancedRealTime: Disconnecting from ${table}`);
      supabase.removeChannel(channel);
      setChannel(null);
      setConnectionStatus(prev => ({
        ...prev,
        isConnected: false
      }));
    }
  }, [channel, table]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    connectionStatus,
    reconnect,
    disconnect
  };
};
