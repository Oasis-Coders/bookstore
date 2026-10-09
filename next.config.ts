import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // 2026-10-09：书库工具页由 /books/* 搬到 /tools/*，旧地址保留跳转
      { source: '/books/barcodes/:path*', destination: '/tools/barcodes/:path*', permanent: true },
      { source: '/books/import', destination: '/tools/import', permanent: true },
      { source: '/books/price-tags', destination: '/tools/price-tags', permanent: true },
    ];
  },
};

export default nextConfig;
