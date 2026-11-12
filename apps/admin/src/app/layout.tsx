import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import NotificationsProvider from '@/components/NotificationsProvider';
import AdminShell from '@/components/AdminShell';

export const metadata: Metadata = {
  title: 'ABSHER BI — لوحة الإدارة',
  description: 'لوحة تحكم إدارة منصة أبشر بي',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" data-app="admin" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('absher_theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', saved);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AdminShell><NotificationsProvider>{children}</NotificationsProvider></AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
