"use client";

import React, { useEffect } from "react";
import { useNotifications } from "./NotificationProvider";
import { XCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

const typeStyles = {
  success: {
    icon: <CheckCircle className="text-green-500 w-5 h-5" />,
    border: "border-green-500",
    bg: "bg-green-50",
  },
  error: {
    icon: <XCircle className="text-red-500 w-5 h-5" />,
    border: "border-red-500",
    bg: "bg-red-50",
  },
  info: {
    icon: <Info className="text-blue-500 w-5 h-5" />,
    border: "border-blue-500",
    bg: "bg-blue-50",
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
    border: "border-yellow-500",
    bg: "bg-yellow-50",
  },
};

export default function NotificationToaster() {
  const { notifications, remove } = useNotifications();

  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map((n) =>
      setTimeout(() => remove(n.id), 4000)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [notifications, remove]);

  return (
    <div className="fixed z-50 top-6 right-6 flex flex-col space-y-3 max-w-xs">
      {notifications.map((n) => {
        const style = typeStyles[n.type];
        return (
          <div
            key={n.id}
            className={`flex items-start p-4 rounded-lg shadow-lg border-l-4 ${style.border} ${style.bg} animate-fade-in-up relative`}
          >
            <div className="mr-3 mt-1">{style.icon}</div>
            <div className="flex-1">
              {n.title && <div className="font-semibold mb-1">{n.title}</div>}
              <div className="text-sm">{n.message}</div>
            </div>
            <button
              className="ml-3 text-gray-400 hover:text-gray-700"
              onClick={() => remove(n.id)}
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease;
        }
      `}</style>
    </div>
  );
} 