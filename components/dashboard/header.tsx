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
import { Search, Bell, Settings, LogOut, UserIcon, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { useNotifications } from "@/components/notifications/NotificationProvider";

interface DashboardHeaderProps {
  user: User;
}

const typeStyles = {
  success: {
    icon: <CheckCircle className="text-green-500 w-5 h-5" />,
    bg: "bg-green-50",
  },
  error: {
    icon: <XCircle className="text-red-500 w-5 h-5" />,
    bg: "bg-red-50",
  },
  info: {
    icon: <Info className="text-blue-500 w-5 h-5" />,
    bg: "bg-blue-50",
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
    bg: "bg-yellow-50",
  },
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { notifications, markAllRead, remove } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  // جلب صورة الأفاتار من user.user_metadata.avatar_url أو صورة ثابتة من dicebear إذا لم توجد
  const fallbackAvatar = "https://avatars.dicebear.com/api/micah/male1.svg";
  const avatarUrl = user.user_metadata?.avatar_url || fallbackAvatar;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-0 focus:bg-white"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="relative flex items-center space-x-4"> {/* Make parent relative */}
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              setOpen((v) => !v);
              markAllRead();
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
          {open && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full mt-2 w-96 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ minWidth: 320 }}
            >
              <div className="flex items-center justify-between p-4 border-b font-semibold bg-gray-50">
                <span>Notifications</span>
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <div className="p-6 text-gray-400 text-center text-sm">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    const style = typeStyles[n.type] || typeStyles.info;
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start space-x-3 p-4 rounded-lg ${style.bg} hover:bg-gray-100 transition`}
                      >
                        <div className="mt-1">{style.icon}</div>
                        <div className="flex-1">
                          <div className="font-semibold">{n.title || n.type}</div>
                          <div className="text-xs">{n.message}</div>
                          <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleTimeString()}</div>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2" title="Unread"></span>
                        )}
                        <button
                          className="ml-2 text-gray-400 hover:text-red-500"
                          onClick={() => remove(n.id)}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-2 text-center bg-gray-50">
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => notifications.forEach((n) => remove(n.id))}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={avatarUrl}
                    alt={user.user_metadata?.full_name || user.email}
                  />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">
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
      </div>
    </header>
  );
}
