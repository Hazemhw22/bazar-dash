"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  createNotification,
  type Notification 
} from "@/lib/notifications";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  const addNotification = useCallback(async (notification: {
    title: string;
    message: string;
    type: "success" | "warning" | "error" | "info";
  }) => {
    try {
      console.log("Adding notification:", notification);
      await createNotification(notification);
      // Refresh notifications to get the latest data
      await fetchNotifications();
    } catch (error) {
      console.error("Error in addNotification:", error);
      // Still show a fallback notification in the UI even if DB fails
      const tempNotification = {
        id: `temp-${Date.now()}`,
        user_id: 'temp',
        message: `${notification.title}: ${notification.message}`,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications(prev => [tempNotification, ...prev]);
    }
  }, [fetchNotifications]);

  const removeNotification = useCallback(async (notificationId: string) => {
    // For now, just remove from local state
    // You can add a delete function to the service if needed
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => n.is_read !== true).length;

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
  };
}; 