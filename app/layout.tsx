import type { Metadata } from 'next'
import './globals.css'
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import NotificationToaster from "@/components/notifications/NotificationToaster";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'bazar - dash',
  description: 'Created by Hazem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationProvider>
            {children}
            <NotificationToaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
