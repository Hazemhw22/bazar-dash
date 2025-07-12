import type { Metadata } from 'next'
import './globals.css'
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import NotificationToaster from "@/components/notifications/NotificationToaster";

export const metadata: Metadata = {
  title: 'bazar - dash',
  description: 'Created by Hazem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          {children}
          <NotificationToaster />
        </NotificationProvider>
      </body>
    </html>
  );
}
