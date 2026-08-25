import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '活水书室管理系统 | Living Water Bookstore',
  description: 'Bookstore inventory, purchasing, and accounting for 活水书室 - Bookstore management system',
  applicationName: '活水书室管理系统',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#faf6ee] text-[#0f3d2e] antialiased">
        {children}
      </body>
    </html>
  );
}
