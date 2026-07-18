// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseRealTimeDataProps {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useRealTimeData = ({ 
  table, 
  onInsert, 
  onUpdate, 
  onDelete 
}: UseRealTimeDataProps) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log(`🔄 Setting up real-time subscription for ${table}`);
    
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`📊 ${table} INSERT:`, payload);
          onInsert?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`📊 ${table} UPDATE:`, payload);
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`📊 ${table} DELETE:`, payload);
          onDelete?.(payload);
        }
      )
      .subscribe((status) => {
        console.log(`📡 ${table} subscription status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log(`🧹 Cleaning up ${table} subscription`);
      supabase.removeChannel(channel);
    };
  }, [table, onInsert, onUpdate, onDelete]);

  return { isConnected };
};
