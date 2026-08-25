'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/app-config';
import { cn } from '@/lib/utils';

export function SidebarNav({ items = navItems }: { items?: typeof navItems }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between rounded-[12px] px-4 py-3 text-[14px] font-medium transition-all',
              isActive
                ? 'bg-white/12 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/8 hover:text-white'
            )}
          >
            <span>{item.labelZh}</span>
            <span className="text-[11px] opacity-60">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
