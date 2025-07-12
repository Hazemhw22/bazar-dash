import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from "@/components/theme-provider";
import { ClientNotificationWrapper } from "@/components/notifications/ClientNotificationWrapper";

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
          <ClientNotificationWrapper>
            {children}
          </ClientNotificationWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
