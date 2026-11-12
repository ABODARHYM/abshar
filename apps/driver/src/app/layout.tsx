import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import { ThemeProvider } from '@/components/ThemeProvider';
import NotificationsProvider from '@/components/NotificationsProvider';

export const metadata: Metadata = {
  title: 'ABSHER BI — تطبيق المندوب',
  description: 'تطبيق مندوب التوصيل — ABSHER BI',
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
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
    <html lang="ar" dir="rtl" data-theme="dark" data-app="driver" suppressHydrationWarning>
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
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
