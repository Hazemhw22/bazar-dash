"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@supabase/auth-helpers-react";

export type NotificationType = "success" | "error" | "info" | "warning";
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  read?: boolean;
  createdAt: number;
}

interface NotificationContextProps {
  notifications: Notification[];
  notify: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  remove: (id: string) => void;
  markAllRead: () => void;
  fetchNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const session = useSession();

  // Fetch notifications from DB
  const fetchNotifications = async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    console.log("Fetched notifications:", data, error); // <-- Add this
    if (!error && data) {
      setNotifications(
        data.map((n) => ({
          ...n,
          createdAt: new Date(n.created_at).getTime(),
        }))
      );
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [session?.user?.id]);

  // Add notification to state and DB
  const notify = async (n: Omit<Notification, "id" | "createdAt" | "read">) => {
    const notification: Notification = {
      ...n,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((prev) => [notification, ...prev]);
    if (session?.user) {
      await supabase.from("notifications").insert({
        user_id: session.user.id,
        type: n.type,
        title: n.title,
        message: n.message,
      });
      fetchNotifications();
    }
  };

  const remove = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (session?.user) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", session.user.id)
        .eq("read", false);
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, notify, remove, markAllRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}; 