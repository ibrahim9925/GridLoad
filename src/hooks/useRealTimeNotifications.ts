// @ts-nocheck

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: 'stock_alert' | 'payment_received' | 'lead_created' | 'sale_completed' | 'installation_scheduled';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  created_at: string;
}

export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock data for demonstration
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'stock_alert',
        title: 'Low Stock Alert',
        message: 'Solar Panel Model X is running low (5 units remaining)',
        priority: 'high',
        read: false,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'payment_received',
        title: 'Payment Received',
        message: '$5,000 payment received from John Doe',
        priority: 'medium',
        read: false,
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'lead_created',
        title: 'New Lead',
        message: 'New lead from website contact form',
        priority: 'medium',
        read: true,
        created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'sale_completed',
        title: 'Sale Completed',
        message: 'Installation package sold to ABC Corp for $25,000',
        priority: 'high',
        read: true,
        created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        type: 'installation_scheduled',
        title: 'Installation Scheduled',
        message: 'Installation scheduled for next Monday at Smith residence',
        priority: 'medium',
        read: true,
        created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString()
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'created_at'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    addNotification
  };
};
