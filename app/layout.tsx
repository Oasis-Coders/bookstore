import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import { RouteProgress } from '@/components/layout/route-progress';

export const metadata: Metadata = {
  title: '活水书房 | COCM Bookshop',
  description: 'COCM Bookshop 活水书房 - Bookstore inventory, purchasing, and accounting',
  applicationName: '活水书房 | COCM Bookshop',
  themeColor: '#faf6ee',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <body className="bg-[#faf6ee] text-[#0f3d2e] antialiased">
        <RouteProgress />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
