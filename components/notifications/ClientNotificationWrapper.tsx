"use client";

import React from "react";
import { NotificationProvider } from "./NotificationProvider";
import NotificationToaster from "./NotificationToaster";

export const ClientNotificationWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <NotificationProvider>
      {children}
      <NotificationToaster />
    </NotificationProvider>
  );
}; 