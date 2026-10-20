import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWARegister from '@/components/PWARegister';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'ABSHER BI | أبشر بي',
  description: 'منصة التوصيل الذكية — من مأرب إلى كل اليمن',
  manifest: '/manifest.json',
  applicationName: 'ABSHER BI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ABSHER BI',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('absher_theme');
                  var sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved || (sysDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
