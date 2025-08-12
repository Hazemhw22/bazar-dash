"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { Search, Bell, Settings, LogOut, UserIcon, CheckCircle, XCircle, Info, AlertTriangle, Sun, Moon } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "next-themes";

interface DashboardHeaderProps {
  user: User;
}

const typeStyles = {
  success: {
    icon: <CheckCircle className="text-green-500 w-5 h-5" />,
    bg: "bg-green-50 dark:bg-green-950",
  },
  error: {
    icon: <XCircle className="text-red-500 w-5 h-5" />,
    bg: "bg-red-50 dark:bg-red-950",
  },
  info: {
    icon: <Info className="text-blue-500 w-5 h-5" />,
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
    bg: "bg-yellow-50 dark:bg-yellow-950",
  },
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const router = useRouter();
  const { notifications, markAllAsRead, markAsRead, removeNotification, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering theme-dependent content
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fetch profile avatar URL from profiles table
  useEffect(() => {
    const fetchProfileAvatar = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user?.id)
          .single();
        
        if (profile?.avatar_url) {
          setProfileAvatarUrl(profile.avatar_url);
        }
      } catch (error) {
        console.error("Error fetching profile avatar:", error);
      }
    };

    if (user?.id) {
      fetchProfileAvatar();
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  // Get avatar URL from profile table or use placeholder
  const avatarUrl = profileAvatarUrl || "/placeholder-user.jpg";

  return (
    <header className="bg-background border-b border-border px-3 sm:px-4 md:px-6 py-3 text-foreground">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
     

        {/* Icons - Mobile: Right side above search, Desktop: Right side */}
        <div className="relative flex items-center space-x-2 sm:space-x-4 order-2 sm:order-2 w-full sm:w-auto justify-end sm:justify-start">
          {/* Notifications */}
          <DropdownMenu
            open={open}
            onOpenChange={setOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 p-0 border-0 shadow-2xl bg-white dark:bg-gray-900"
              align="end"
            >
              <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-300">
                    <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 ${
                        notification.is_read !== true
                          ? "bg-blue-50/50 dark:bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              Notification
                            </h4>
                            {notification.is_read !== true && (
                              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User menu - Now last */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={avatarUrl}
                    alt={user?.user_metadata?.full_name || user?.email}
                  />
                  <AvatarFallback>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-foreground">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/users/${user.id}`)}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="flex-1 w-full sm:max-w-lg order-2 sm:order-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-0 focus:bg-background text-foreground w-full"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
