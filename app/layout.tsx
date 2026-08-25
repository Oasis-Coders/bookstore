import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/context';
import { RouteProgress } from '@/components/layout/route-progress';

export const metadata: Metadata = {
  title: '活水书房 | COCM Bookshop',
  description: 'COCM Bookshop 活水书房 - Bookstore inventory, purchasing, and accounting',
  applicationName: '活水书房 | COCM Bookshop',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#faf6ee] text-[#0f3d2e] antialiased">
        <RouteProgress />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
